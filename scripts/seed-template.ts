// Loads a template into a workspace from a folder with system.json (name, template, summary, areas with
// decision, why and never) and receta.md (the recipe). Writes to the DATABASE_URL in .env.local.
//   npx tsx --conditions=react-server scripts/seed-template.ts docs/templates/multiverse <workspaceId> [authorUserId]
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  const [dir, organizationId, authorId] = process.argv.slice(2);
  if (!dir || !organizationId) throw new Error("usage: seed-template.ts <folder> <workspaceId> [authorUserId]");
  const { db, schema } = await import("../lib/db");
  const { newId } = await import("../lib/workspace-core");
  const { and, eq } = await import("drizzle-orm");
  const spec = JSON.parse(readFileSync(join(dir, "system.json"), "utf8")) as {
    name: string; template: { from: string; to: string; about: string }; summary: string;
    areas: Record<string, { decision: string; why: string; never: string[] }>;
  };
  const recipe = (() => { try { return readFileSync(join(dir, "receta.md"), "utf8"); } catch { return ""; } })();
  const P = schema.project, S = schema.projectSystem, A = schema.systemArea;
  const now = new Date();
  // Loading the same template again replaces it
  const [old] = await db.select({ id: P.id }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.name, spec.name))).limit(1);
  if (old) await db.delete(P).where(eq(P.id, old.id));
  const id = newId();
  await db.insert(P).values({ id, organizationId, name: spec.name, createdBy: authorId ?? null, template: spec.template, recipe, createdAt: now, updatedAt: now });
  await db.insert(S).values({ projectId: id, organizationId, summary: spec.summary, runJson: null, createdAt: now, updatedAt: now });
  for (const [area, a] of Object.entries(spec.areas)) {
    await db.insert(A).values({ projectId: id, organizationId, area, decision: a.decision, confidence: 100, evidence: [], source: "team", decidedBy: authorId ?? null, why: a.why, never: a.never.join("\n"), updatedAt: now });
  }
  console.log(`${old ? "replaced" : "created"} template "${spec.name}" (${id}) in ${organizationId}: ${Object.keys(spec.areas).length} areas, recipe ${recipe.length} chars`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
