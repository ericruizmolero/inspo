// Files every reference that is in no project into its workspace's first project (the oldest one that is not a
// template). A library with references outside every project stops making sense once everything lives in projects.
// A workspace with no project gets one ("Mi primer proyecto") and its references go there.
//   npx tsx scripts/file-unfiled.ts                        → local database, count only
//   npx tsx scripts/file-unfiled.ts --apply                → local database, writes
//   npx tsx scripts/file-unfiled.ts --into "Landing Savvia" --apply → local, into that project by name instead
//   npx tsx scripts/file-unfiled.ts --prod --apply         → production (PROD_DATABASE_URL)
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
const args = process.argv.slice(2);
if (args.includes("--prod")) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const apply = args.includes("--apply");
const into = args.includes("--into") ? args[args.indexOf("--into") + 1] : null;
const FIRST_NAME = "Mi primer proyecto";

async function main() {
  const { and, asc, eq, isNull, notExists } = await import("drizzle-orm");
  const { db, schema } = await import("../lib/db");
  const { newId } = await import("../lib/workspace-core");
  const { inspoItem, project, projectItem, organization } = schema;

  const unfiled = await db.select({ id: inspoItem.id, org: inspoItem.organizationId, by: inspoItem.createdBy })
    .from(inspoItem)
    .where(notExists(db.select({ x: projectItem.itemId }).from(projectItem).where(eq(projectItem.itemId, inspoItem.id))));
  const byOrg = new Map<string, typeof unfiled>();
  for (const it of unfiled) byOrg.set(it.org, [...(byOrg.get(it.org) ?? []), it]);
  console.log(`${unfiled.length} references in no project, in ${byOrg.size} workspaces${apply ? "" : " (count only; add --apply to file them)"}`);

  let filed = 0;
  for (const [orgId, items] of byOrg) {
    const [org] = await db.select({ name: organization.name }).from(organization).where(eq(organization.id, orgId));
    const [target] = await db.select({ id: project.id, name: project.name }).from(project)
      .where(and(eq(project.organizationId, orgId), isNull(project.template), ...(into ? [eq(project.name, into)] : [])))
      .orderBy(asc(project.createdAt)).limit(1);
    if (!target && into) { console.log(`· ${org?.name ?? orgId}: ${items.length} references, no project called "${into}": left as they are`); continue; }
    console.log(`· ${org?.name ?? orgId}: ${items.length} → ${target ? `"${target.name}"` : `"${FIRST_NAME}" (new project)`}`);
    if (!apply) continue;
    let projectId = target?.id;
    if (!projectId) {
      // Made by whoever saved most of its references, so it has an author like any other project
      const counts = new Map<string, number>();
      for (const it of items) if (it.by) counts.set(it.by, (counts.get(it.by) ?? 0) + 1);
      const author = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
      const now = new Date();
      projectId = newId();
      await db.insert(project).values({ id: projectId, organizationId: orgId, name: FIRST_NAME, createdBy: author ?? null, createdAt: now, updatedAt: now });
    }
    const now = new Date();
    for (let i = 0; i < items.length; i += 500) {
      await db.insert(projectItem)
        .values(items.slice(i, i + 500).map((it) => ({ projectId: projectId!, itemId: it.id, organizationId: orgId, addedBy: it.by ?? null, createdAt: now })))
        .onConflictDoNothing();
    }
    filed += items.length;
  }
  if (apply) console.log(`${filed} filed.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
