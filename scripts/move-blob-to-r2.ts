// One-time move of every file from Vercel Blob to R2, and of every reference to them.
// Dry run by default: it lists what it would do and writes nothing.
//   BLOB_READ_WRITE_TOKEN=… R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=… \
//   DATABASE_URL=postgres://… npm run move:blob-to-r2 [-- --apply]
//   … npm run move:blob-to-r2 -- --verify    → read-only: every /api/files path in the database and in
//                                             the stored JSON exists in R2 (no Blob token needed)
//
// Keys stay the same (the Blob pathname), so a reference changes only its host:
// https://<store>.private.blob.vercel-storage.com/<key> → /api/files/<key>. That makes the
// rewrite a text replace, and running the script twice harmless: copied files are skipped.
// Every other .json file (a saved post's post.json) is copied with the URLs inside rewritten.
// Two kinds of Blob files change shape, because R2 can overwrite a key in place:
//   inspo/design-md/<key>-<t>.json   → the newest becomes inspo/design-md/<key>.json
//   inspo/design-md-index-<t>.json   → the newest becomes inspo/design-md-index.json
// Remove this script and @vercel/blob once production runs on R2.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();

import { list, type ListBlobResultBlob } from "@vercel/blob";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { fileExists, getFile, listFiles, putFile, putJson, usingR2 } from "../lib/storage";

const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");
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

const COLS: [string, string][] = [
  ["inspo_item", "web"], ["inspo_item", "web_key"], ["inspo_item", "thumbnail_url"],
  ["inspo_comment", "attachments"], ["design_why", "why_json"], ["design_revision", "spec_json"],
];
const PATHS = /\/api\/files\/([^"'\s?]+)/g;

/** Read-only: every path the app will ask for exists in R2. web_key is skipped: it is lowercased. */
async function verify() {
  if (!usingR2()) throw new Error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET");
  const refs = new Map<string, string>(); // key → where it was found
  const collect = (text: string, where: string) => { for (const m of text.matchAll(PATHS)) if (!refs.has(m[1])) refs.set(m[1], where); };
  let blobLeft = 0;
  for (const [table, col] of COLS) {
    if (col === "web_key") continue;
    const rows = (await db.execute(sql.raw(`select "${col}"::text as v from "${table}" where "${col}" is not null`))).rows as { v: string }[];
    for (const r of rows) { collect(r.v, `${table}.${col}`); if (BLOB_HOST.test(r.v)) blobLeft++; BLOB_HOST.lastIndex = 0; }
  }
  const jsonKeys = [...(await listFiles("inspo/design-md/")).map((f) => f.key).filter((k) => k.endsWith(".json")), "inspo/design-md-index.json",
    ...(await listFiles("inspo/posts/")).map((f) => f.key).filter((k) => k.endsWith(".json"))];
  for (const k of jsonKeys) {
    const f = await getFile(k);
    if (!f) continue;
    const text = f.body.toString("utf8");
    collect(text, k);
    if (BLOB_HOST.test(text)) blobLeft++;
    BLOB_HOST.lastIndex = 0;
  }
  const missing: [string, string][] = [];
  for (const [key, where] of refs) if (!(await fileExists(decodeURIComponent(key)))) missing.push([key, where]);
  console.log(`${refs.size} files referenced (database and ${jsonKeys.length} stored JSON files), ${missing.length} missing in R2`);
  for (const [key, where] of missing.slice(0, 15)) console.log(`  missing ${key}  (from ${where})`);
  console.log(`${blobLeft} values still point at Vercel Blob`);
  if (missing.length || blobLeft) process.exitCode = 1;
}

async function main() {
  if (VERIFY) return verify();
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Set BLOB_READ_WRITE_TOKEN (the source)");
  if (!usingR2()) throw new Error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET (the target)");
  console.log(APPLY ? "APPLY: writing to R2 and the database" : "Dry run: nothing is written. Add --apply to do it.");

  const blobs = await allBlobs();
  console.log(`${blobs.length} files in Blob`);

  // The newest version of each DESIGN.md entry, and of the index
  // Every version of each DESIGN.md entry and of the index, newest first: the live site may delete
  // the newest one between our listing and our download (it prunes after writing a new one)
  const versions = new Map<string, ListBlobResultBlob[]>();
  const plain: ListBlobResultBlob[] = [];
  for (const b of blobs) {
    const e = ENTRY.exec(b.pathname), i = INDEX.exec(b.pathname);
    const target = e ? `inspo/design-md/${e[1]}.json` : i ? "inspo/design-md-index.json" : null;
    if (target) versions.set(target, [...(versions.get(target) ?? []), b]);
    else plain.push(b);
  }
  for (const list of versions.values()) list.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));

  let copied = 0, skipped = 0, failed = 0;
  for (const b of plain) {
    try {
      if (await fileExists(b.pathname)) { skipped++; continue; }
      if (APPLY) {
        const f = await download(b);
        const body = b.pathname.endsWith(".json") ? Buffer.from(rewrite(f.body.toString("utf8"))) : f.body;
        await putFile(b.pathname, body, f.type);
      }
      copied++;
      if (copied % 50 === 0) console.log(`  ${copied} copied…`);
    } catch (e) {
      failed++;
      console.warn(`  failed ${b.pathname}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`files: ${copied} ${APPLY ? "copied" : "to copy"}, ${skipped} already in R2, ${failed} failed`);

  // JSON with URLs inside: rewritten on the way. The newest version that can still be read wins.
  let written = 0, jsonFailed = 0;
  for (const [key, list] of versions) {
    if (!APPLY) continue;
    let done = false;
    for (const b of list) {
      try {
        const f = await download(b);
        await putJson(key, JSON.parse(rewrite(f.body.toString("utf8"))));
        done = true;
        break;
      } catch { /* gone or broken: try the previous version */ }
    }
    if (done) written++;
    else { jsonFailed++; console.warn(`  failed ${key}: no version could be read`); }
  }
  failed += jsonFailed;
  console.log(`DESIGN.md: ${versions.size} files (entries and index) ${APPLY ? `written: ${written}, failed: ${jsonFailed}` : "to write"} with R2 paths`);

  // References in the database. An uploaded image's address (web) is its file, and web_key is
  // that address lowercased
  const cols = COLS;
  const pattern = "https://[a-z0-9.-]+\\.blob\\.vercel-storage\\.com/";
  for (const [table, col] of cols) {
    const cast = ["web", "web_key", "thumbnail_url"].includes(col) ? "" : "::jsonb";
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
