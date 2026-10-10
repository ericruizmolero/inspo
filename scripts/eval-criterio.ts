// Scores what an agent makes with criterio.md and the connector's prompts (lib/mcp/prompts.ts), before and after #95, on
// the fixtures in scripts/fixtures/criterio/<slug>: before.md and after.md (the project's file, frozen from the LOCAL
// database with `freeze`), planted.html (a landing that follows the criterio but for one planted breach) and expect.json.
// Two cases, each run with the prompts and file of each side ("before" takes its prompts from prompts-before.json):
//   landing: design_with_criterio with the file inlined where read_criterio would answer, and the task in expect.json.
//     Hard checks on the HTML: colours in CSS inside the palette (#fff and #000 pass when the palette has neutrals;
//     rgb() is read as its hex, hsl() and named colours are not read), and font families inside the brand's plus
//     the generic keywords. The judge counts the Never lines broken and says whether a reference was copied.
//   review: review_against_criterio with the file and planted.html; it passes when the judge finds the planted breach.
// The agent is a model on OpenRouter standing in for a client: Claude Code or Cursor themselves cannot be driven from here.
// Each pass appends one row to scripts/evals/criterio.jsonl; what the models wrote goes to .data/evals/criterio/.
//   npm run eval:criterio                                  → both cases, both sides, the default models, once
//   npm run eval:criterio -- --models a/b --case review --no-judge --effort low   → the agent's reasoning effort (medium by default)
//   npm run eval:criterio -- --side after --runs 2         → one side only, more passes
//   npm run eval:criterio -- --table                       → the table, no calls
//   npm run eval:criterio -- freeze <project id> <slug> before|after [locale]   → writes a side's file from the local database
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { z } from "zod";

interface Expect {
  project: string;
  language: "es" | "en";
  task: string;
  palette: string[];
  /** The palette has light and dark neutrals: pure white and black are read as them */
  neutrals: boolean;
  families: string[];
  never: Record<string, string[]>;
  /** References whose look and words are not to be taken */
  notCopy: { code: string; name: string; headline: string; hexes?: string[] }[];
  planted: { area: string; never: string; where: string; words: string[] };
}

interface Fixture { slug: string; files: Record<Side, string>; planted: string; expect: Expect }
type Side = "before" | "after";
type Case = "landing" | "review";

interface Row {
  at: string;
  fixture: string;
  case: Case;
  side: Side;
  model: string;
  /** The agent's reasoning effort */
  effort?: string;
  /** The side and a fingerprint of its prompt and file, so a change nobody named still reads as another run */
  prompt: string;
  judge: string | null;
  error?: string;
  /** [off, total] distinct values */
  checks?: { hex: [number, number]; families: [number, number] };
  scores?: { neverBroken: number; copies: boolean; planted?: boolean; proposes?: boolean };
  /** The review names the planted breach's own words (no judge needed) */
  plantedWords?: boolean;
  costUsd?: number;
  judgeUsd?: number;
  ms?: number;
}

const FIXTURES = "scripts/fixtures/criterio";
const RESULTS = "scripts/evals/criterio.jsonl";
const OUTPUTS = ".data/evals/criterio";
const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || "anthropic/claude-sonnet-5.5";
// Claude Code's stand-in, and Cursor's: a model that is not Anthropic's, the one the app's own passes run on
const MODELS = ["anthropic/claude-sonnet-5.5", "deepseek/deepseek-v4.1-flash"];

const args = process.argv.slice(2);
const arg = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const flag = (name: string) => args.includes(`--${name}`);

const hex6 = (h: string) => { const x = h.replace("#", "").toLowerCase(); return x.length === 3 ? [...x].map((c) => c + c).join("") : x.slice(0, 6); };
const flat = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
const GENERIC = new Set(["serif", "sansserif", "monospace", "cursive", "fantasy", "systemui", "uisansserif", "uiserif", "uimonospace", "uirounded", "math", "emoji", "fangsong", "inherit", "initial", "unset", "revert", "applesystem", "blinkmacsystemfont"]);

/** The CSS of a page: its style blocks, its style attributes and the colour attributes of its SVG */
function cssOf(html: string): string {
  const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const attrs = [...html.matchAll(/\s(?:style|fill|stroke|stop-color|color)\s*=\s*"([^"]*)"/gi)].map((m) => m[1]);
  return [...blocks, ...attrs].join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
}

function colorCheck(css: string, x: Expect): { off: string[]; all: string[] } {
  const found = new Set<string>();
  for (const m of css.matchAll(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi)) found.add(hex6(m[1].length === 4 ? m[1].slice(0, 3) : m[1]));
  for (const m of css.matchAll(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/gi)) found.add([m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join(""));
  const palette = new Set([...x.palette.map(hex6), ...(x.neutrals ? ["ffffff", "000000"] : [])]);
  const all = [...found];
  return { off: all.filter((h) => !palette.has(h)).map((h) => `#${h}`), all };
}

function familyCheck(html: string, css: string, x: Expect): { off: string[]; all: string[] } {
  const values: string[] = [];
  for (const m of css.matchAll(/(?:^|[;{\s])(font-family|font|--[\w-]*(?:font|family|sans|serif|mono|type)[\w-]*)\s*:\s*([^;}]+)/gi)) {
    let v = m[2];
    // font: italic 600 18px/1.4 "Family", sans-serif → the families after the size
    if (m[1].toLowerCase() === "font") { const at = v.match(/\d(?:px|rem|em|%|pt|vw|ch)?(?:\s*\/\s*[\d.]+[a-z%]*)?\s+(.+)$/i); v = at ? at[1] : ""; }
    values.push(...v.split(",").map((f) => f.trim().replace(/^["']|["']$/g, "").replace(/!important$/i, "").trim()).filter((f) => f && !f.startsWith("var(")));
  }
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s>]+)/gi)) for (const f of m[1].split("&")) if (f.startsWith("family=")) values.push(decodeURIComponent(f.slice(7).split(":")[0]).replace(/\+/g, " "));
  const brand = new Set(x.families.map(flat));
  const all = [...new Set(values.filter((v) => !GENERIC.has(flat(v)) && !/^\d|^(normal|italic|bold|lighter|bolder)$/i.test(v)))];
  return { off: all.filter((f) => !brand.has(flat(f))), all };
}

const htmlOf = (text: string) => text.match(/```html\s*([\s\S]*?)```/i)?.[1] ?? text.slice(Math.max(0, text.search(/<!doctype|<html/i)));

const LandingJudge = z.object({
  never_broken: z.array(z.object({ area: z.string(), line: z.string(), by: z.string() })),
  copies_reference: z.boolean(),
  copied: z.array(z.object({ ref: z.string(), what: z.string() })),
  note: z.string(),
});
const ReviewJudge = z.object({
  names_planted: z.boolean(),
  quote: z.string(),
  offers_proposal: z.boolean(),
  note: z.string(),
});

const LANDING_JUDGE = `You check a landing page an AI agent built from a project's criterio.md. You get the project's NEVER lines by area, the references it must not copy (third-party sites the team only took an idea from), and the HTML.
never_broken: every NEVER line the page goes against, read in its code (CSS values, easings, markup, copy), quoted exactly, with what breaks it in "by". A line about something the page does not have (no portraits, no icons) is not broken. A figure or date in the copy breaks "Fechas o cifras inventadas" only when it is not in the criterio itself.
copies_reference: true when the page lifts a listed reference's layout, headline, copy, imagery or logo, or paints itself in that reference's colours instead of the palette; list each in "copied". Taking the client's own copy (Multiverse Computing) is not copying: the criterio asks for it.
note: the worst problem, at most 30 words.`;

const REVIEW_JUDGE = `You check a design review an AI agent wrote of a page against a project's criterio.md. A breach was planted in the page on purpose; you get it.
names_planted: true when the review points at that breach as a breach (the place or the value, and that it goes against the criterio), not only in passing.
quote: the review's words that do it, or "".
offers_proposal: the review ends with a concrete propose_decision (an area and a decision text) for something not covered.
note: at most 30 words.`;

async function fixtures(): Promise<Fixture[]> {
  const only = arg("only");
  const slugs = (await fs.readdir(FIXTURES, { withFileTypes: true })).filter((d) => d.isDirectory() && (!only || d.name === only)).map((d) => d.name).sort();
  return Promise.all(slugs.map(async (slug) => {
    const read = (f: string) => fs.readFile(path.join(FIXTURES, slug, f), "utf8");
    return { slug, files: { before: await read("before.md"), after: await read("after.md") }, planted: await read("planted.html"), expect: JSON.parse(await read("expect.json")) as Expect };
  }));
}

/** The prompt the person's client sends, on this side: the code's own for "after", the frozen one for "before" */
async function promptText(side: Side, name: "design_with_criterio" | "review_against_criterio", x: Expect, what: string): Promise<string> {
  if (side === "before") {
    const frozen = JSON.parse(await fs.readFile(path.join(FIXTURES, "prompts-before.json"), "utf8")) as Record<string, string[]>;
    return frozen[name].join("\n").replace("{project}", x.project).replace("{task}", x.task).replace("{what}", what);
  }
  const { promptGet } = await import("../lib/mcp/prompts");
  return promptGet(name, { project: x.project, task: x.task, what }, x.language)!.messages[0].content.text;
}

const AGENT = "You are a coding agent in the person's editor, connected to criterio.design over MCP. In this run you cannot call tools or wait for an answer: the tool results you would ask for are given after the prompt. Where the prompt says to ask the person, take the most careful choice and leave the question for them.";
const ANSWERED = (file: string) => `\n\n---\nread_criterio answered (the whole file; read the parts the prompt says to read):\n\n${file}\n---`;

async function pass(fx: Fixture, kase: Case, side: Side, model: string, judge: boolean): Promise<Row> {
  const { llm } = await import("../lib/llm");
  const x = fx.expect;
  const file = fx.files[side];
  const what = "planted.html, below";
  const text = kase === "landing"
    ? `${await promptText(side, "design_with_criterio", x, what)}${ANSWERED(file)}\n\nDeliver the landing as one complete HTML file with its CSS inside, in a single \`\`\`html block. Put any question for the person in an HTML comment at its top.`
    : `${await promptText(side, "review_against_criterio", x, what)}${ANSWERED(file)}\n\nplanted.html:\n\`\`\`html\n${fx.planted}\n\`\`\``;
  const effort = (arg("effort") as "low" | "medium" | "high" | undefined) ?? "medium";
  const row: Row = { at: new Date().toISOString(), fixture: fx.slug, case: kase, side, model, effort, prompt: `${side}-${createHash("sha1").update(text).digest("hex").slice(0, 7)}`, judge: judge ? JUDGE_MODEL : null };
  try {
    const res = await llm({ model, fallback: null, system: AGENT, text, effort, maxTokens: kase === "landing" ? 64000 : 24000 });
    row.costUsd = res.costUsd ?? 0;
    row.ms = res.ms;
    let verdict: unknown = null;
    if (kase === "landing") {
      const html = htmlOf(res.text);
      const css = cssOf(html);
      const colors = colorCheck(css, x), families = familyCheck(html, css, x);
      row.checks = { hex: [colors.off.length, colors.all.length], families: [families.off.length, families.all.length] };
      verdict = { off: { colors: colors.off, families: families.off } };
      if (judge) {
        const j = await llm({
          model: JUDGE_MODEL, fallback: null, system: LANDING_JUDGE, schema: LandingJudge, maxTokens: 12000,
          text: [`NEVER (JSON, by area): ${JSON.stringify(x.never)}`, `REFERENCES NOT TO COPY (JSON): ${JSON.stringify(x.notCopy)}`, `PALETTE: ${x.palette.join(" ")}. FAMILIES: ${x.families.join(", ")}`, `HTML:\n${html}`].join("\n\n"),
        });
        const v = LandingJudge.parse(JSON.parse(j.text));
        row.judgeUsd = j.costUsd ?? 0;
        row.scores = { neverBroken: v.never_broken.length, copies: v.copies_reference };
        verdict = { ...(verdict as object), judge: v };
      }
    } else {
      const said = res.text.toLowerCase();
      row.plantedWords = x.planted.words.some((w) => said.includes(w.toLowerCase()));
      if (judge) {
        const j = await llm({
          model: JUDGE_MODEL, fallback: null, system: REVIEW_JUDGE, schema: ReviewJudge, maxTokens: 6000,
          text: [`PLANTED BREACH: area ${x.planted.area}, never line "${x.planted.never}", in ${x.planted.where}`, `REVIEW:\n${res.text}`].join("\n\n"),
        });
        const v = ReviewJudge.parse(JSON.parse(j.text));
        row.judgeUsd = j.costUsd ?? 0;
        row.scores = { neverBroken: 0, copies: false, planted: v.names_planted, proposes: v.offers_proposal };
        verdict = v;
      }
    }
    const out = path.join(OUTPUTS, side, model.replace(/[^a-z0-9.-]+/gi, "_"), `${fx.slug}-${kase}-${row.at.replace(/[:.]/g, "-")}`);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(`${out}.${kase === "landing" ? "html" : "md"}`, kase === "landing" ? htmlOf(res.text) : res.text);
    await fs.writeFile(`${out}.json`, JSON.stringify({ row, verdict, answer: res.text }, null, 1));
  } catch (e) {
    row.error = (e instanceof Error ? e.message : String(e)).slice(0, 300);
  }
  return row;
}

const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const okRate = (pairs: [number, number][]) => { const total = pairs.reduce((n, [, t]) => n + t, 0); return total ? `${Math.round(100 * (1 - pairs.reduce((n, [b]) => n + b, 0) / total))}%` : "–"; };
const fixed = (n: number, d = 1) => Number.isNaN(n) ? "–" : n.toFixed(d);
const share = (xs: boolean[]) => xs.length ? `${xs.filter(Boolean).length}/${xs.length}` : "–";

function table(rows: Row[]) {
  const groups = new Map<string, Row[]>();
  for (const r of rows) { const k = `${r.fixture}|${r.case}|${r.side}|${r.model}|${r.effort}|${r.prompt}`; groups.set(k, [...(groups.get(k) ?? []), r]); }
  const head = ["fixture", "case", "side", "model", "passes", "failed", "hex ok", "families ok", "never broken", "copies", "planted found", "planted words", "proposes", "$ / pass", "judge $", "s / pass"];
  const body = [...groups.values()].sort((a, b) => `${a[0].fixture}${a[0].case}${a[0].model}${a[0].side}`.localeCompare(`${b[0].fixture}${b[0].case}${b[0].model}${b[0].side}`)).map((g) => {
    const ok = g.filter((r) => !r.error);
    const scored = ok.filter((r) => r.scores);
    const landing = g[0].case === "landing";
    return [
      g[0].fixture, g[0].case, g[0].prompt, `${g[0].model} @${g[0].effort ?? "medium"}`, String(g.length), String(g.length - ok.length),
      landing ? okRate(ok.flatMap((r) => r.checks ? [r.checks.hex] : [])) : "", landing ? okRate(ok.flatMap((r) => r.checks ? [r.checks.families] : [])) : "",
      landing ? fixed(mean(scored.map((r) => r.scores!.neverBroken))) : "", landing ? share(scored.map((r) => r.scores!.copies)) : "",
      landing ? "" : share(scored.map((r) => !!r.scores!.planted)), landing ? "" : share(ok.map((r) => !!r.plantedWords)), landing ? "" : share(scored.map((r) => !!r.scores!.proposes)),
      fixed(mean(ok.map((r) => r.costUsd ?? 0)), 4), fixed(mean(scored.flatMap((r) => r.judgeUsd ?? [])), 4), fixed(mean(ok.map((r) => (r.ms ?? 0) / 1000))),
    ];
  });
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((r) => r[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => (i < 4 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join("  ");
  console.log(`\n${line(head)}\n${widths.map((w) => "─".repeat(w)).join("  ")}\n${body.map(line).join("\n")}`);
  console.log("\nhex ok and families ok: the share of distinct values inside the brand. never broken: per landing, by the judge. copies: landings that copied a reference. planted found: reviews that named the planted breach (judge); planted words: the breach's own words in the review; proposes: reviews that end on a concrete propose_decision.");
}

/** Writes a project's criterio.md, as read_criterio hands it out, into a fixture: before.md or after.md */
async function freeze(projectId: string, slug: string, which: string, locale: string) {
  if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL || "postgres://127.0.0.1")) throw new Error("freeze only reads the local database");
  const { eq } = await import("drizzle-orm");
  const { db, schema } = await import("../lib/db");
  const { loadShareView } = await import("../lib/share-view");
  const [p] = await db.select({ organizationId: schema.project.organizationId }).from(schema.project).where(eq(schema.project.id, projectId));
  if (!p) throw new Error(`No project ${projectId}`);
  const view = await loadShareView(p.organizationId, projectId, "full", locale as "es" | "en", null, "https://criterio.design");
  if (!view) throw new Error("No view");
  const out = path.join(FIXTURES, slug, `${which}.md`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, view.markdown);
  console.log(`${out}: ${view.markdown.length} chars`);
}

async function readRows(): Promise<Row[]> {
  const text = await fs.readFile(RESULTS, "utf8").catch(() => "");
  return text.split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
}

async function main() {
  if (args[0] === "freeze") {
    const [, projectId, slug, which, locale = "es"] = args;
    if (!projectId || !slug || !["before", "after"].includes(which)) throw new Error("npm run eval:criterio -- freeze <project id> <slug> before|after [locale]");
    await freeze(projectId, slug, which, locale);
  } else if (args[0] === "check") {
    // The hard checks on a page of one's own, to see what they read: npm run eval:criterio -- check <slug> <file.html>
    const [fx] = (await fixtures()).filter((f) => f.slug === args[1]);
    const html = await fs.readFile(args[2], "utf8");
    const css = cssOf(html);
    console.log({ colors: colorCheck(css, fx.expect), families: familyCheck(html, css, fx.expect) });
  } else {
    if (!flag("table")) {
      const { llmEnabled } = await import("../lib/llm");
      if (!llmEnabled()) throw new Error("OPENROUTER_API_KEY is not set");
      const models = arg("models")?.split(",").map((m) => m.trim()).filter(Boolean) ?? MODELS;
      const cases: Case[] = arg("case") ? [arg("case") as Case] : ["landing", "review"];
      const runs = Number(arg("runs")) || 1;
      const set = await fixtures();
      if (!set.length) throw new Error(`No fixtures in ${FIXTURES}`);
      const jobs = set.flatMap((fx) => cases.flatMap((c) => ((arg("side") ? [arg("side")] : ["before", "after"]) as Side[]).flatMap((s) => models.flatMap((m) => Array.from({ length: runs }, () => [fx, c, s, m] as const)))));
      console.log(`${jobs.length} passes: ${set.map((f) => f.slug).join(", ")} × ${cases.join(", ")} × before, after × ${models.join(", ")}${runs > 1 ? ` × ${runs}` : ""}`);
      await fs.mkdir(path.dirname(RESULTS), { recursive: true });
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, async () => {
        while (next < jobs.length) {
          const [fx, c, s, m] = jobs[next++];
          const row = await pass(fx, c, s, m, !flag("no-judge"));
          await fs.appendFile(RESULTS, JSON.stringify(row) + "\n");
          console.log(row.error ? `  ✗ ${fx.slug} · ${c} · ${s} · ${m}: ${row.error}` : `  ✓ ${fx.slug} · ${c} · ${s} · ${m} · $${row.costUsd!.toFixed(4)}${row.judgeUsd !== undefined ? ` + judge $${row.judgeUsd.toFixed(4)}` : ""} · ${(row.ms! / 1000).toFixed(0)}s`);
        }
      }));
    }
    table(await readRows());
  }
  const { pool } = await import("../lib/db");
  await pool.end().catch(() => {});
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
