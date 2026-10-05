// The first references came from the sheet with their thumbnails as files in public/thumbs. Thumbnails live in
// storage now, and that folder (5.8 MB in the repo, shipped with every deploy) is gone: the rows that still point at
// it lose their thumbnail. A site falls back to its page capture; a post on X gets its picture back when it is imported.
//   npx tsx --conditions=react-server scripts/clear-public-thumbs.ts                → local database, count only
//   npx tsx --conditions=react-server scripts/clear-public-thumbs.ts --apply        → local database, writes
//   npx tsx --conditions=react-server scripts/clear-public-thumbs.ts --prod --apply → production (PROD_DATABASE_URL)
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
const args = process.argv.slice(2);
if (args.includes("--prod")) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const apply = args.includes("--apply");

async function main() {
  const { like } = await import("drizzle-orm");
  const { db, pool, schema } = await import("../lib/db");
  const T = schema.inspoItem;
  try {
    const rows = await db.select({ web: T.web, url: T.thumbnailUrl }).from(T).where(like(T.thumbnailUrl, "/thumbs/%"));
    for (const r of rows) console.log(`${r.url}  ${r.web}`);
    if (!apply) { console.log(`${rows.length} rows point at public/thumbs. Add --apply to clear them.`); return; }
    const res = await db.update(T).set({ thumbnailUrl: null, updatedAt: new Date() }).where(like(T.thumbnailUrl, "/thumbs/%"));
    console.log(`cleared ${res.rowCount ?? 0} rows`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
