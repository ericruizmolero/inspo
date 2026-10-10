// Adds what the picture shows, area by area (tags_json.look), to the tags made before the tagger wrote it. One call
// per address on the tag task's model, over the picture the tagger already reads: no browser, nothing written to
// storage, only tags_json.look in the LOCAL database. Items that already have a look are skipped, so it can run again.
//   npm run tags:look                          → every item of the local database that lacks one
//   npm run tags:look -- --project <id> --limit 20
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();

const args = process.argv.slice(2);
const arg = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

async function main() {
  if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/criterio")) throw new Error("tags:look only writes the local database");
  const { and, eq, inArray, isNotNull, sql } = await import("drizzle-orm");
  const { db, pool, schema } = await import("../lib/db");
  const { inputsOf, lookWith } = await import("../lib/tagger");
  const { rowToItem } = await import("../lib/items");
  const { mediaKindOf } = await import("../lib/url");
  const { llmEnabled } = await import("../lib/llm");
  if (!llmEnabled()) throw new Error("OPENROUTER_API_KEY is not set");
  const T = schema.inspoItem;

  const project = arg("project");
  const ids = project ? (await db.select({ id: schema.projectItem.itemId }).from(schema.projectItem).where(eq(schema.projectItem.projectId, project))).map((r) => r.id) : null;
  if (ids && !ids.length) throw new Error(`No references in project ${project}`);
  const rows = await db.select().from(T).where(and(isNotNull(T.tagsJson), sql`not (${T.tagsJson} ? 'look')`, ids ? inArray(T.id, ids) : undefined));
  // One call per address: the same site saved in several workspaces gets the same look
  const byWeb = new Map<string, typeof rows>();
  for (const r of rows) if (mediaKindOf(r.web) !== "text") byWeb.set(r.webKey, [...(byWeb.get(r.webKey) ?? []), r]);
  const todo = [...byWeb.values()].slice(0, Number(arg("limit")) || Infinity);
  console.log(`${todo.length} addresses (${todo.reduce((n, g) => n + g.length, 0)} items) without a look`);

  let usd = 0, done = 0, noPicture = 0, failed = 0, next = 0;
  await Promise.all(Array.from({ length: Math.min(4, todo.length) }, async () => {
    while (next < todo.length) {
      const group = todo[next++];
      const item = rowToItem(group[0]);
      try {
        const inputs = await inputsOf(item.web, { capture: false });
        if (!inputs.image) { noPicture++; console.log(`  · ${item.name}: no stored picture`); continue; }
        const r = await lookWith(item, { ...inputs, image: inputs.image });
        usd += r.costUsd ?? 0;
        await db.update(T).set({ tagsJson: sql`jsonb_set(${T.tagsJson}, '{look}', ${JSON.stringify(r.look)}::jsonb)` }).where(inArray(T.id, group.map((g) => g.id)));
        done++;
        console.log(`  ✓ ${item.name} (${group.length}) $${(r.costUsd ?? 0).toFixed(5)}`);
      } catch (e) {
        failed++;
        console.log(`  ✗ ${item.name}: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`);
      }
    }
  }));
  console.log(`${done} looks written, ${noPicture} with no stored picture, ${failed} failed. $${usd.toFixed(4)}`);
  await pool.end();
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
