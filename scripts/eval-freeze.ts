// Freezes a project of the LOCAL database as a golden-set fixture for npm run eval:system: its board as the
// system pass reads it, its brief and comments, what the sites measured, and what the team decided.
// The team's decisions become what the eval expects: they are taken out of the system the model reads (the
// references filed under them and the "never" lines stay), and the judge compares the model's areas with them.
// Edit "expect" by hand to say what the team expects of an area nobody decided: freezing again keeps what the file
// already expects. Each picture the contact sheet would show is frozen as the storage key it is read from, never its
// bytes (the repo is public); what the look pass sees is not frozen, the eval computes it.
//   npm run eval:freeze -- <project id> <slug> [output language: es, en…]
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { promises as fs } from "fs";
import { eq, inArray } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { loadSnapshot, sheetRefs } from "../lib/system";
import { clientSiteOf } from "../lib/brand";
import { projectClient } from "../lib/brand-store";
import { getDesignMd } from "../lib/design-store";
import { mediaKindOf } from "../lib/url";
import type { EvalFixture } from "./eval-system";

async function main() {
  const [projectId, slug, language = "es"] = process.argv.slice(2);
  if (!projectId || !slug) throw new Error("npm run eval:freeze -- <project id> <slug> [language]");
  if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/criterio")) throw new Error("eval:freeze only reads the local database");

  const [p] = await db.select({ organizationId: schema.project.organizationId }).from(schema.project).where(eq(schema.project.id, projectId));
  if (!p) throw new Error(`No project ${projectId}`);
  const { snapshot, refs, current } = await loadSnapshot(p.organizationId, projectId);
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

  const file = `scripts/fixtures/system/${slug}.json`;
  const before = await fs.readFile(file, "utf8").then((t) => (JSON.parse(t) as EvalFixture).expect, () => ({}));
  const pictures = await sheetRefs(refs, current.areas, snapshot.brief?.clientItemId);
  const fixture: EvalFixture = {
    slug, language, frozenAt: new Date().toISOString().slice(0, 10),
    system: { ...snapshot, standing },
    sites,
    clientSite: client && clientSpec ? clientSiteOf(client.web, clientSpec) : null,
    expect: { ...expect, ...before },
    pictures,
  };
  await fs.writeFile(file, JSON.stringify(fixture, null, 1) + "\n");
  const refsOut = snapshot.refs.filter((r) => r.kind !== "text");
  console.log(`${file}: ${refs.length} references, ${Object.keys(sites).length} measured sites, ${refsOut.filter((r) => r.measured).length} with measured, ${refsOut.filter((r) => r.look_by_area).length} with look_by_area, ${pictures.length} pictures, ${Object.keys(fixture.expect).length} areas expected (${Object.keys(before).length} kept from the file)`);
  await pool.end();
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
