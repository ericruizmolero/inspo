// Takes a piece of content out of every workspace, for a notice that asks for it (the Terms, "Asking us to
// take something down"). Given the address of the original (a post on X, a pin, a page), it finds every
// reference saved from it, in any workspace, and removes them with their copies: the item, its thread, the
// image or video copied from that page, and a post's stored media.
//   npx tsx --conditions=react-server scripts/takedown.ts <url>                 → local database, lists only
//   npx tsx --conditions=react-server scripts/takedown.ts <url> --apply         → local database, deletes
//   npx tsx --conditions=react-server scripts/takedown.ts <url> --prod --apply  → production (PROD_DATABASE_URL and its storage)
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
const args = process.argv.slice(2);
if (args.includes("--prod")) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const apply = args.includes("--apply");
const target = args.find((a) => !a.startsWith("--"));

async function main() {
  const { eq, or, sql } = await import("drizzle-orm");
  const { db, schema } = await import("../lib/db");
  const { normalizeWebUrl, webKeyOf, postOf } = await import("../lib/url");
  const { deleteItems } = await import("../lib/items");
  const { deleteMediaFile } = await import("../lib/media");
  const { listFiles, deleteFiles } = await import("../lib/storage");
  const { POSTS_PREFIX } = await import("../lib/posts");

  const web = target ? normalizeWebUrl(target) : null;
  if (!web) {
    console.log("Usage: npx tsx --conditions=react-server scripts/takedown.ts <url of the original> [--prod] [--apply]");
    process.exit(1);
  }
  const T = schema.inspoItem, O = schema.organization;
  // The page as a reference keeps it in `source`, whatever its protocol, www or trailing slash
  const bare = web.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "").replace(/[\\%_]/g, "\\$&");
  const rows = await db.select({ id: T.id, organizationId: T.organizationId, workspace: O.name, name: T.name, web: T.web, source: T.source })
    .from(T).innerJoin(O, eq(O.id, T.organizationId))
    .where(or(eq(T.webKey, webKeyOf(web)), sql`${T.source} ilike ${`%://${bare}`} or ${T.source} ilike ${`%://${bare}/`} or ${T.source} ilike ${`%://www.${bare}`} or ${T.source} ilike ${`%://www.${bare}/`}`));

  // A post's media is stored once for everyone, apart from the items that point at it
  const post = postOf(web);
  const postFiles = post ? (await listFiles(`${POSTS_PREFIX}${post.id}/`)).map((f) => f.key) : [];

  console.log(`${web}\n${rows.length} reference(s)${post ? `, ${postFiles.length} stored file(s) of the post` : ""}${apply ? "" : " (dry run: add --apply to delete)"}`);
  for (const r of rows) console.log(`  ${r.workspace}  ${r.id}  ${r.name}  ${r.source ? `${r.web} ← ${r.source}` : r.web}`);
  if (!apply) return;

  const byOrg = new Map<string, typeof rows>();
  for (const r of rows) byOrg.set(r.organizationId, [...(byOrg.get(r.organizationId) ?? []), r]);
  let gone = 0;
  for (const [org, list] of byOrg) {
    gone += await deleteItems(org, list.map((r) => r.id));
    // The copied image or video itself: an item's own file, which deleting the item leaves behind
    for (const r of list) await deleteMediaFile(org, r.web);
  }
  if (postFiles.length) await deleteFiles(postFiles);
  console.log(`✓ ${gone} reference(s) deleted${postFiles.length ? `, ${postFiles.length} file(s) of the post deleted` : ""}`);
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
