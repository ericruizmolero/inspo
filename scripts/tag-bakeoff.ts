// Picks the tagging model: the same items, the same inputs, several cheap models side by side.
// Writes one HTML page with each item's picture, every model's tags and what each call cost.
// Read only: nothing is captured, saved to the database or storage, or logged as usage.
//   npm run tags:bakeoff                                   → 15 items, the default candidates
//   npm run tags:bakeoff -- --limit 25 --models a/b,c/d    → other items or models
//   npm run tags:bakeoff -- --out /path/page.html          → elsewhere than .data/tag-bakeoff.html
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { promises as fs } from "fs";
import path from "path";

const args = process.argv.slice(2);
const arg = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const LIMIT = Number(arg("limit")) || 15;
const MODELS = (arg("models") ?? "google/gemini-2.5-flash-lite,google/gemma-3-12b-it,openai/gpt-4.1-nano,mistralai/mistral-small-3.2-24b-instruct").split(",").map((m) => m.trim()).filter(Boolean);
const OUT = arg("out") ?? ".data/tag-bakeoff.html";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

async function main() {
  const { db, schema } = await import("../lib/db");
  const { inputsOf, tagWith } = await import("../lib/tagger");
  const { designDocsFor } = await import("../lib/design-store");
  const { pageShotsFor } = await import("../lib/page-shots");
  const { mediaKindOf } = await import("../lib/url");
  const { rowToItem } = await import("../lib/items");
  const { FACETS } = await import("../lib/taxonomy");

  // Sites with a stored full page first (no capture to wait for), then a few uploads and posts for range
  const rows = await db.select().from(schema.inspoItem);
  const seen = new Set<string>();
  const unique = rows.filter((r) => !seen.has(r.webKey) && seen.add(r.webKey));
  const webs = unique.map((r) => r.web);
  const [design, pages] = await Promise.all([designDocsFor(webs), pageShotsFor(webs)]);
  const stored = unique.filter((r) => mediaKindOf(r.web) === "web" && (design[r.web]?.shotUrl || pages[r.web]));
  const other = unique.filter((r) => mediaKindOf(r.web) !== "web");
  // Read only: stored pages, or the card's first screen. Nothing is captured or written.
  const firstScreen = unique.filter((r) => mediaKindOf(r.web) === "web" && !stored.includes(r));
  const sites = [...stored, ...firstScreen].slice(0, LIMIT - Math.min(3, Math.floor(LIMIT / 5), other.length));
  const picked = [...sites, ...other.slice(0, LIMIT - sites.length)];
  console.log(`${Math.min(stored.length, sites.length)} with a stored whole page`);
  console.log(`${picked.length} items × ${MODELS.length} models: ${MODELS.join(", ")}`);

  const totals = Object.fromEntries(MODELS.map((m) => [m, { usd: 0, ms: 0, ok: 0, failed: 0 }]));
  const blocks: string[] = [];
  for (const [n, row] of picked.entries()) {
    const item = rowToItem(row);
    console.log(`${n + 1}/${picked.length} ${item.web}`);
    const inputs = await inputsOf(item.web, { capture: false });
    const cells = await Promise.all(MODELS.map(async (model) => {
      try {
        const r = await tagWith(item, inputs, { model, fallback: null });
        const t = totals[model]; t.usd += r.costUsd ?? 0; t.ms += r.ms; t.ok++;
        const tg = r.tags;
        const lists = [
          ["sector / style", [`${tg.sector}`, `${tg.style} (${tg.styleP})`]],
          ["traits", Object.keys(tg.tags).filter((k) => tg.tags[k] >= 0.6)],
          ...FACETS.filter((f) => f.field !== "palette").map((f) => [f.field, tg[f.field] ?? []] as const),
          ["keywords", tg.keywords ?? []],
          ["fonts", tg.fonts ?? []],
        ] as [string, string[]][];
        const areas = Object.entries(tg.areas ?? {}).map(([area, a]) => `<div class="area"><b>${area}</b> ${a!.signals.map((x) => `<span class="tag sig">${esc(x)}</span>`).join(" ")} <i>${esc(a!.evidence)}</i></div>`).join("");
        return `<td><div class="meta">$${(r.costUsd ?? 0).toFixed(5)} · ${(r.ms / 1000).toFixed(1)}s · ${r.usage.input}/${r.usage.output} tok</div>
          ${lists.map(([k, v]) => `<div><b>${k}</b> ${v.map((x) => `<span class="tag">${esc(x)}</span>`).join(" ")}</div>`).join("")}
          ${areas}<p>${esc(tg.visual ?? "")}</p></td>`;
      } catch (e) {
        totals[model].failed++;
        return `<td class="err">${esc(e instanceof Error ? e.message : String(e))}</td>`;
      }
    }));
    const { paletteOf } = await import("../lib/palette");
    const pal = inputs.image ? await paletteOf(inputs.image).catch(() => null) : null;
    const img = inputs.image ? `<img src="data:image/jpeg;base64,${inputs.image.toString("base64")}" alt="">` : `<div class="noimg">no image</div>`;
    const swatches = (pal?.colors ?? []).map((c) => `<span class="sw" style="background:${c.hex};flex-grow:${c.share}" title="${c.family} ${c.hex} ${Math.round(c.share * 100)}%"></span>`).join("");
    blocks.push(`<tr><td class="pic"><a href="${esc(item.web)}">${esc(item.name)}</a><div class="pal">${swatches}</div><div class="fam">${(pal?.palette ?? []).join(", ")} · ${pal?.theme ?? ""}</div>${img}</td>${cells.join("")}</tr>`);
  }

  const head = MODELS.map((m) => {
    const t = totals[m];
    return `<th>${esc(m)}<div class="meta">$${(t.ok ? t.usd / t.ok : 0).toFixed(5)}/item · ${(t.ok ? t.ms / t.ok / 1000 : 0).toFixed(1)}s · ${t.failed} failed</div></th>`;
  }).join("");
  const html = `<!doctype html><meta charset="utf-8"><title>Tag bake-off</title>
<style>
body{font:13px/1.45 ui-sans-serif,system-ui;margin:24px;background:#fafaf9;color:#1c1917}
table{border-collapse:collapse;width:100%}td,th{border-top:1px solid #e7e5e4;padding:12px;vertical-align:top;text-align:left}
th{position:sticky;top:0;background:#fafaf9}.pic{width:260px}.pic img{width:260px;max-height:640px;object-fit:cover;object-position:top;border:1px solid #e7e5e4}
.meta{color:#78716c;font-weight:400;font-size:12px}.tag{display:inline-block;background:#f5f5f4;border-radius:4px;padding:0 5px;margin:1px 0}
.pal{display:flex;height:14px;margin:6px 0 2px;border-radius:4px;overflow:hidden}.sw{flex-basis:0}.fam{color:#78716c;margin-bottom:6px}
.area{margin-top:4px}.sig{background:#e7f0e4}.area i{color:#57534e}.err{color:#b91c1c}.noimg{color:#a8a29e}b{font-weight:600;margin-right:4px}p{color:#57534e}
</style>
<h1>Tag bake-off</h1><p>${picked.length} items, same inputs for every model. Cost is what OpenRouter billed.</p>
<table><tr><th>Item</th>${head}</tr>${blocks.join("")}</table>`;
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, html);
  console.log(`\n${MODELS.map((m) => `${m}: $${(totals[m].ok ? totals[m].usd / totals[m].ok : 0).toFixed(5)}/item, ${totals[m].failed} failed`).join("\n")}\n→ ${path.resolve(OUT)}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
