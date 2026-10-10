// Freezes a project of the LOCAL database as a golden-set fixture for npm run eval:system: its board as the
// system pass reads it, its brief and comments, what the sites measured, and what the team decided.
// The team's decisions become what the eval expects: they are taken out of the system the model reads (the
// references filed under them and the "never" lines stay), and the judge compares the model's areas with them.
// Edit "expect" by hand to say what the team expects of an area nobody decided.
// --retag tags the board's references again first, with the tagger as it is now and nothing captured (only what
// storage already holds is read), and writes the tags to the LOCAL database: a fixture then carries the current
// tags' signals. It costs one tag call per reference that is not a pasted text.
//   npm run eval:freeze -- <project id> <slug> [output language: es, en…] [--retag]
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { promises as fs } from "fs";
import { eq, inArray } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { loadSnapshot } from "../lib/system";
import { clientSiteOf } from "../lib/brand";
import { projectClient } from "../lib/brand-store";
import { getDesignMd } from "../lib/design-store";
import { mediaKindOf } from "../lib/url";
import { rowToItem } from "../lib/items";
import type { EvalFixture } from "./eval-system";

/** Tags the project's references again (no capture, local database only) */
async function retag(projectId: string) {
  const { inputsOf, tagWith } = await import("../lib/tagger");
  const rows = await db.select({ row: schema.inspoItem }).from(schema.projectItem)
    .innerJoin(schema.inspoItem, eq(schema.inspoItem.id, schema.projectItem.itemId)).where(eq(schema.projectItem.projectId, projectId));
  let usd = 0, out = 0, done = 0;
  for (const { row } of rows) {
    if (mediaKindOf(row.web) === "text") continue;
    try {
      const r = await tagWith(rowToItem(row), await inputsOf(row.web, { capture: false }));
      await db.update(schema.inspoItem).set({ tagsJson: r.tags }).where(eq(schema.inspoItem.id, row.id));
      usd += r.costUsd ?? 0; out += r.usage.output; done++;
      console.log(`  tagged ${row.name}: ${Object.keys(r.tags.areas ?? {}).join(", ") || "no areas"}`);
    } catch (e) {
      console.warn(`  not tagged ${row.name}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`retag: ${done} references, $${usd.toFixed(4)} (${done ? (usd / done).toFixed(5) : 0} a reference, ${done ? Math.round(out / done) : 0} tokens out)`);
}

async function main() {
  const args = process.argv.slice(2);
  const [projectId, slug, language = "es"] = args.filter((a) => !a.startsWith("--"));
  if (!projectId || !slug) throw new Error("npm run eval:freeze -- <project id> <slug> [language]");
  if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/criterio")) throw new Error("eval:freeze only reads the local database");

  const [p] = await db.select({ organizationId: schema.project.organizationId }).from(schema.project).where(eq(schema.project.id, projectId));
  if (!p) throw new Error(`No project ${projectId}`);
  if (args.includes("--retag")) await retag(projectId);
  const { snapshot, refs } = await loadSnapshot(p.organizationId, projectId);
  const items = await db.select({ id: schema.inspoItem.id, web: schema.inspoItem.web, name: schema.inspoItem.name }).from(schema.inspoItem).where(inArray(schema.inspoItem.id, refs.map((r) => r.itemId)));
  const byId = new Map(items.map((i) => [i.id, i]));

  const sites: EvalFixture["sites"] = {};
  for (const r of refs) {
    const item = byId.get(r.itemId)!;
    if (mediaKindOf(item.web) !== "web") continue;
    const spec = (await getDesignMd(item.web).catch(() => null))?.spec;
    if (spec) sites[r.code] = { name: item.name, spec };
  }
  const client = await projectClient(p.organizationId, projectId);
  const clientSpec = client ? (await getDesignMd(client.web).catch(() => null))?.spec : null;

  const expect: EvalFixture["expect"] = {};
  const standing = snapshot.standing.map((a) => {
    if (a.status !== "team" || !a.decision) return a;
    expect[a.area] = a.decision;
    return { area: a.area, status: "empty", evidence: a.evidence, never: a.never };
  });

  const fixture: EvalFixture = {
    slug, language, frozenAt: new Date().toISOString().slice(0, 10),
    system: { ...snapshot, standing },
    sites,
    clientSite: client && clientSpec ? clientSiteOf(client.web, clientSpec) : null,
    expect,
  };
  const file = `scripts/fixtures/system/${slug}.json`;
  await fs.writeFile(file, JSON.stringify(fixture, null, 1) + "\n");
  console.log(`${file}: ${refs.length} references, ${Object.keys(sites).length} measured sites, ${Object.keys(expect).length} areas expected`);
  await pool.end();
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
