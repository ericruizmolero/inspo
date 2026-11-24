"use server";
// Workspaces inside a billing account, and asking for its plan (Settings, Plan). Only the account's owner adds to it, asks
// or lets a client go: one creates a workspace in it, moves in a team they own that another account pays for, or hands
// a client's workspace a free account of its own (lib/account-workspaces.ts). A team made from the switcher gets an
// account of its own in Better Auth's hook instead (lib/auth.ts).
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withCtx, HttpError, dropEmptyAccount, type Ctx } from "@/lib/workspace";
import { assertWorkspaceRoom } from "@/lib/quota";
import { getErrors, getT } from "@/lib/i18n";
import { isPlanKey } from "@/lib/plans";
import { PLAN_PERIODS, type PlanPeriod } from "@/lib/db/schema";
import { requestPlanFor } from "@/lib/plan-requests";
import { appBase } from "@/lib/admin-action";
import { letWorkspaceGo as letGo, lockAccounts, openTeamInAccount, tellLetGo } from "@/lib/account-workspaces";
import { checkoutUrl, portalUrl } from "@/lib/stripe";

/** The current workspace's account, if the person signed in owns it */
async function ownedAccount(ctx: Ctx): Promise<string> {
  const [a] = await db.select({ ownerUserId: schema.billingAccount.ownerUserId }).from(schema.billingAccount)
    .where(eq(schema.billingAccount.id, ctx.workspace.billingAccountId)).limit(1);
  if (a?.ownerUserId !== ctx.user.id) throw new HttpError(403, (await getT()).t.quota.notAccountOwner);
  return ctx.workspace.billingAccountId;
}

/** A new team workspace in the current workspace's account, with the person as its owner. Returns its id. */
export async function createWorkspaceInAccount(name: string) {
  return withCtx(async (ctx) => {
    const value = name.trim().slice(0, 60);
    if (!value) throw new HttpError(400, (await getErrors()).badBody);
    return { id: await openTeamInAccount(await ownedAccount(ctx), value, ctx.user) };
  });
}

/** The owner asks for a plan above the account's, paid monthly or yearly. It replaces a request already open. */
export async function requestPlan(plan: string, period: string) {
  return withCtx(async (ctx) => {
    if (!isPlanKey(plan) || !(PLAN_PERIODS as readonly string[]).includes(period)) throw new HttpError(400, (await getErrors()).badBody);
    return requestPlanFor({ accountId: ctx.workspace.billingAccountId, user: ctx.user, plan, period: period as PlanPeriod, appUrl: await appBase() });
  });
}

/** The owner pays for a plan: the URL of Stripe's Checkout, or of the portal when the account already pays */
export async function startCheckout(plan: string, period: string) {
  return withCtx(async (ctx) => {
    if (!isPlanKey(plan) || !(PLAN_PERIODS as readonly string[]).includes(period)) throw new HttpError(400, (await getErrors()).badBody);
    const accountId = await ownedAccount(ctx);
    return { url: await checkoutUrl({ accountId, user: ctx.user, plan, period: period as PlanPeriod, appUrl: await appBase(), locale: ctx.user.language }) };
  });
}

/** The owner manages the payment (card, invoices, plan, cancelling) in Stripe's portal: its URL */
export async function openBillingPortal() {
  return withCtx(async (ctx) => ({ url: await portalUrl(await ownedAccount(ctx), await appBase()) }));
}

/**
 * Moves a team the person owns into the current workspace's account. Its old account is deleted if it is left
 * with no workspace and Stripe does not know it.
 */
export async function moveWorkspaceToAccount(workspaceId: string) {
  return withCtx(async (ctx) => {
    const accountId = await ownedAccount(ctx);
    const ws = ctx.workspaces.find((w) => w.id === workspaceId);
    if (!ws || ws.role !== "owner" || ws.kind !== "team" || ws.billingAccountId === accountId) {
      throw new HttpError(403, (await getT()).t.quota.cannotMove);
    }
    await db.transaction(async (tx) => {
      await lockAccounts(tx, [accountId, ws.billingAccountId]);
      await assertWorkspaceRoom(accountId, tx);
      await tx.update(schema.organization).set({ billingAccountId: accountId })
        .where(and(eq(schema.organization.id, ws.id), eq(schema.organization.billingAccountId, ws.billingAccountId)));
      await dropEmptyAccount(ws.billingAccountId, tx);
    });
  });
}

/**
 * Lets a client's workspace go from the current workspace's account, which the person pays: it moves onto a free
 * account its owner owns, keeping everything in it, and its owner gets an email. By id, as Settings, Plan lists the
 * account's workspaces whether or not the payer is in them. Answers nothing of the workspace.
 */
export async function letWorkspaceGo(workspaceId: string) {
  return withCtx(async (ctx) => {
    const gone = await letGo(await ownedAccount(ctx), ctx.user.id, workspaceId);
    await tellLetGo(gone, `${await appBase()}/settings/plan`);
  });
}
