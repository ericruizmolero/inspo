// Cambia el plan de un workspace mientras no hay pasarela de pago.
//   npx tsx scripts/set-plan.ts <slug-o-nombre> <solo|studio|agencia>
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { eq, or } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { setWorkspacePlan } from "../lib/workspace-core";
import { isPlanKey, PLANS } from "../lib/plans";

async function main() {
  const [target, plan] = process.argv.slice(2);
  if (!target || !plan || !isPlanKey(plan)) {
    console.log(`Uso: npx tsx scripts/set-plan.ts <slug-o-nombre> <${PLANS.map((p) => p.key).join("|")}>`);
    process.exit(1);
  }
  const [org] = await db.select({ id: schema.organization.id, name: schema.organization.name, slug: schema.organization.slug })
    .from(schema.organization).where(or(eq(schema.organization.slug, target), eq(schema.organization.name, target))).limit(1);
  if (!org) { console.log(`No hay ningún workspace con slug o nombre "${target}"`); process.exit(1); }
  await setWorkspacePlan(org.id, plan);
  console.log(`✓ ${org.name} (${org.slug}) → plan ${plan}`);
}
main();
