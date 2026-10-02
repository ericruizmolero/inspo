// Gives every site in the library a stored full-page screenshot, so the canvas only ever loads images:
//   1. DESIGN.md entries get their canvas copies (the top of the page at 1440, 720 and 288px).
//   2. Sites with no DESIGN.md get a full-page capture of their own (lib/page-shots.ts).
// Safe to run again: what is done is skipped. New sites get theirs when they are added.
//   npm run shots:pages                 → every workspace, three Chromes at a time
//   npm run shots:pages -- --limit 10   → the first ten missing
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
process.env.CHROME_CONCURRENCY ||= "3";

const args = process.argv.slice(2);
const limitAt = args.indexOf("--limit");
const limit = limitAt >= 0 ? Number(args[limitAt + 1]) || Infinity : Infinity;

async function main() {
  const { db, schema } = await import("../lib/db");
  const { backfillCanvasShots, getDesignMdIndex } = await import("../lib/design-store");
  const { getPageIndex, savePageShot, addMissingColors } = await import("../lib/page-shots");
  const { capturePage, shotKey } = await import("../lib/screenshot");
  const { getFile } = await import("../lib/storage");
  const { hasOwnPage, normalizeWebUrl } = await import("../lib/url");

  const recut = await backfillCanvasShots((m) => console.log(`DESIGN.md ${m}`));
  console.log(`${recut} DESIGN.md entr${recut === 1 ? "y" : "ies"} cut for the canvas`);
  const colored = await addMissingColors((m) => console.log(`colour ${m}`));
  console.log(`${colored} captures got their colour`);

  const [rows, designIndex, pages] = await Promise.all([
    db.selectDistinct({ web: schema.inspoItem.web }).from(schema.inspoItem),
    getDesignMdIndex(),
    getPageIndex(),
  ]);
  const todo = [...new Set(rows.map((r) => r.web))]
    .filter(hasOwnPage)
    .filter((web) => { const n = normalizeWebUrl(web) ?? web; return !designIndex[n]?.topUrl && !pages[n]; })
    .slice(0, limit);
  console.log(`${todo.length} sites to capture`);

  let done = 0, failed = 0;
  const next = async (): Promise<void> => {
    const web = todo.shift();
    if (!web) return;
    const t0 = Date.now();
    try {
      // A whole page captured earlier on the canvas is reused instead of opening the site again
      const earlier = await getFile(`inspo/shots/${shotKey(web)}-page.jpg`).then((f) => f?.body ?? null).catch(() => null);
      const shot = earlier ? await savePageShot(web, shotKey(web), earlier) : await capturePage(web);
      done++;
      console.log(`✓ ${web} ${shot.shotH}px ${earlier ? "(reused)" : `${((Date.now() - t0) / 1000).toFixed(1)}s`}`);
    } catch (e) {
      failed++;
      console.log(`✗ ${web}: ${e instanceof Error ? e.message : e}`);
    }
    return next();
  };
  await Promise.all(Array.from({ length: Number(process.env.CHROME_CONCURRENCY) }, next));
  console.log(`${done} captured, ${failed} failed`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
