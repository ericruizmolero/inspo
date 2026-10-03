// Moves every saved post from X to the day it was published. Imports used to date each post on
// the day they ran, so a whole import piled up on one day, in reverse order. The day comes from the
// post as stored when it was imported (posts/<id>/post.json); a post never stored is left alone.
//   npx tsx scripts/redate-posts.ts                → local database, count only
//   npx tsx scripts/redate-posts.ts --apply        → local database, writes
//   npx tsx scripts/redate-posts.ts --prod --apply → production (PROD_DATABASE_URL and its storage)
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
const args = process.argv.slice(2);
if (args.includes("--prod")) {
  process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
}
const apply = args.includes("--apply");

async function main() {
  const { eq } = await import("drizzle-orm");
  const { db, schema } = await import("../lib/db");
  const { postOf } = await import("../lib/url");
  const { getStoredPost, postDay } = await import("../lib/posts");
  const T = schema.inspoItem;
  const rows = await db.select({ id: T.id, web: T.web, date: T.date, name: T.name }).from(T);
  const posts = rows.filter((r) => postOf(r.web));
  let moved = 0, same = 0, unknown = 0;
  for (const r of posts) {
    const post = await getStoredPost(postOf(r.web)!.id);
    const day = post && postDay(post);
    if (!day) { unknown++; continue; }
    if (day === r.date) { same++; continue; }
    moved++;
    console.log(`${apply ? "·" : "would move"} ${r.date} → ${day}  ${r.name.slice(0, 60)}`);
    if (apply) await db.update(T).set({ date: day, updatedAt: new Date() }).where(eq(T.id, r.id));
  }
  console.log(`${posts.length} posts: ${moved} ${apply ? "moved" : "to move"}, ${same} already on their day, ${unknown} not stored (left alone)${apply ? "" : ". Add --apply to write."}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
