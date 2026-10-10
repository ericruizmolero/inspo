// Fills stored_file for the files written before it existed: every workspace's own files with their size, read from
// storage. A workspace's files all live under inspo/<workspace>/ (media, video, thumbs, comments, text, brand), so one
// listing per workspace finds them, files no row points at included: they take the space all the same. A template's
// files (template-*) are Criterio's and stay out, as their references do. Storage is only read, and each row is an
// upsert, so the run can be repeated. --dry-run reads and prints, and writes nothing.
//   npm run backfill:file-bytes -- --dry-run
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { sql } from "drizzle-orm";

const DRY = process.argv.includes("--dry-run");
const BATCH = 500;

async function main() {
  const { db, pool, schema } = await import("../lib/db");
  const { listFiles, usingR2 } = await import("../lib/storage");
  const F = schema.storedFile;
  console.log(`reading ${usingR2() ? `R2 bucket ${process.env.R2_BUCKET}` : "the local .data/files"}${DRY ? ", writing nothing" : ""}`);

  const orgs = await db.select({ id: schema.organization.id, name: schema.organization.name }).from(schema.organization);
  let files = 0, bytes = 0;
  for (const org of orgs) {
    const own = (await listFiles(`inspo/${org.id}/`)).filter((f) => !f.key.split("/").pop()!.startsWith("template-"));
    if (!own.length) continue;
    const sum = own.reduce((n, f) => n + f.size, 0);
    files += own.length; bytes += sum;
    console.log(`${org.name} (${org.id}): ${own.length} files, ${(sum / 1024 ** 2).toFixed(1)} MB`);
    if (DRY) continue;
    for (let i = 0; i < own.length; i += BATCH) {
      const rows = own.slice(i, i + BATCH).map((f) => ({ key: f.key, organizationId: org.id, bytes: f.size, createdAt: f.uploadedAt }));
      await db.insert(F).values(rows).onConflictDoUpdate({ target: F.key, set: { organizationId: sql.raw("excluded.organization_id"), bytes: sql.raw("excluded.bytes") } });
    }
  }
  console.log(`${files} files, ${(bytes / 1024 ** 3).toFixed(2)} GB in ${orgs.length} workspaces${DRY ? " (dry run)" : ""}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
