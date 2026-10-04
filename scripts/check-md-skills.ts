// Prints the skill sections criterio.md gains for real projects in the LOCAL database. No model call.
//   npx tsx --conditions=react-server scripts/check-md-skills.ts [project name] [es|en]
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { ilike } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { getSystem } from "../lib/system";
import { skillSections, MD_SKILLS } from "../lib/md-skills";

async function main() {
  const [what = "%", locale = "es"] = process.argv.slice(2);
  const projects = await db.select().from(schema.project).where(ilike(schema.project.name, what));
  for (const p of projects) {
    const system = await getSystem(p.organizationId, p.id);
    if (!system.areas.some((a) => a.area === "motion" && (a.decision || a.curation))) continue;
    console.log(`\n================ ${p.name} ================\n`);
    for (const s of skillSections(system, MD_SKILLS, locale)) console.log(`## ${s.heading}\n\n${s.lines.join("\n")}`);
  }
  await pool.end();
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
