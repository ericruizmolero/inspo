// Runs the project's system over a real project in the LOCAL database and prints it.
// Costs one model call (a fraction of a cent). Not a test framework: look at the output.
//   npm run check:system -- <project name or id> [es|en]
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { eq, ilike, or } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { runMigrations } from "../lib/db/migrate";
import { runSystem } from "../lib/system";
import { renderCriterioMd } from "../lib/criterio-md";
import { ui as en } from "../lib/i18n/en/ui";
import { ui as es } from "../lib/i18n/es/ui";

async function main() {
  const [what = "Landing Savvia", locale = "es"] = process.argv.slice(2);
  if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/criterio")) throw new Error("check:system only runs against the local database");

  await runMigrations();
  const [p] = await db.select().from(schema.project).where(or(eq(schema.project.id, what), ilike(schema.project.name, what))).limit(1);
  if (!p) throw new Error(`No project "${what}"`);
  const t0 = Date.now();
  const system = await runSystem({ organizationId: p.organizationId, projectId: p.id, usage: { organizationId: p.organizationId }, locale: locale as "es" | "en" });
  console.log(`\n${p.name}: ${Date.now() - t0} ms\n`);
  const items = await db.select({ id: schema.inspoItem.id, name: schema.inspoItem.name, web: schema.inspoItem.web }).from(schema.inspoItem).where(eq(schema.inspoItem.organizationId, p.organizationId));
  const dict = locale === "es" ? es : en;
  console.log(renderCriterioMd({ project: p.name, system, items: Object.fromEntries(items.map((i) => [i.id, i])), labels: dict.system.areas, strings: dict.system.md }));
  await pool.end();
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
