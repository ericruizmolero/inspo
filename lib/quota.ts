// Monthly quotas per plan, counted on ai_usage. Server only.
import "server-only";
import { and, eq, gt, gte, lt, or, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { planOf, type Plan, type PlanKey } from "./plans";
import { HttpError, listMembers, type Workspace } from "./workspace-core";
import type { Locale } from "./i18n/locale";
import { getT } from "./i18n";
import { overCapacityMail, sendMail, localeForEmail } from "./mail";

export interface QuotaLine { used: number; limit: number | null }
export interface QuotaStatus {
  plan: PlanKey;
  planName: string;
  priceEur: number;
  /** First day of next month, ISO */
  resetsAt: string;
  designMd: QuotaLine;
  searches: QuotaLine;
  members: QuotaLine;
  /** Sent, unaccepted invitations: they take a seat too */
  pendingInvites: number;
}

function monthStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function nextMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

// The person reads quota messages, so they're in their language

// Searches are counted per distinct query (ref = normalized text), not per
// call: search fires while typing and one intent can produce several
// partial calls. The real cost stays in ai_usage row by row.
async function countAction(organizationId: string, action: string): Promise<number> {
  const U = schema.aiUsage;
  const n = action === "jev_search" ? sql<number>`count(distinct lower(trim(${U.ref})))` : sql<number>`count(*)`;
  const [r] = await db.select({ n }).from(U)
    .where(and(eq(U.organizationId, organizationId), eq(U.action, action), gte(U.createdAt, monthStart())));
  return Number(r?.n ?? 0);
}

export async function countMembers(organizationId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(schema.member).where(eq(schema.member.organizationId, organizationId));
  return Number(r?.n ?? 0);
}

/**
 * Sent invitations not yet accepted, excluding expired ones.
 * They take a seat like a member: otherwise a plan of 5 could send 20
 * invitations and the last 15 would fail on accept with nobody knowing why.
 * `exceptEmail` leaves out one address, which is what resending
 * an invitation needs: the new one replaces the pending one instead of adding to it.
 */
export async function countPendingInvitations(organizationId: string, exceptEmail?: string): Promise<number> {
  const I = schema.invitation;
  const conds = [eq(I.organizationId, organizationId), eq(I.status, "pending"), gt(I.expiresAt, new Date())];
  if (exceptEmail) conds.push(sql`lower(${I.email}) <> ${exceptEmail.trim().toLowerCase()}`);
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(I).where(and(...conds));
  return Number(r?.n ?? 0);
}

export async function quotaStatus(ws: Pick<Workspace, "id" | "plan">): Promise<QuotaStatus> {
  const plan: Plan = planOf(ws.plan);
  const [designMd, searches, members, pendingInvites] = await Promise.all([
    countAction(ws.id, "design_md"), countAction(ws.id, "jev_search"), countMembers(ws.id), countPendingInvitations(ws.id),
  ]);
  return {
    plan: plan.key, planName: plan.name, priceEur: plan.priceEur, resetsAt: nextMonth().toISOString(),
    designMd: { used: designMd, limit: plan.designMdPerMonth },
    searches: { used: searches, limit: plan.searchesPerMonth },
    members: { used: members, limit: plan.members },
    pendingInvites,
  };
}

export interface OverCapacity { members: number; limit: number; planName: string }

/**
 * A team can end up with more people than its plan allows after a downgrade.
 * We don't kick anyone out: destroying data over a charge isn't an option. Invitations
 * and AI actions are blocked, and the owner decides.
 */
export async function overCapacity(organizationId: string, planKey: string | null | undefined): Promise<OverCapacity | null> {
  const plan = planOf(planKey);
  if (plan.members === null) return null;
  const members = await countMembers(organizationId);
  return members > plan.members ? { members, limit: plan.members, planName: plan.name } : null;
}

/** Throws HttpError(402) if the team exceeds its plan's seat count. */
/** For route handlers: null to continue, or the error response with `quota: true`. */
export async function quotaBlock(check: Promise<void>): Promise<Response | null> {
  try {
    await check;
    return null;
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message, quota: true }, { status: e.status });
    throw e;
  }
}

export async function assertSeatsOk(ws: Pick<Workspace, "id" | "plan">): Promise<void> {
  const over = await overCapacity(ws.id, ws.plan);
  if (!over) return;
  const { t } = await getT();
  throw new HttpError(402, t.quota.overSeats(t.quota.people(over.members), over.planName, over.limit));
}

/** Throws HttpError(402) if the workspace has used up that action's monthly quota. */
export async function assertQuota(ws: Pick<Workspace, "id" | "plan">, action: "design_md" | "jev_search"): Promise<void> {
  await assertSeatsOk(ws);
  const plan = planOf(ws.plan);
  const limit = action === "design_md" ? plan.designMdPerMonth : plan.searchesPerMonth;
  if (limit === null) return;
  const used = await countAction(ws.id, action);
  if (used >= limit) {
    const { t } = await getT();
    throw new HttpError(402, t.quota.spent(used, limit, t.quota.actions[action], plan.name));
  }
}

export interface SeatOpts {
  /** Also count unaccepted invitations (on invite, not on accept) */
  includePending?: boolean;
  /** Address that doesn't count as pending, so an invitation can be resent */
  exceptEmail?: string;
}

/** Message for the invitations hook: null if one more person fits. */
export async function memberLimitMessage(organizationId: string, planKey: string | null | undefined, opts: SeatOpts = {}): Promise<string | null> {
  const plan = planOf(planKey);
  if (plan.members === null) return null;
  const [members, pending] = await Promise.all([
    countMembers(organizationId),
    opts.includePending ? countPendingInvitations(organizationId, opts.exceptEmail) : Promise.resolve(0),
  ]);
  if (members + pending < plan.members) return null;
  const { t } = await getT();
  const allows = t.quota.planAllows(plan.name, t.quota.people(plan.members));
  if (pending > 0) {
    return t.quota.withPending(allows, t.quota.people(members), t.quota.pendingInvites(pending));
  }
  return t.quota.movePlan(allows);
}

/**
 * How many members joined before this one, by createdAt with id as tiebreaker.
 * Used for the post-join check: two people can accept the last seat
 * at once, and only those above the limit are removed.
 */
export async function memberRank(organizationId: string, memberId: string): Promise<number> {
  const M = schema.member;
  const [me] = await db.select({ id: M.id, createdAt: M.createdAt }).from(M).where(eq(M.id, memberId)).limit(1);
  if (!me) return 0;
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(M).where(and(
    eq(M.organizationId, organizationId),
    or(lt(M.createdAt, me.createdAt), and(eq(M.createdAt, me.createdAt), lt(M.id, me.id))),
  ));
  return Number(r?.n ?? 0);
}

/**
 * Emails owners and admins that the team exceeds the plan's seat count.
 * Called on plan change (scripts/set-plan.ts). Doesn't throw: an email failure
 * must not break the plan change.
 */
export async function notifyOverCapacity(organizationId: string, planKey: string | null | undefined, teamName: string, appUrl: string): Promise<boolean> {
  const over = await overCapacity(organizationId, planKey);
  if (!over) return false;
  const members = await listMembers(organizationId);
  const to = members.filter((m) => m.role.split(",")[0] !== "member").map((m) => m.email);
  if (!to.length) return false;
  // One email per language: owners don't necessarily share one
  const byLocale = new Map<Locale, string[]>();
  for (const email of to) {
    const locale = await localeForEmail(email);
    byLocale.set(locale, [...(byLocale.get(locale) ?? []), email]);
  }
  for (const [locale, emails] of byLocale) {
    const m = overCapacityMail(`${appUrl.replace(/\/$/, "")}/settings/members`, teamName, over.planName, over.members, over.limit, locale);
    try { await sendMail(emails, m.subject, m.html, m.text); } catch (e) { console.error("[plan] could not notify the owner:", e); }
  }
  return true;
}
