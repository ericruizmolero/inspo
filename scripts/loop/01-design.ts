// Step 2a of the loop prototype: a DESIGN.md for every Savvia website, with the
// production pipeline (Chrome tokens + screenshot + the cheap model) but saved to
// .data/loop/design/<key>.{json,md}. Resumable: existing files are skipped.
//   npx tsx --conditions=react-server scripts/loop/01-design.ts [limit]
import { extractDesign } from "../../lib/design-extract";
import { generateDesignMd } from "../../lib/design-md";
import { savviaRefs, dir, readJson, writeJson, writeText, pool, record, MODELS, fmtUsd } from "./shared";
import type { DesignSpec } from "../../types/design";

export interface DesignFile { ref: string; web: string; finalUrl: string; model: string; costUsd: number | null; spec: DesignSpec; generatedAt: string }

async function main() {
  const limit = Number(process.argv[2] || 0) || Infinity;
  const refs = (await savviaRefs()).slice(0, limit);
  console.log(`${refs.length} websites, model ${MODELS.cheap}`);
  let spent = 0;
  const { ok, failed } = await pool(refs, Number(process.env.LOOP_PARALLEL || 3), async (r, i) => {
    const file = dir("design", `${r.key}.json`);
    if (await readJson(file)) { console.log(`  · ${i + 1}/${refs.length} ${r.name} (cached)`); return; }
    const t0 = Date.now();
    const { tokens, screenshot } = await extractDesign(r.web);
    const out = await generateDesignMd(tokens, screenshot, undefined, MODELS.cheap);
    await record("design", r.key, { text: "", model: out.model, provider: out.provider, id: out.requestId, usage: out.usage, costUsd: out.costUsd, ms: out.ms });
    const data: DesignFile = { ref: r.key, web: r.web, finalUrl: tokens.finalUrl, model: out.model, costUsd: out.costUsd, spec: out.spec, generatedAt: new Date().toISOString() };
    await writeJson(file, data);
    await writeText(dir("design", `${r.key}.md`), out.markdown);
    await writeText(dir("shots", `${r.key}.jpg`), screenshot);
    spent += out.costUsd ?? 0;
    console.log(`  ✓ ${i + 1}/${refs.length} ${r.name} · ${out.spec.tagline} · ${fmtUsd(out.costUsd ?? 0)} · ${Math.round((Date.now() - t0) / 1000)}s`);
  });
  for (const f of failed) console.error(`  ✗ ${f.item.name} ${f.item.web}: ${f.error}`);
  await writeJson(dir("design-errors.json"), failed.map((f) => ({ ref: f.item.key, name: f.item.name, web: f.item.web, error: f.error })));
  console.log(`done: ${ok} ok, ${failed.length} failed, spent ${fmtUsd(spent)} this run`);
}
main().catch((e) => { console.error(e); process.exit(1); });
