// Deletes a workspace by id with lib/workspace-delete.ts, the same function as Settings › Space. Its use: finishing
// a delete whose storage cleanup failed (a `workspace files` row in /admin/failures names the prefix), or a delete
// support does by hand. Runs against DATABASE_URL and the storage lib/storage.ts picks: with R2_* set, that is the
// production bucket. Without --apply it only says what it would delete.
//   npm run workspace:delete -- <id> [--apply]
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { eq } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { listFiles, usingR2 } from "../lib/storage";
import { deleteWorkspace, workspacePrefixes } from "../lib/workspace-delete";

async function main() {
  const id = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!id) throw new Error("usage: npm run workspace:delete -- <id> [--apply]");
  const [org] = await db.select({ name: schema.organization.name, kind: schema.organization.kind }).from(schema.organization).where(eq(schema.organization.id, id));
  const files = (await Promise.all(workspacePrefixes(id).map(listFiles))).flat();
  console.log(`${org ? `${org.name} (${org.kind})` : "no workspace row (already deleted)"}; ${files.length} files in ${usingR2() ? "R2" : ".data/files"}`);
  if (!process.argv.includes("--apply")) { console.log("dry run: add --apply to delete"); return; }
  console.log(await deleteWorkspace(id));
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
