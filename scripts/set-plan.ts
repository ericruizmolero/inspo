// Changes the plan of a workspace's billing account while there is no payment gateway. Every workspace
// the account pays for moves with it. Through changePlan (lib/plan-change.ts), like /admin/plans: it ends a gift,
// emails the account's owner, and on a move down tells each team left over its seats.
//   npm run plan -- <slug-or-name> <free|duo|studio|agency>
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { eq, or } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { accountOf, accountWorkspaces } from "../lib/workspace-core";
import { isPlanKey, PLANS } from "../lib/plans";
import { changePlan } from "../lib/plan-change";

async function main() {
  const [target, plan] = process.argv.slice(2);
  if (!target || !plan || !isPlanKey(plan)) {
    console.log(`Usage: npm run plan -- <slug-or-name> <${PLANS.map((p) => p.key).join("|")}>`);
    process.exit(1);
  }
  const [org] = await db.select({ id: schema.organization.id, name: schema.organization.name, slug: schema.organization.slug })
    .from(schema.organization).where(or(eq(schema.organization.slug, target), eq(schema.organization.name, target))).limit(1);
  if (!org) { console.log(`No workspace with slug or name "${target}"`); process.exit(1); }
  const account = (await accountOf(org.id))!;
  const appUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const moved = await changePlan({ accountId: account.id, plan, cause: "partner", appUrl });
  const workspaces = await accountWorkspaces(account.id);
  console.log(`✓ ${org.name} (${org.slug}) ${moved?.from} → ${plan}${workspaces.length > 1 ? `, with the ${workspaces.length} workspaces of ${account.name}` : ""}`);
}
void main();
