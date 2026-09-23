// Model eval for the DESIGN.md (#26). Every model gets the same measured tokens and
// screenshot; we check automatically what can be checked (format, colors and fonts
// against the measurement, repeated entries, cost, time) and save each output so the
// text can be compared blind. The reference is an Opus DESIGN.md we already paid for
// (eval/design-md/<site>/reference-opus.md, English or Spanish); every model gets a
// 0-100 closeness score against it. Opus itself never runs here.
//   npm run eval:design-md                 all sites, all models
//   npm run eval:design-md -- 21st.dev     only sites that contain "21st.dev"
//   EVAL_MODELS=a,b npm run eval:design-md  other models
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extractDesign, oklchToHex, type DesignTokens } from "../lib/design-extract";
import { generateDesignMd, type GenerateResult } from "../lib/design-md";
import type { DesignSpec } from "../types/design";

const SITES = [
  "https://21st.dev/",
  "https://craigmod.com/",
  "https://www.notboring.software/",
  "https://stripe.com/",
  "https://www.vocabbie.app/",
];

const MODELS = process.env.EVAL_MODELS?.split(",") ?? [
  "deepseek/deepseek-v4.1-flash",
  "openai/gpt-6-sol:floor", // cheapest endpoint, admits the flex tier
  "xiaomi/mimo-v2.6-flash",
];

const CACHE = ".data/eval-cache";
const OUT = "eval/design-md";

const slug = (s: string) => s.replace(/^https?:\/\/(www\.)?/, "").replace(/[^a-z0-9.]+/gi, "-").replace(/-+$/, "");

async function inputFor(url: string): Promise<{ tokens: DesignTokens; screenshot: Buffer }> {
  const base = `${CACHE}/${slug(url)}`;
  if (existsSync(`${base}.json`)) {
    // Older caches predate the oklch conversion in extractDesign
    return { tokens: oklchToHex(JSON.parse(await readFile(`${base}.json`, "utf8"))), screenshot: await readFile(`${base}.jpg`) };
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
const MONO = /mono|code|courier|consol|jet ?brains|menlo|monaco/i;
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

  const fams = spec.fonts.map((f) => norm(f.family));
  const fieldErrors =
    spec.typeScale.filter((x) => x.lineHeight > 4 || !fams.includes(norm(x.family))).length +
    (JSON.stringify(spec).match(/\u2212/g) ?? []).length +
    spec.fonts.filter((f) => f.role === "mono" && !/mono|code|courier|consol/i.test(f.family)).length;

  const words = spec.description.split(/\s+/).length;
  return {
    fieldErrors,
    colors: `${colorsGrounded}/${spec.colors.length}`,
    fonts: `${fontsGrounded}/${spec.fonts.length}`,
    duplicates,
    descWords: words,
    inRange: words >= 110 && words <= 190 && spec.dos.length >= 5 && spec.donts.length >= 5 && spec.components.length >= 3,
  };
}

/** 0-100: how close a spec is to the Opus spec for the same site. Values only, not prose. */
export function closeness(spec: DesignSpec, ref: DesignSpec): number {
  const hexes = (s: DesignSpec) => s.colors.map((c) => rgb(c.hex)).filter((x): x is RGB => !!x);
  const hit = (a: RGB[], b: RGB[]) => a.length ? a.filter((x) => b.some((y) => dist(x, y) <= 24)).length / a.length : 1;
  const jaccard = (a: string[], b: string[]) => {
    const A = new Set(a), B = new Set(b);
    return (A.size + B.size) ? [...A].filter((x) => B.has(x)).length / new Set([...A, ...B]).size : 1;
  };
  const colors = (hit(hexes(ref), hexes(spec)) + hit(hexes(spec), hexes(ref))) / 2;
  const sizes = jaccard(spec.typeScale.map((t) => String(Math.round(t.size))), ref.typeScale.map((t) => String(Math.round(t.size))));
  const fonts = jaccard(spec.fonts.map((f) => norm(f.family)), ref.fonts.map((f) => norm(f.family)));
  const calls = (Number(spec.theme === ref.theme) + Number(spec.spacing.density === ref.spacing.density)) / 2;
  return Math.round(((colors + sizes + fonts + calls) / 4) * 100);
}

/** The values closeness() needs, read from a rendered DESIGN.md in English or Spanish. */
export function parseReference(md: string): DesignSpec {
  const section = (en: string, es: string) => md.split(new RegExp(`^## (?:${en}|${es})\\s*$`, "m"))[1]?.split(/^## /m)[0] ?? "";
  const scale = md.split(/^### (?:Type scale|Escala tipográfica)\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  return {
    theme: /\*\*(?:Theme|Tema):\*\* (?:dark|oscuro)/.test(md) ? "dark" : "light",
    spacing: { density: /\*\*(?:Density|Densidad):\*\* (?:compact|compacta)/.test(md) ? "compact" : /\*\*(?:Density|Densidad):\*\* (?:airy|aireada)/.test(md) ? "airy" : "comfortable" },
    colors: [...section("Colors", "Colores").matchAll(/`(#[0-9a-f]{3,8})`/gi)].map((m) => ({ hex: m[1] })),
    fonts: [...section("Typography", "Tipografía").matchAll(/^### (.+) — \S+\s*$/gm)].map((m) => ({ family: m[1] })),
    typeScale: [...scale.matchAll(/^\|[^|]+\|[^|]+\|[^|]+\|\s*([\d.]+)px/gm)].map((m) => ({ size: Number(m[1]) })),
  } as unknown as DesignSpec;
}

// Self-check of the checker, runs every time: a spec with a repeated color must fail
{
  const t = { colors: { backgrounds: [{ value: "#09090b", count: 1 }], text: [], borders: [], accents: [] }, body: { background: "#09090b", color: "#fff", fontFamily: "Inter" }, fonts: { families: [], loaded: [] } } as unknown as DesignTokens;
  const s = { colors: [{ hex: "#0a0a0b" }, { hex: "#0A0A0B" }, { hex: "#ff0000" }], fonts: [{ family: "Inter" }], typeScale: [], dos: [], donts: [], similar: [], components: [], description: "x" } as unknown as DesignSpec;
  const r = check(s, t);
  if (r.colors !== "2/3" || r.fonts !== "1/1" || r.duplicates !== 1) throw new Error(`checker broken: ${JSON.stringify(r)}`);
  const ref = { ...s, theme: "dark", spacing: { density: "compact" } } as unknown as DesignSpec;
  if (closeness(ref, ref) !== 100) throw new Error("closeness broken: a spec is not 100 against itself");
  if (closeness({ ...ref, theme: "light", colors: [{ hex: "#00ff00" }] } as DesignSpec, ref) >= 100) throw new Error("closeness broken: a different spec scores 100");
  const p = parseReference("**Tema:** oscuro\n**Densidad:** compacta\n## Colores\n| A | `#09090b` |\n## Tipografía\n### General Sans — display\n### Escala tipográfica\n| cuerpo | General Sans | 500 | 13px | 1.5 | normal |\n## Espaciado");
  if (oklchToHex({ c: "oklch(0.274 0.005 286.033 / 0.6)" }).c !== "#27272a99") throw new Error("oklchToHex broken");
  if (p.theme !== "dark" || p.spacing.density !== "compact" || p.colors[0]?.hex !== "#09090b" || p.fonts[0]?.family !== "General Sans" || p.typeScale[0]?.size !== 13) throw new Error(`parseReference broken: ${JSON.stringify(p)}`);
}

// ─── Run ─────────────────────────────────────────────────────────────────────

type Row = { site: string; model: string } & (
  | ({ ok: true; cost: number | null; s: number; out: number; reasoning: number; provider: string | null; close: number | null } & ReturnType<typeof check>)
  | { ok: false; error: string }
);

const file = (model: string) => model.replace(/[/:]/g, "_");

async function main() {
  const filter = process.argv[2];
  const sites = SITES.filter((s) => !filter || s.includes(filter));
  const rows: Row[] = [];

  async function run(url: string, model: string, tokens: DesignTokens, screenshot: Buffer, ref: DesignSpec | null) {
    const dir = `${OUT}/${slug(url)}`;
    let r: GenerateResult;
    try {
      // A slow model must not hold up the whole run (MiMo sat 13 minutes on one site)
      r = await generateDesignMd(tokens, screenshot, AbortSignal.timeout(300_000), model);
    } catch (e) {
      const error = (e instanceof Error ? e.message : String(e)).slice(0, 160);
      console.log(`  ✗ ${model}: ${error}`);
      rows.push({ site: slug(url), model, ok: false, error });
      return null;
    }
    await writeFile(`${dir}/${file(model)}.md`, r.markdown);
    await writeFile(`${dir}/${file(model)}.json`, JSON.stringify(r.spec, null, 2));
    const c = check(r.spec, tokens);
    const close = ref ? closeness(r.spec, ref) : null;
    console.log(`  ✓ ${model} via ${r.provider}: $${r.costUsd?.toFixed(4)} ${(r.ms / 1000).toFixed(0)}s close ${close ?? "ref"} field errors ${c.fieldErrors} dupes ${c.duplicates}`);
    rows.push({ site: slug(url), model, ok: true, cost: r.costUsd, s: r.ms / 1000, out: r.usage.output, reasoning: r.usage.reasoning, provider: r.provider, close, ...c });
    return r.spec;
  }

  for (const url of sites) {
    console.log(`\n${url}: extracting…`);
    const { tokens, screenshot } = await inputFor(url);
    const dir = `${OUT}/${slug(url)}`;
    await mkdir(dir, { recursive: true });

    const refFile = `${dir}/reference-opus.md`;
    const ref = existsSync(refFile) ? parseReference(await readFile(refFile, "utf8")) : null;
    await Promise.all(MODELS.map((m) => run(url, m, tokens, screenshot, ref)));
  }


  const L = ["# DESIGN.md model eval", "", `Run ${new Date().toISOString().slice(0, 16)}. Same tokens and screenshot for every model.`, "",
    "| Site | Model | Provider | Cost | Time | Out tok (reasoning) | Close to Opus | Colors measured | Fonts measured | Field errors | Duplicates | Desc words | Ranges ok |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|"];
  for (const r of rows.sort((a, b) => a.site.localeCompare(b.site) || MODELS.indexOf(a.model) - MODELS.indexOf(b.model))) {
    L.push(r.ok
      ? `| ${r.site} | ${r.model} | ${r.provider ?? "?"} | $${r.cost?.toFixed(4) ?? "?"} | ${r.s.toFixed(0)}s | ${r.out} (${r.reasoning}) | ${r.close ?? "ref"} | ${r.colors} | ${r.fonts} | ${r.fieldErrors} | ${r.duplicates} | ${r.descWords} | ${r.inRange ? "yes" : "no"} |`
      : `| ${r.site} | ${r.model} | – | – | – | – | – | – | – | – | – | – | failed: ${r.error.replace(/\|/g, "/")} |`);
  }
  L.push("", "## Average per model", "", "| Model | Runs ok | Avg cost | Avg time | Avg close to Opus | Field errors | Duplicates |", "|---|---|---|---|---|---|---|");
  for (const m of MODELS) {
    const ok = rows.filter((r): r is Extract<Row, { ok: true }> => r.model === m && r.ok);
    const avg = (f: (r: typeof ok[number]) => number) => ok.length ? ok.reduce((n, r) => n + f(r), 0) / ok.length : 0;
    if (!rows.some((r) => r.model === m)) continue;
    const close = ok.filter((r) => r.close !== null);
    L.push(`| ${m} | ${ok.length}/${rows.filter((r) => r.model === m).length} | $${avg((r) => r.cost ?? 0).toFixed(4)} | ${avg((r) => r.s).toFixed(0)}s | ${close.length ? Math.round(close.reduce((n, r) => n + (r.close ?? 0), 0) / close.length) : "ref"} | ${ok.reduce((n, r) => n + r.fieldErrors, 0)} | ${ok.reduce((n, r) => n + r.duplicates, 0)} |`);
  }
  await mkdir(OUT, { recursive: true });
  await writeFile(`${OUT}/results-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.md`, L.join("\n") + "\n");
  console.log(`\n${L.join("\n")}`);
}

if (process.argv[1]?.endsWith("eval-design-md.ts")) main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
