// One-time move of every file from Vercel Blob to R2, and of every reference to them.
// Dry run by default: it lists what it would do and writes nothing.
//   BLOB_READ_WRITE_TOKEN=… R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=… \
//   DATABASE_URL=postgres://… npm run move:blob-to-r2 [-- --apply]
//
// Keys stay the same (the Blob pathname), so a reference changes only its host:
// https://<store>.private.blob.vercel-storage.com/<key> → /api/files/<key>. That makes the
// rewrite a text replace, and running the script twice harmless: copied files are skipped.
// Two kinds of Blob files change shape, because R2 can overwrite a key in place:
//   inspo/design-md/<key>-<t>.json   → the newest becomes inspo/design-md/<key>.json
//   inspo/design-md-index-<t>.json   → the newest becomes inspo/design-md-index.json
// Remove this script and @vercel/blob once production runs on R2.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();

import { list, type ListBlobResultBlob } from "@vercel/blob";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { fileExists, putFile, putJson, usingR2 } from "../lib/storage";

const APPLY = process.argv.includes("--apply");
const BLOB_HOST = /https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//g;
const ENTRY = /^inspo\/design-md\/([0-9a-f]{16})-(\d+)\.json$/;
const INDEX = /^inspo\/design-md-index-(\d+)\.json$/;

const rewrite = (text: string) => text.replace(BLOB_HOST, "/api/files/");

async function download(b: ListBlobResultBlob): Promise<{ body: Buffer; type: string }> {
  const res = await fetch(b.url, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
  if (!res.ok) throw new Error(`${res.status} downloading ${b.pathname}`);
  return { body: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") || "application/octet-stream" };
}

async function allBlobs(): Promise<ListBlobResultBlob[]> {
  const out: ListBlobResultBlob[] = [];
  let cursor: string | undefined;
  do {
    const r = await list({ cursor, limit: 1000 });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Set BLOB_READ_WRITE_TOKEN (the source)");
  if (!usingR2()) throw new Error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET (the target)");
  console.log(APPLY ? "APPLY: writing to R2 and the database" : "Dry run: nothing is written. Add --apply to do it.");

  const blobs = await allBlobs();
  console.log(`${blobs.length} files in Blob`);

  // The newest version of each DESIGN.md entry, and of the index
  const newestEntry = new Map<string, ListBlobResultBlob>();
  let newestIndex: ListBlobResultBlob | null = null;
  const plain: ListBlobResultBlob[] = [];
  for (const b of blobs) {
    const e = ENTRY.exec(b.pathname), i = INDEX.exec(b.pathname);
    if (e) { const cur = newestEntry.get(e[1]); if (!cur || cur.uploadedAt < b.uploadedAt) newestEntry.set(e[1], b); }
    else if (i) { if (!newestIndex || newestIndex.uploadedAt < b.uploadedAt) newestIndex = b; }
    else plain.push(b);
  }

  let copied = 0, skipped = 0, failed = 0;
  for (const b of plain) {
    try {
      if (await fileExists(b.pathname)) { skipped++; continue; }
      if (APPLY) { const f = await download(b); await putFile(b.pathname, f.body, f.type); }
      copied++;
      if (copied % 50 === 0) console.log(`  ${copied} copied…`);
    } catch (e) {
      failed++;
      console.warn(`  failed ${b.pathname}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`files: ${copied} ${APPLY ? "copied" : "to copy"}, ${skipped} already in R2, ${failed} failed`);

  // JSON with URLs inside: rewritten on the way
  const jsons: [ListBlobResultBlob, string][] = [...newestEntry].map(([k, b]) => [b, `inspo/design-md/${k}.json`]);
  if (newestIndex) jsons.push([newestIndex, "inspo/design-md-index.json"]);
  for (const [b, key] of jsons) {
    if (!APPLY) continue;
    const f = await download(b);
    await putJson(key, JSON.parse(rewrite(f.body.toString("utf8"))));
  }
  console.log(`DESIGN.md: ${newestEntry.size} entries${newestIndex ? " and the index" : ""} ${APPLY ? "written" : "to write"} with R2 paths`);

  // References in the database
  const cols: [string, string][] = [
    ["inspo_item", "thumbnail_url"], ["inspo_comment", "attachments"], ["design_why", "why_json"], ["design_revision", "spec_json"],
  ];
  const pattern = "https://[a-z0-9.-]+\\.blob\\.vercel-storage\\.com/";
  for (const [table, col] of cols) {
    const cast = col === "thumbnail_url" ? "" : "::jsonb";
    const where = sql.raw(`"${col}"::text ~ '${pattern}'`);
    const n = Number((await db.execute(sql`select count(*) as n from ${sql.raw(`"${table}"`)} where ${where}`)).rows[0].n);
    if (APPLY && n) {
      await db.execute(sql.raw(`update "${table}" set "${col}" = regexp_replace("${col}"::text, '${pattern}', '/api/files/', 'g')${cast} where "${col}"::text ~ '${pattern}'`));
    }
    console.log(`${table}.${col}: ${n} rows ${APPLY ? "rewritten" : "to rewrite"}`);
  }
  if (failed) process.exitCode = 1;
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; }).finally(() => pool.end());
