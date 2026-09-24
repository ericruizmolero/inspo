// Runs the "why it's here" builder against a site that already has a local DESIGN.md,
// with the voices from the local database. Not a test: prints what the model returns.
//   npx tsx --conditions=react-server --env-file=.env.local scripts/check-why.ts <url> [org] [--voice "text"] [--probe-only]
import { promises as fs } from "fs";
import path from "path";
import { buildWhy, type Voice } from "../lib/design-why";
import { probeSite, listCandidates } from "../lib/design-probe";
import { keyFor } from "../lib/design-store";
import { db, schema } from "../lib/db";
import { and, asc, eq } from "drizzle-orm";

async function main() {
const args = process.argv.slice(2);
const url = args[0];
const org = (args[1] && !args[1].startsWith("--")) ? args[1] : "1699aa83b7bc47cdb5b4d94c";
const manual = args.includes("--voice") ? args[args.indexOf("--voice") + 1] : null;
const probeOnly = args.includes("--probe-only");
if (args.includes("--candidates")) { for (const c of await listCandidates(url)) if (c.role === "landmark" || c.box.x < 300) console.log(JSON.stringify(c)); return; }
if (!url) throw new Error("url?");

const voices: Voice[] = [];
if (manual) voices.push({ author: "Eric", body: manual, at: new Date().toISOString(), kind: "note" });
else {
  const [item] = await db.select().from(schema.inspoItem).where(and(eq(schema.inspoItem.organizationId, org), eq(schema.inspoItem.web, url))).limit(1);
  if (!item) throw new Error("item not in that workspace");
  if (item.note.trim()) voices.push({ author: item.author, body: item.note.trim(), at: item.createdAt.toISOString(), kind: "note" });
  const comments = await db.select().from(schema.inspoComment).where(eq(schema.inspoComment.itemId, item.id)).orderBy(asc(schema.inspoComment.createdAt));
  for (const c of comments) if (c.body.trim()) voices.push({ author: c.authorName, body: c.body.trim(), at: c.createdAt.toISOString(), kind: "comment" });
}
console.log("voices:", voices.map((v) => `${v.author}: ${v.body}`));
const tp = Date.now();
const probe = await probeSite(url, voices);
console.log(`probe ${Date.now() - tp}ms:`, JSON.stringify(probe?.summary ?? null, null, 1));
const shotUrls: Record<string, string> = {};
if (probe) {
  const dir = process.env.SHOT_DIR || "/tmp";
  for (const c of probe.captures) { const f = path.join(dir, `why-${c.id}.jpg`); await fs.writeFile(f, c.jpeg); shotUrls[c.id] = f; console.log(`  capture ${c.id} (${c.hint}) y=${c.box.y} h=${c.box.h} → ${f}`); }
  for (const t of probe.targets) for (const e of t.elements) console.log(`  ${t.hint} → <${e.tag}> "${e.text}" changed=${JSON.stringify(e.changed)} audio=${e.audioEvents}`);
}
if (probeOnly) return;
const key = keyFor(url);
const entry = JSON.parse(await fs.readFile(path.join("public/design-md", `${key}.json`), "utf-8"));
const screenshot = await fs.readFile(path.join("public/design-md", `${key}.jpg`)).catch(() => null);
const t0 = Date.now();
const r = await buildWhy({ spec: entry.spec, url, voices, screenshot, probe, shotUrls, locale: "es" });
console.log(`${r.model} ${Date.now() - t0}ms cost ${r.costUsd}`);
console.log(JSON.stringify(r.why, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
