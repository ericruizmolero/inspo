// Scores the system and brand prompts on the golden set (scripts/fixtures/system, frozen with npm run eval:freeze).
// Each pass runs the real prompts of lib/system.ts and lib/brand.ts on a fixture, with no fallback model. With
// --sheet (off by default, as in runSystem), the look pass first reads the fixture's frozen pictures side by side (read only, from storage)
// and the system pass gets what it saw, as runSystem does; its cost is kept apart. Then:
//   hard checks: evidence ids that exist, hex and families found in what was measured, areas written in the fixture's language;
//   a judge model: specificity, the team's words, coherence, how close each area is to what the team decided,
//   and the "never" lines broken (a line names what it protects, "the orange #EB3514 is the only accent", so
//   finding its words in a decision proves nothing: reading it does);
//   the cost and time of the pass.
// Each pass appends one row to scripts/evals/system.jsonl, keyed by prompt version and model, and the command
// ends with the table of every row so far. What the models wrote goes to .data/evals/ to read.
// No database: only OpenRouter, a few cents a pass with the judge.
//   npm run eval:system                                → every fixture, each pass on its own model (lib/prompts.ts), once
//   npm run eval:system -- --models a/b,c/d --runs 2   → other models for both passes, each fixture twice
//   npm run eval:system -- --only zernio --no-judge    → one fixture, hard checks only
//   npm run eval:system -- --sheet                     → with the look pass (SYSTEM_SHEET=1 in the app)
//   npm run eval:system -- --table                     → the table, no calls
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import type { SystemSnapshot } from "../lib/system";
import type { DesignSpec } from "../types/design";
import type { SystemArea } from "../types/system";

/** One golden-set project, as eval:freeze writes it */
export interface EvalFixture {
  slug: string;
  language: string;
  frozenAt: string;
  system: SystemSnapshot;
  /** What each measured site on the board measured, by reference code */
  sites: Record<string, { name: string; spec: DesignSpec }>;
  clientSite: Record<string, unknown> | null;
  /** What the team expects of an area, in its own words */
  expect: Partial<Record<SystemArea, string>>;
  /** The pictures the contact sheet shows, in its order, as storage keys (lib/system.ts sheetRefs) */
  pictures?: { code: string; key: string }[];
}

interface Row {
  at: string;
  fixture: string;
  model: string;
  systemPrompt: string;
  brandPrompt: string;
  judge: string | null;
  /** The look pass ran and the system pass read what it saw; absent on rows from before it */
  sheet?: boolean;
  error?: string;
  checks?: { evidence: [number, number]; hex: [number, number]; families: [number, number]; language?: [number, number] };
  scores?: { specificity: number; teamWords: number; coherence: number; expected: number | null; neverBroken: number };
  /** The two passes; the judge is billed apart, so a model's cost reads clean */
  costUsd?: number;
  judgeUsd?: number;
  /** The look pass, apart from the two passes */
  lookUsd?: number;
  ms?: number;
}

const FIXTURES = "scripts/fixtures/system";
const RESULTS = "scripts/evals/system.jsonl";
const OUTPUTS = ".data/evals";
const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || "anthropic/claude-sonnet-5.5";

const args = process.argv.slice(2);
const arg = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const flag = (name: string) => args.includes(`--${name}`);

const HEX_RE = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi;
const hex6 = (h: string) => { const x = h.slice(1).toLowerCase(); return x.length === 3 ? [...x].map((c) => c + c).join("") : x; };
const hexesIn = (s: string) => new Set([...s.matchAll(HEX_RE)].map((m) => hex6(m[0])));
const flat = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

const JudgeSchema = z.object({
  specificity: z.number().int().min(1).max(5),
  team_words: z.number().int().min(1).max(5),
  coherence: z.number().int().min(1).max(5),
  expected: z.array(z.object({ area: z.string(), score: z.number().int().min(1).max(5) })),
  never_broken: z.array(z.object({ line: z.string(), by: z.string() })),
  note: z.string(),
});

const JUDGE = `You grade one pass of a design tool. It read a project's board of references (the team's words: notes, comments, what they pointed at, the brief) and wrote the project's SYSTEM (eight areas, each a decision, a why and its evidence), then the BRAND values drawn from it. Grade it as a senior designer on that team who knows the board.

Each score is 1 to 5:
- specificity: decisions name concrete values (families, weights, hex, sizes, curves) where the board has them, and say what only this project would say. 1: lines that fit any brand.
- team_words: decisions and whys carry what the team said (their words, their emphasis, the brief), not the tool's own taste. 1: the team's words are ignored.
- coherence: the areas agree with each other, with the summary and with the brand values.
- expected: for every area under EXPECTED, how close the tool's decision is in substance to what the team decided. 5: the same decision and values. 3: the same direction, values missing or different. 1: another decision, or empty.
never_broken: every NEVER line that a decision or a brand value goes against, quoted, with what breaks it in "by". A line that names what it protects ("the orange is the only accent") is kept, not broken, when that thing is used.
note: the worst problem, at most 40 words.`;

async function fixtures(): Promise<EvalFixture[]> {
  const only = arg("only");
  const files = (await fs.readdir(FIXTURES)).filter((f) => f.endsWith(".json")).sort();
  const all = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(FIXTURES, f), "utf8")) as EvalFixture));
  return all.filter((f) => !only || f.slug === only);
}

/** `model` "": each pass on its own task's model */
async function pass(fx: EvalFixture, model: string, judge: boolean, sheet: boolean): Promise<Row> {
  const { llm } = await import("../lib/llm");
  const { systemRequest, seeBoard, SystemOutSchema, SYSTEM_PROMPT_ID } = await import("../lib/system");
  const { forModel, pictureAt } = await import("../lib/tagger");
  const { builtinTemplateFile } = await import("../lib/template-seed");
  // As tags:look reads them: a built-in template's image no storage here holds comes from its file in the repo
  const picture = async (key: string) => { const stored = await pictureAt(key); const file = stored ? null : builtinTemplateFile(key); return stored ?? (file ? forModel(file) : null); };
  const { brandRequest, measuredOf, BrandOutSchema, BRAND_PROMPT_ID } = await import("../lib/brand");
  const { emptyBrand } = await import("../types/brand");
  const { toOutputLanguage, writtenIn } = await import("../lib/output-language");
  const { PROMPTS } = await import("../lib/prompts");
  const own = PROMPTS.system.model === PROMPTS.brand.model ? PROMPTS.system.model : `${PROMPTS.system.model} · ${PROMPTS.brand.model}`;
  const pick = model ? { model } : {};
  const row: Row = { at: new Date().toISOString(), fixture: fx.slug, model: model || own, systemPrompt: SYSTEM_PROMPT_ID, brandPrompt: BRAND_PROMPT_ID, judge: judge ? JUDGE_MODEL : null, sheet };
  const language = toOutputLanguage(fx.language);
  const system: SystemSnapshot = { ...fx.system, omitted: fx.system.omitted ?? 0 };

  try {
    if (sheet) {
      const read = await Promise.all((fx.pictures ?? []).map(async ({ code, key }) => ({ code, image: await picture(key) })));
      const seen = await seeBoard(read.filter((p): p is { code: string; image: Buffer } => !!p.image), { fallback: null });
      row.lookUsd = seen?.res.costUsd ?? 0;
      if (seen) {
        system.seen = seen.seen;
        await fs.mkdir(OUTPUTS, { recursive: true });
        await fs.writeFile(path.join(OUTPUTS, `${fx.slug}-sheet.jpg`), seen.sheet);
      }
    }
    const sysReq = systemRequest(system, { language });
    const sysRes = await llm({ ...sysReq, ...pick, fallback: null });
    const sys = SystemOutSchema.parse(JSON.parse(sysRes.text));

    const nevers = new Map(fx.system.standing.map((a) => [a.area, a.never ?? []]));
    const empty = emptyBrand();
    const brandReq = brandRequest({
      name: fx.system.name,
      brief: fx.system.brief,
      system: { summary: sys.summary, areas: sys.areas.filter((a) => a.decision || nevers.get(a.area)?.length).map((a) => ({ area: a.area, decision: a.decision || undefined, why: a.why || undefined, never: nevers.get(a.area)?.length ? nevers.get(a.area) : undefined })) },
      measured: measuredOf(sys.areas, new Map(Object.entries(fx.sites))),
      clientSite: fx.clientSite,
      guides: fx.system.guides,
      keep: {},
      current: { intro: empty.intro, color: [], faces: [], voice: empty.voice },
      pictures: fx.system.refs.filter((r) => r.kind !== "text").map((r) => ({ id: String(r.id), name: String(r.name ?? ""), kind: String(r.kind) })).slice(0, 80),
    }, language);
    const brandRes = await llm({ ...brandReq, ...pick, fallback: null });
    const brand = BrandOutSchema.parse(JSON.parse(brandRes.text));

    // Hard checks: every number is [bad, total]
    const ids = new Set(fx.system.refs.map((r) => String(r.id)));
    const pictures = new Set(fx.system.refs.filter((r) => r.kind !== "text").map((r) => String(r.id)));
    const cited = [...sys.areas.flatMap((a) => a.evidence.map((e) => ids.has(e.ref))), ...brand.imagery.refs.map((r) => pictures.has(r))];
    const measured = `${sysReq.text}\n${JSON.stringify(fx.sites)}\n${JSON.stringify(fx.clientSite)}`;
    const known = hexesIn(measured), source = flat(measured);
    const used = hexesIn(JSON.stringify([sys.areas.map((a) => [a.decision, a.why]), brand.color.items.map((c) => c.hex)]));
    const families = [...new Set([...brand.typography.faces.map((f) => f.family), ...brand.typography.scale.map((s) => s.family)].map((f) => f.trim()).filter(Boolean))];
    row.checks = {
      evidence: [cited.filter((ok) => !ok).length, cited.length],
      hex: [[...used].filter((h) => !known.has(h)).length, used.size],
      families: [families.filter((f) => !source.includes(flat(f))).length, families.length],
      language: (() => { const read = sys.areas.map((a) => writtenIn(`${a.decision} ${a.why}`, language)).filter((x) => x !== null); return [read.filter((x) => !x).length, read.length]; })(),
    };
    row.costUsd = (sysRes.costUsd ?? 0) + (brandRes.costUsd ?? 0);
    row.ms = sysRes.ms + brandRes.ms;

    let verdict: z.infer<typeof JudgeSchema> | null = null;
    if (judge) {
      const res = await llm({
        model: JUDGE_MODEL, fallback: null, system: JUDGE, schema: JudgeSchema, maxTokens: 4000,
        text: [
          `WHAT THE TOOL READ\n${sysReq.text}`,
          `EXPECTED (the team's own decisions, JSON): ${JSON.stringify(fx.expect)}`,
          `NEVER (the team's lines, by area, JSON): ${JSON.stringify(Object.fromEntries([...nevers].filter(([, v]) => v.length)))}`,
          `SYSTEM WRITTEN (JSON): ${JSON.stringify(sys)}`,
          `BRAND WRITTEN (JSON): ${JSON.stringify(brand)}`,
        ].join("\n\n"),
      });
      verdict = JudgeSchema.parse(JSON.parse(res.text));
      row.judgeUsd = res.costUsd ?? 0;
      const expected = verdict.expected.filter((e) => e.area in fx.expect);
      row.scores = { specificity: verdict.specificity, teamWords: verdict.team_words, coherence: verdict.coherence, expected: expected.length ? expected.reduce((n, e) => n + e.score, 0) / expected.length : null, neverBroken: verdict.never_broken.length };
    }

    const out = path.join(OUTPUTS, SYSTEM_PROMPT_ID, row.model.replace(/[^a-z0-9.-]+/gi, "_"), `${fx.slug}-${row.at.replace(/[:.]/g, "-")}.json`);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, JSON.stringify({ row, seen: system.seen, system: sys, brand, verdict }, null, 1));
  } catch (e) {
    row.error = (e instanceof Error ? e.message : String(e)).slice(0, 300);
  }
  return row;
}

const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const okRate = (pairs: [number, number][]) => { const total = pairs.reduce((n, [, t]) => n + t, 0); return total ? `${Math.round(100 * (1 - pairs.reduce((n, [b]) => n + b, 0) / total))}%` : "–"; };
const fixed = (n: number, d = 1) => Number.isNaN(n) ? "–" : n.toFixed(d);

function table(rows: Row[], current: string) {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = `${r.systemPrompt}|${r.brandPrompt}|${r.model}|${!!r.sheet}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const head = ["prompt (system · brand)", "model", "sheet", "passes", "failed", "evidence ok", "hex ok", "families ok", "language ok", "specific", "team words", "coherent", "expected", "never broken", "$ / pass", "look $", "judge $", "s / pass"];
  const body = [...groups.values()].sort((a, b) => a.at(-1)!.at.localeCompare(b.at(-1)!.at)).map((g) => {
    const ok = g.filter((r) => r.checks);
    const scored = ok.filter((r) => r.scores);
    const s = (f: (x: NonNullable<Row["scores"]>) => number | null) => fixed(mean(scored.map((r) => f(r.scores!)).filter((x): x is number => x !== null)));
    return [
      `${g[0].systemPrompt === current ? "* " : ""}${g[0].systemPrompt} · ${g[0].brandPrompt}`, g[0].model, g[0].sheet ? "yes" : "no", String(g.length), String(g.length - ok.length),
      okRate(ok.map((r) => r.checks!.evidence)), okRate(ok.map((r) => r.checks!.hex)), okRate(ok.map((r) => r.checks!.families)), okRate(ok.flatMap((r) => r.checks!.language ? [r.checks!.language] : [])),
      s((x) => x.specificity), s((x) => x.teamWords), s((x) => x.coherence), s((x) => x.expected), s((x) => x.neverBroken),
      fixed(mean(ok.map((r) => r.costUsd ?? 0)), 4), fixed(mean(ok.flatMap((r) => r.lookUsd ?? [])), 4), fixed(mean(scored.flatMap((r) => r.judgeUsd ?? [])), 4), fixed(mean(ok.map((r) => (r.ms ?? 0) / 1000))),
    ];
  });
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((r) => r[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => (i < 3 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join("  ");
  console.log(`\n${line(head)}\n${widths.map((w) => "─".repeat(w)).join("  ")}\n${body.map(line).join("\n")}`);
  console.log("\nChecks: the share that passed. Judge: 1 to 5, and never lines broken per pass. $ / pass: the two passes; look $: the look pass on top, when the sheet ran; judge $: the judge on top. * the prompt in the code now.");
}

async function readRows(): Promise<Row[]> {
  const text = await fs.readFile(RESULTS, "utf8").catch(() => "");
  return text.split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
}

async function main() {
  const { SYSTEM_PROMPT_ID } = await import("../lib/system");
  if (!flag("table")) {
    const { llmEnabled } = await import("../lib/llm");
    if (!llmEnabled()) throw new Error("OPENROUTER_API_KEY is not set");
    const models = arg("models")?.split(",").map((m) => m.trim()).filter(Boolean) ?? [""];
    const runs = Number(arg("runs")) || 1;
    const set = await fixtures();
    if (!set.length) throw new Error(`No fixtures in ${FIXTURES}: npm run eval:freeze -- <project id> <slug>`);
    const jobs = set.flatMap((fx) => models.flatMap((m) => Array.from({ length: runs }, () => [fx, m] as const)));
    console.log(`${jobs.length} passes: ${set.map((f) => f.slug).join(", ")} × ${models.map((m) => m || "own models").join(", ")}${runs > 1 ? ` × ${runs}` : ""}`);
    await fs.mkdir(path.dirname(RESULTS), { recursive: true });
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, async () => {
      while (next < jobs.length) {
        const [fx, model] = jobs[next++];
        const row = await pass(fx, model, !flag("no-judge"), flag("sheet"));
        await fs.appendFile(RESULTS, JSON.stringify(row) + "\n");
        console.log(row.error ? `  ✗ ${fx.slug} · ${row.model}: ${row.error}` : `  ✓ ${fx.slug} · ${row.model}${row.sheet ? ` · look $${(row.lookUsd ?? 0).toFixed(4)}` : ""} · $${row.costUsd!.toFixed(4)}${row.judgeUsd !== undefined ? ` + judge $${row.judgeUsd.toFixed(4)}` : ""} · ${(row.ms! / 1000).toFixed(0)}s`);
      }
    }));
  }
  table(await readRows(), SYSTEM_PROMPT_ID);
  const { pool } = await import("../lib/db");
  await pool.end().catch(() => {});
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
