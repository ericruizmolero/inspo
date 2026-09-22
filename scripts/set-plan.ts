// Cambia el plan de un workspace mientras no hay pasarela de pago.
//   npx tsx scripts/set-plan.ts <slug-o-nombre> <solo|studio|agencia>
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { eq, or } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { setWorkspacePlan } from "../lib/workspace-core";
import { isPlanKey, PLANS } from "../lib/plans";
import { notifyOverCapacity } from "../lib/quota";

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

  // Bajar de plan puede dejar al equipo con más gente de la que admite. No se quita a
  // nadie: se avisa a los dueños y admins, y la app bloquea invitaciones e IA hasta que decidan.
  const appUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (await notifyOverCapacity(org.id, plan, org.name, appUrl)) {
    console.log("  ⚠ el equipo pasa del límite del plan: avisados los dueños, invitaciones e IA bloqueadas");
  }
}
main();
