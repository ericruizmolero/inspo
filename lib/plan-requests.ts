// Asking for a plan while there is no payment on the site. The account's owner asks from Settings, Plan
// (app/actions/billing.ts requestPlan); a partner charges by hand and sets it, or declines it, from /admin/plans
// (app/actions/plans-admin.ts). One open request per account: asking again replaces it. /admin/plans also lists
// every account with its plan, for a partner to change it with no request.
import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema, type Exec } from "./db";
import type { PlanPeriod } from "./db/schema";
import { isPaid, planOf, plansAbove, type PlanKey } from "./plans";
import { accountWorkspaces, HttpError, newId } from "./workspace-core";
import { listAdmins } from "./activity";
import { localeForEmail, planRequestedMail, planRequestMail } from "./mail";
import { changePlan, tell } from "./plan-change";
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

/**
 * What Settings, Plan needs to offer a plan: whether this person pays, who does if not, what is already asked, and
 * the last day of a gifted plan (null for a plan with no end)
 */
export async function planAsk(accountId: string, userId: string): Promise<{ owner: boolean; payer: string | null; pending: PendingPlan | null; until: Date | null }> {
  const [[a], pending] = await Promise.all([
    db.select({ ownerUserId: B.ownerUserId, planUntil: B.planUntil, name: schema.user.name, email: schema.user.email }).from(B)
      .leftJoin(schema.user, eq(schema.user.id, B.ownerUserId)).where(eq(B.id, accountId)).limit(1),
    openRequestOf(accountId),
  ]);
  const payer = a?.name && a.email ? `${a.name} (${a.email})` : a?.email ?? null;
  return { owner: a?.ownerUserId === userId, payer, pending, until: a?.planUntil ?? null };
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
  const spaces = await workspaceNames(rows.map((r) => r.accountId));
  return rows.map(({ accountId, now, createdAt, ...r }) => ({
    ...r, now: planOf(now).key, createdAt: createdAt.toISOString(), workspaces: spaces.get(accountId) ?? [],
  }));
}

/** The names of each account's workspaces, oldest first */
async function workspaceNames(accountIds: string[]): Promise<Map<string, string[]>> {
  const O = schema.organization;
  const rows = accountIds.length ? await db.select({ accountId: O.billingAccountId, name: O.name }).from(O)
    .where(inArray(O.billingAccountId, accountIds)).orderBy(asc(O.createdAt)) : [];
  const names = new Map<string, string[]>();
  for (const r of rows) names.set(r.accountId, [...(names.get(r.accountId) ?? []), r.name]);
  return names;
}

/** A row of /admin/plans' Accounts */
export interface AccountPlan {
  id: string; name: string; ownerEmail: string | null; workspaces: string[];
  plan: PlanKey;
  /** The plan's last day, for a gift or a plan a partner gave an end; null when it has none */
  until: string | null;
}

/** Every account: the paid ones first, then the newest */
export async function listAccountPlans(): Promise<AccountPlan[]> {
  const rows = await db.select({ id: B.id, name: B.name, plan: B.plan, until: B.planUntil, ownerEmail: schema.user.email })
    .from(B).leftJoin(schema.user, eq(schema.user.id, B.ownerUserId)).orderBy(desc(B.createdAt));
  const spaces = await workspaceNames(rows.map((r) => r.id));
  const accounts = rows.map(({ until, plan, ...r }) => ({
    ...r, plan: planOf(plan).key, until: until?.toISOString() ?? null, workspaces: spaces.get(r.id) ?? [],
  }));
  return accounts.toSorted((a, b) => Number(isPaid(planOf(b.plan))) - Number(isPaid(planOf(a.plan))));
}

export type PlanDecision = "done" | "declined";

/**
 * A partner answers an open request. "done" sets the account's plan through changePlan (lib/plan-change.ts), which
 * mails the owner and, if the account moved above it since, tells the teams left over their seats; the request is
 * closed in the same transaction, so a second click finds nothing open. "declined" only closes it.
 */
export async function decidePlanRequest(id: string, decision: PlanDecision, by: string, appUrl: string): Promise<{ accountName: string; plan: PlanKey }> {
  const { t } = await getT();
  const [open] = await db.select({ accountId: R.billingAccountId, plan: R.plan, accountName: B.name }).from(R)
    .innerJoin(B, eq(B.id, R.billingAccountId)).where(and(eq(R.id, id), eq(R.status, "open")));
  if (!open) throw new HttpError(409, t.admin.plans.gone);
  const close = async (tx: Exec) => {
    const closed = await tx.update(R).set({ status: decision, decidedAt: new Date(), decidedBy: by })
      .where(and(eq(R.id, id), eq(R.status, "open"))).returning({ id: R.id });
    if (!closed.length) throw new HttpError(409, t.admin.plans.gone);
  };
  if (decision === "done") await changePlan({ accountId: open.accountId, plan: open.plan, cause: "partner", appUrl, alongside: close });
  else await db.transaction(close);
  log.info("plans.decided", { billingAccountId: open.accountId, plan: open.plan, decision, by });
  return { accountName: open.accountName, plan: open.plan };
}
