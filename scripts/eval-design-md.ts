// Model eval for the DESIGN.md (#26). Every model gets the same measured tokens and
// screenshot; we check automatically what can be checked (format, colors and fonts
// against the measurement, repeated entries, cost, time) and save each output so the
// text can be compared blind.
//   npm run eval:design-md                 all sites, all models
//   npm run eval:design-md -- 21st.dev     only sites that contain "21st.dev"
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extractDesign, type DesignTokens } from "../lib/design-extract";
import { generateDesignMd, type GenerateResult } from "../lib/design-md";
import type { DesignSpec } from "../types/design";

const SITES = [
  "https://21st.dev/",
  "https://craigmod.com/",
  "https://www.notboring.software/",
  "https://stripe.com/",
  "https://www.vocabbie.app/",
];

const MODELS = [
  "anthropic/claude-opus-5", // baseline, what we use today
  "xiaomi/mimo-v2.6-pro",
  "openai/gpt-6-sol",
  "openai/gpt-6-sol:floor", // cheapest endpoint, admits the flex tier
  "deepseek/deepseek-v4.1-flash",
];

const CACHE = ".data/eval-cache";
const OUT = "eval/design-md";

const slug = (s: string) => s.replace(/^https?:\/\/(www\.)?/, "").replace(/[^a-z0-9.]+/gi, "-").replace(/-+$/, "");

async function inputFor(url: string): Promise<{ tokens: DesignTokens; screenshot: Buffer }> {
  const base = `${CACHE}/${slug(url)}`;
  if (existsSync(`${base}.json`)) {
    return { tokens: JSON.parse(await readFile(`${base}.json`, "utf8")), screenshot: await readFile(`${base}.jpg`) };
  }
  const { tokens, screenshot } = await extractDesign(url);
  await mkdir(CACHE, { recursive: true });
  await writeFile(`${base}.json`, JSON.stringify(tokens));
  await writeFile(`${base}.jpg`, screenshot);
  return { tokens, screenshot };
}

// ─── Checks ──────────────────────────────────────────────────────────────────

type RGB = [number, number, number];
function rgb(v: string): RGB | null {
  const h = v.trim().match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (h) {
    const x = h.length <= 4 ? [...h.slice(0, 3)].map((c) => c + c).join("") : h.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)) as RGB;
  }
  const m = v.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const norm = (s: string) => s.toLowerCase().replace(/["']/g, "").trim();

function dupes(list: string[]): number {
  return list.length - new Set(list.map(norm)).size;
}

export function check(spec: DesignSpec, t: DesignTokens) {
  const measured = [...t.colors.backgrounds, ...t.colors.text, ...t.colors.borders, ...t.colors.accents, { value: t.body.background }, { value: t.body.color }]
    .map((x) => rgb(x.value)).filter((x): x is RGB => !!x);
  const colorsGrounded = spec.colors.filter((c) => {
    const v = rgb(c.hex);
    return v && measured.some((m) => dist(v, m) <= 24); // ponytail: plain RGB distance, move to ΔE if it misjudges
  }).length;

  const families = [...t.fonts.families.map((f) => f.value), ...t.fonts.loaded, t.body.fontFamily].join(",").toLowerCase();
  const fontsGrounded = spec.fonts.filter((f) => families.includes(norm(f.family))).length;

  const duplicates =
    dupes(spec.colors.map((c) => c.hex.slice(0, 7))) +
    dupes(spec.fonts.map((f) => f.family)) +
    dupes(spec.typeScale.map((s) => `${s.family}|${s.size}|${s.weight}`)) +
    dupes(spec.dos) + dupes(spec.donts) + dupes(spec.similar.map((s) => s.brand)) + dupes(spec.components.map((c) => c.name));

  const words = spec.description.split(/\s+/).length;
  return {
    colors: `${colorsGrounded}/${spec.colors.length}`,
    fonts: `${fontsGrounded}/${spec.fonts.length}`,
    duplicates,
    descWords: words,
    inRange: words >= 110 && words <= 190 && spec.dos.length >= 5 && spec.donts.length >= 5 && spec.components.length >= 3,
  };
}

// Self-check of the checker, runs every time: a spec with a repeated color must fail
{
  const t = { colors: { backgrounds: [{ value: "#09090b", count: 1 }], text: [], borders: [], accents: [] }, body: { background: "#09090b", color: "#fff", fontFamily: "Inter" }, fonts: { families: [], loaded: [] } } as unknown as DesignTokens;
  const s = { colors: [{ hex: "#0a0a0b" }, { hex: "#0A0A0B" }, { hex: "#ff0000" }], fonts: [{ family: "Inter" }], typeScale: [], dos: [], donts: [], similar: [], components: [], description: "x" } as unknown as DesignSpec;
  const r = check(s, t);
  if (r.colors !== "2/3" || r.fonts !== "1/1" || r.duplicates !== 1) throw new Error(`checker broken: ${JSON.stringify(r)}`);
}

// ─── Run ─────────────────────────────────────────────────────────────────────

type Row = { site: string; model: string } & (
  | ({ ok: true; cost: number | null; s: number; out: number; reasoning: number; provider: string | null } & ReturnType<typeof check>)
  | { ok: false; error: string }
);

async function main() {
  const filter = process.argv[2];
  const sites = SITES.filter((s) => !filter || s.includes(filter));
  const rows: Row[] = [];

  for (const url of sites) {
    console.log(`\n${url}: extracting…`);
    const { tokens, screenshot } = await inputFor(url);
    const dir = `${OUT}/${slug(url)}`;
    await mkdir(dir, { recursive: true });

    await Promise.all(MODELS.map(async (model) => {
      let r: GenerateResult;
      try {
        r = await generateDesignMd(tokens, screenshot, undefined, model);
      } catch (e) {
        const error = (e instanceof Error ? e.message : String(e)).slice(0, 160);
        console.log(`  ✗ ${model}: ${error}`);
        rows.push({ site: slug(url), model, ok: false, error });
        return;
      }
      await writeFile(`${dir}/${model.replace(/[/:]/g, "_")}.md`, r.markdown);
      const c = check(r.spec, tokens);
      console.log(`  ✓ ${model} via ${r.provider}: $${r.costUsd?.toFixed(4)} ${(r.ms / 1000).toFixed(0)}s colors ${c.colors} fonts ${c.fonts} dupes ${c.duplicates}`);
      rows.push({ site: slug(url), model, ok: true, cost: r.costUsd, s: r.ms / 1000, out: r.usage.output, reasoning: r.usage.reasoning, provider: r.provider, ...c });
    }));
  }

  const L = ["# DESIGN.md model eval", "", `Run ${new Date().toISOString().slice(0, 16)}. Same tokens and screenshot for every model.`, "",
    "| Site | Model | Provider | Cost | Time | Out tok (reasoning) | Colors measured | Fonts measured | Duplicates | Desc words | Ranges ok |",
    "|---|---|---|---|---|---|---|---|---|---|---|"];
  for (const r of rows.sort((a, b) => a.site.localeCompare(b.site) || MODELS.indexOf(a.model) - MODELS.indexOf(b.model))) {
    L.push(r.ok
      ? `| ${r.site} | ${r.model} | ${r.provider ?? "?"} | $${r.cost?.toFixed(4) ?? "?"} | ${r.s.toFixed(0)}s | ${r.out} (${r.reasoning}) | ${r.colors} | ${r.fonts} | ${r.duplicates} | ${r.descWords} | ${r.inRange ? "yes" : "no"} |`
      : `| ${r.site} | ${r.model} | – | – | – | – | – | – | – | – | failed: ${r.error.replace(/\|/g, "/")} |`);
  }
  L.push("", "## Average per model", "", "| Model | Runs ok | Avg cost | Avg time | Total duplicates |", "|---|---|---|---|---|");
  for (const m of MODELS) {
    const ok = rows.filter((r): r is Extract<Row, { ok: true }> => r.model === m && r.ok);
    const avg = (f: (r: typeof ok[number]) => number) => ok.length ? ok.reduce((n, r) => n + f(r), 0) / ok.length : 0;
    L.push(`| ${m} | ${ok.length}/${rows.filter((r) => r.model === m).length} | $${avg((r) => r.cost ?? 0).toFixed(4)} | ${avg((r) => r.s).toFixed(0)}s | ${ok.reduce((n, r) => n + r.duplicates, 0)} |`);
  }
  await mkdir(OUT, { recursive: true });
  await writeFile(`${OUT}/results.md`, L.join("\n") + "\n");
  console.log(`\n${L.join("\n")}`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
