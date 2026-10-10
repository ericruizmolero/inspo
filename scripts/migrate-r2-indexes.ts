// Brings the two R2 JSON indexes of before #25 into their tables: every DESIGN.md entry file under
// inspo/design-md/ becomes a row of design_doc, every entry of inspo/page-shots-index.json a row of page_shot.
// The entry files are the truth for the docs: the old index lost entries when two were written at once, which
// is what the tables fix. R2 is only read: nothing there is written or deleted, so the run can be repeated (the
// rows are upserts) and the files stay until someone removes them by hand. At the end it validates the link from
// design_revision to design_doc (migration 0035 added it NOT VALID) and, if revisions with no doc block it, lists them.
//   npm run migrate:r2-indexes
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import type { PageShot } from "../types/inspo";
import type { DesignMdEntry } from "../lib/design-store";

async function main() {
  const { sql } = await import("drizzle-orm");
  const { db, pool } = await import("../lib/db");
  const { getJson, listFiles, usingR2 } = await import("../lib/storage");
  const { normalizeWebUrl, webKeyOf } = await import("../lib/url");
  const { DESIGN_MD_PREFIX, upsertDesignDoc } = await import("../lib/design-store");
  const { upsertPageShot } = await import("../lib/page-shots");
  console.log(`reading ${usingR2() ? `R2 bucket ${process.env.R2_BUCKET}` : "the local .data/files"}`);

  const index = (await getJson<Record<string, unknown>>("inspo/design-md-index.json")) ?? {};
  const files = (await listFiles(DESIGN_MD_PREFIX)).map((f) => f.key).filter((k) => k.endsWith(".json"));
  const written = new Set<string>();
  let docs = 0;
  for (const key of files) {
    const e = await getJson<DesignMdEntry>(key);
    if (!e?.url || typeof e.markdown !== "string" || !e.model) { console.log(`skip ${key}: not a DESIGN.md entry`); continue; }
    const url = normalizeWebUrl(e.url) ?? e.url;
    const when = new Date(e.generatedAt);
    if (Number.isNaN(+when)) console.log(`${url}: generatedAt "${e.generatedAt}" is not a date, written as now`);
    await upsertDesignDoc({ ...e, url, generatedAt: (Number.isNaN(+when) ? new Date() : when).toISOString() });
    written.add(webKeyOf(url));
    docs++;
  }
  const listedOnly = Object.keys(index).filter((u) => !written.has(webKeyOf(u)));
  console.log(`${docs} DESIGN.md docs from ${files.length} entry files (the index listed ${Object.keys(index).length})`);
  for (const u of listedOnly) console.log(`  in the index with no entry file, not written: ${u}`);

  const pages = (await getJson<Record<string, PageShot>>("inspo/page-shots-index.json")) ?? {};
  let shots = 0;
  for (const [url, s] of Object.entries(pages)) {
    if (!(s?.shotUrl && s.topUrl && s.tileUrl && s.thumbUrl && s.shotH)) { console.log(`skip ${url}: capture without its copies`); continue; }
    await upsertPageShot(url, { shotUrl: s.shotUrl, topUrl: s.topUrl, tileUrl: s.tileUrl, thumbUrl: s.thumbUrl, shotH: s.shotH, ...(s.color ? { color: s.color } : {}) });
    shots++;
  }
  console.log(`${shots} page captures from ${Object.keys(pages).length} index entries`);

  try {
    await db.execute(sql`alter table design_revision validate constraint design_revision_url_design_doc_url_fk`);
    console.log("every revision points at a doc: the link is validated");
  } catch (e) {
    const { rows } = await db.execute<{ url: string; n: string }>(sql`
      select r.url, count(*) as n from design_revision r
      where not exists (select 1 from design_doc d where d.url = r.url) group by r.url order by r.url`);
    console.log(`the link could not be validated (${(e as Error).message}): ${rows.length} addresses have revisions and no doc`);
    for (const r of rows) console.log(`  ${r.url}: ${r.n} revision${r.n === "1" ? "" : "s"}`);
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
