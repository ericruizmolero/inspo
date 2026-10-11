// Changes the plan of a workspace's billing account while there is no payment gateway. Every workspace
// the account pays for moves with it.
//   npx tsx scripts/set-plan.ts <slug-or-name> <free|personal|studio|agency>
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { eq, or } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { accountOf, accountWorkspaces, setAccountPlan } from "../lib/workspace-core";
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
  const account = (await accountOf(org.id))!;
  await setAccountPlan(account.id, plan);
  const workspaces = await accountWorkspaces(account.id);
  console.log(`✓ ${org.name} (${org.slug}) → plan ${plan}${workspaces.length > 1 ? `, with the ${workspaces.length} workspaces of ${account.name}` : ""}`);

  // A downgrade can leave a team with more people than it allows. Nobody is removed: owners and admins get
  // notified, and only new invitations wait until they decide. An account left with more workspaces than the plan
  // allows keeps them all; it only cannot add another.
  const appUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  for (const w of workspaces) {
    if (await notifyOverCapacity(w.id, plan, w.name, appUrl)) {
      console.log(`  ⚠ ${w.name} is over the plan limit: owners notified, new invitations on hold`);
    }
  }
}
void main();
