// Asking for a plan while there is no payment on the site. The account's owner asks from Settings, Plan
// (app/actions/billing.ts requestPlan); a partner charges by hand and sets it, or declines it, from /admin/plans
// (app/actions/plans-admin.ts). One open request per account: asking again replaces it.
import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import type { PlanPeriod } from "./db/schema";
import { planOf, plansAbove, type PlanKey } from "./plans";
import { accountWorkspaces, HttpError, newId, setAccountPlan } from "./workspace-core";
import { listAdmins } from "./activity";
import { localeForEmail, planOnMail, planRequestedMail, planRequestMail, sendMail, type Mail } from "./mail";
import { notifyOverCapacity } from "./quota";
import { fmtPrice } from "./i18n/format";
import { getT } from "./i18n";
import { log } from "./log";

const R = schema.planRequest, B = schema.billingAccount;

/** An account's open request, for Settings, Plan */
export interface PendingPlan { plan: PlanKey; period: PlanPeriod; createdAt: string }

export async function openRequestOf(accountId: string): Promise<PendingPlan | null> {
  const [r] = await db.select({ plan: R.plan, period: R.period, createdAt: R.createdAt }).from(R)
    .where(and(eq(R.billingAccountId, accountId), eq(R.status, "open"))).limit(1);
  return r ? { ...r, createdAt: r.createdAt.toISOString() } : null;
}

/** What Settings, Plan needs to offer a plan: whether this person pays, who does if not, and what is already asked */
export async function planAsk(accountId: string, userId: string): Promise<{ owner: boolean; payer: string | null; pending: PendingPlan | null }> {
  const [[a], pending] = await Promise.all([
    db.select({ ownerUserId: B.ownerUserId, name: schema.user.name, email: schema.user.email }).from(B)
      .leftJoin(schema.user, eq(schema.user.id, B.ownerUserId)).where(eq(B.id, accountId)).limit(1),
    openRequestOf(accountId),
  ]);
  const payer = a?.name && a.email ? `${a.name} (${a.email})` : a?.email ?? null;
  return { owner: a?.ownerUserId === userId, payer, pending };
}

/** A mail that must not undo what was already written: a failure is logged, never thrown */
async function tell(to: string[], m: Mail, what: string): Promise<void> {
  if (!to.length) return;
  try { await sendMail(to, m); } catch (err) { log.warn(`plans.${what}_not_mailed`, { err }); }
}

/**
 * The owner asks for a plan above the account's. A request already open is replaced, so an account never has two:
 * the account's row is locked while it is written. The partners and the person who asked are emailed.
 */
export async function requestPlanFor(r: { accountId: string; user: { id: string; email: string }; plan: PlanKey; period: PlanPeriod; appUrl: string }): Promise<PendingPlan> {
  const { t } = await getT();
  const pending = await db.transaction(async (tx) => {
    const [a] = await tx.select({ plan: B.plan, ownerUserId: B.ownerUserId }).from(B).where(eq(B.id, r.accountId)).for("update");
    if (!a || a.ownerUserId !== r.user.id) throw new HttpError(403, t.quota.notPlanOwner);
    if (!plansAbove(planOf(a.plan).key).some((p) => p.key === r.plan)) throw new HttpError(400, t.quota.notAbove);
    const now = new Date();
    const row = { plan: r.plan, period: r.period, requestedBy: r.user.id, createdAt: now };
    const replaced = await tx.update(R).set(row).where(and(eq(R.billingAccountId, r.accountId), eq(R.status, "open"))).returning({ id: R.id });
    if (!replaced.length) await tx.insert(R).values({ id: newId(), billingAccountId: r.accountId, ...row });
    return { plan: r.plan, period: r.period, createdAt: now.toISOString(), from: planOf(a.plan).key };
  });

  const [account] = await db.select({ name: B.name }).from(B).where(eq(B.id, r.accountId));
  const workspaces = (await accountWorkspaces(r.accountId)).map((w) => w.name);
  const partners = (await listAdmins()).map((a) => a.email);
  // The partners read it in the language of the first on the list, as feedback does
  const partnerLocale = partners.length ? await localeForEmail(partners[0]) : "en";
  const plan = planOf(r.plan);
  await tell(partners, planRequestMail({
    account: account.name, owner: r.user.email, now: pending.from, plan: r.plan, period: r.period,
    price: fmtPrice(r.period === "year" ? plan.price.year : plan.price.month, partnerLocale), workspaces, url: `${r.appUrl}/admin/plans`,
  }, partnerLocale), "request");
  await tell([r.user.email], planRequestedMail(r.plan, r.period, account.name, await localeForEmail(r.user.email)), "request_ack");
  log.info("plans.requested", { billingAccountId: r.accountId, plan: r.plan, period: r.period });
  return { plan: pending.plan, period: pending.period, createdAt: pending.createdAt };
}

/** A row of /admin/plans */
export interface OpenPlanRequest {
  id: string; accountName: string; ownerEmail: string | null; workspaces: string[];
  now: PlanKey; plan: PlanKey; period: PlanPeriod; createdAt: string;
}

/** Every open request, oldest first: the one waiting longest is answered first */
export async function listOpenPlanRequests(): Promise<OpenPlanRequest[]> {
  const rows = await db.select({
    id: R.id, accountId: R.billingAccountId, plan: R.plan, period: R.period, createdAt: R.createdAt,
    accountName: B.name, now: B.plan, ownerEmail: schema.user.email,
  }).from(R).innerJoin(B, eq(B.id, R.billingAccountId)).leftJoin(schema.user, eq(schema.user.id, B.ownerUserId))
    .where(eq(R.status, "open")).orderBy(asc(R.createdAt));
  if (!rows.length) return [];
  const O = schema.organization;
  const spaces = await db.select({ accountId: O.billingAccountId, name: O.name }).from(O)
    .where(inArray(O.billingAccountId, rows.map((r) => r.accountId))).orderBy(asc(O.createdAt));
  return rows.map(({ accountId, now, createdAt, ...r }) => ({
    ...r, now: planOf(now).key, createdAt: createdAt.toISOString(),
    workspaces: spaces.filter((s) => s.accountId === accountId).map((s) => s.name),
  }));
}

export type PlanDecision = "done" | "declined";

/**
 * A partner answers an open request. "done" sets the account's plan in the same transaction that closes the request,
 * so a second click finds nothing open; then whoever asked is emailed, and on a plan with fewer seats than before
 * each workspace left over its seats is told (notifyOverCapacity). "declined" only closes it.
 */
export async function decidePlanRequest(id: string, decision: PlanDecision, by: string, appUrl: string): Promise<{ accountName: string; plan: PlanKey }> {
  const { t } = await getT();
  const closed = await db.transaction(async (tx) => {
    const [row] = await tx.update(R).set({ status: decision, decidedAt: new Date(), decidedBy: by })
      .where(and(eq(R.id, id), eq(R.status, "open")))
      .returning({ accountId: R.billingAccountId, plan: R.plan, requestedBy: R.requestedBy });
    if (!row) throw new HttpError(409, t.admin.plans.gone);
    const [a] = await tx.select({ name: B.name, plan: B.plan }).from(B).where(eq(B.id, row.accountId)).for("update");
    if (decision === "done") await setAccountPlan(row.accountId, row.plan, tx);
    return { ...row, accountName: a.name, before: planOf(a.plan) };
  });

  if (decision === "done") {
    const after = planOf(closed.plan);
    // A request is for a plan above, but the account may have moved since: then this is a downgrade
    if (after.price.month < closed.before.price.month) {
      for (const w of await accountWorkspaces(closed.accountId)) await notifyOverCapacity(w.id, after.key, w.name, appUrl);
    }
    const [who] = closed.requestedBy
      ? await db.select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.id, closed.requestedBy))
      : [];
    if (who) await tell([who.email], planOnMail(after.key, closed.accountName, `${appUrl}/settings/plan`, await localeForEmail(who.email)), "on");
  }
  log.info("plans.decided", { billingAccountId: closed.accountId, plan: closed.plan, decision, by });
  return { accountName: closed.accountName, plan: closed.plan };
}
