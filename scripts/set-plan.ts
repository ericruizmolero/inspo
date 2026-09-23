// Changes a workspace's plan while there is no payment gateway.
//   npx tsx scripts/set-plan.ts <slug-or-name> <solo|studio|agency>
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
    console.log(`Usage: npx tsx scripts/set-plan.ts <slug-or-name> <${PLANS.map((p) => p.key).join("|")}>`);
    process.exit(1);
  }
  const [org] = await db.select({ id: schema.organization.id, name: schema.organization.name, slug: schema.organization.slug })
    .from(schema.organization).where(or(eq(schema.organization.slug, target), eq(schema.organization.name, target))).limit(1);
  if (!org) { console.log(`No workspace with slug or name "${target}"`); process.exit(1); }
  await setWorkspacePlan(org.id, plan);
  console.log(`✓ ${org.name} (${org.slug}) → plan ${plan}`);

  // A downgrade can leave the team with more people than it allows. Nobody is
  // removed: owners and admins get notified, and the app blocks invitations and AI until they decide.
  const appUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (await notifyOverCapacity(org.id, plan, org.name, appUrl)) {
    console.log("  ⚠ the team is over the plan limit: owners notified, invitations and AI blocked");
  }
}
main();
