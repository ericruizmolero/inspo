// Monthly quotas per plan, counted on ai_usage. Server only.
import "server-only";
import { and, eq, gt, gte, inArray, isNull, lt, max, ne, not, notLike, or, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { planOf, type Plan, type PlanKey } from "./plans";
import { AUTO_REF, type UsageAction } from "./usage-core";
import { HttpError, httpErrorResponse, listMembers, type Workspace } from "./workspace-core";
import type { Locale } from "./i18n/locale";
import { getT } from "./i18n";
import { overCapacityMail, sendMail, localeForEmail } from "./mail";
import { log } from "./log";
import { isSampleItem } from "./sample-items";
import { fmtGb, mayCreateTeam, roomLeft, whatIsFull, type Full, type Room, type Usage } from "./room";

export interface QuotaLine { used: number; limit: number | null }
export interface QuotaStatus {
  plan: PlanKey;
  planName: string;
  priceEur: number;
  /** First day of next month, ISO */
  resetsAt: string;
  /** AI actions: what people asked of the model this month */
  ai: QuotaLine;
  searches: QuotaLine;
  members: QuotaLine;
  /** References in the library, the sample project's left out */
  items: QuotaLine;
  /** Bytes of the workspace's own files */
  storage: QuotaLine;
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
async function countAction(organizationId: string, action: "ai" | "jev_search"): Promise<number> {
  if (action === "ai") return countAi(organizationId);
  const U = schema.aiUsage;
  const n = action === "jev_search" ? sql<number>`count(distinct lower(trim(${U.ref})))` : sql<number>`count(*)`;
  const [r] = await db.select({ n }).from(U)
    .where(and(eq(U.organizationId, organizationId), eq(U.action, action), gte(U.createdAt, monthStart())));
  return Number(r?.n ?? 0);
}

/**
 * The model calls that count as an AI action: the ones a person asks for (improve with AI, the agent,
 * bringing a brand in). What runs by itself on saving (tags, embeddings, captions) is not here, and neither
 * are the passes logged with an AUTO_REF ref: the board's own re-read after filing a reference and the brand
 * pass chained to a system pass. One click on "Improve with AI" is one action.
 */
export const AI_ACTIONS: UsageAction[] = ["system", "brand", "polish", "design_md", "design_why", "revise", "explain"];

async function countAi(organizationId: string): Promise<number> {
  const U = schema.aiUsage;
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(U)
    .where(and(eq(U.organizationId, organizationId), inArray(U.action, AI_ACTIONS), gte(U.createdAt, monthStart()),
      or(isNull(U.ref), notLike(U.ref, `${AUTO_REF}%`))));
  return Number(r?.n ?? 0);
}

/** Automatic re-reads of this project's board since 00:00 UTC */
export async function autoSystemToday(organizationId: string, projectId: string): Promise<number> {
  const U = schema.aiUsage;
  const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0);
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(U)
    .where(and(eq(U.organizationId, organizationId), eq(U.action, "system"), eq(U.ref, `${AUTO_REF}project:${projectId}`), gte(U.createdAt, midnight)));
  return Number(r?.n ?? 0);
}

/** The project's last counted system pass and its last brand pass, to tell a chained brand pass */
export async function brandChain(organizationId: string, projectId: string): Promise<{ systemAt: Date | null; brandAt: Date | null }> {
  const U = schema.aiUsage;
  const last = async (action: UsageAction, refs: string[]) => {
    const [r] = await db.select({ at: max(U.createdAt) }).from(U)
      .where(and(eq(U.organizationId, organizationId), eq(U.action, action), inArray(U.ref, refs)));
    return r?.at ?? null;
  };
  const ref = `project:${projectId}`;
  const [systemAt, brandAt] = await Promise.all([last("system", [ref]), last("brand", [ref, `${AUTO_REF}${ref}`])]);
  return { systemAt, brandAt };
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
  const [ai, searches, members, pendingInvites, items, bytes] = await Promise.all([
    countAction(ws.id, "ai"), countAction(ws.id, "jev_search"), countMembers(ws.id), countPendingInvitations(ws.id),
    countItems(ws.id), storageUsed(ws.id),
  ]);
  return {
    plan: plan.key, planName: plan.name, priceEur: plan.priceEur, resetsAt: nextMonth().toISOString(),
    ai: { used: ai, limit: plan.aiActionsPerMonth },
    searches: { used: searches, limit: plan.searchesPerMonth },
    members: { used: members, limit: plan.members },
    items: { used: items, limit: plan.itemsMax },
    storage: { used: bytes, limit: plan.storageMaxBytes },
    pendingInvites,
  };
}

/** References the plan counts: all of the workspace's but the ones a template brought */
export async function countItems(organizationId: string): Promise<number> {
  const T = schema.inspoItem;
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(T).where(and(eq(T.organizationId, organizationId), not(isSampleItem())));
  return Number(r?.n ?? 0);
}

/** Bytes the workspace's files take. `except` leaves one key out: the file about to be written over */
export async function storageUsed(organizationId: string, except?: string): Promise<number> {
  const F = schema.storedFile;
  const [r] = await db.select({ n: sql<string>`coalesce(sum(${F.bytes}), 0)` }).from(F)
    .where(and(eq(F.organizationId, organizationId), except ? ne(F.key, except) : undefined));
  return Number(r?.n ?? 0);
}

/** What the workspace can still add: references and bytes, null where the plan has no cap */
export async function roomOf(ws: Pick<Workspace, "id" | "plan">, replacing?: string): Promise<Room> {
  const plan = planOf(ws.plan);
  const used: Usage = {
    items: plan.itemsMax === null ? 0 : await countItems(ws.id),
    bytes: plan.storageMaxBytes === null ? 0 : await storageUsed(ws.id, replacing),
  };
  return roomLeft(plan, used);
}

/**
 * Throws HttpError(402) when `need` does not fit in the plan: references or bytes. Viewing, searching and exporting
 * never come here, so a full workspace keeps them. `replacing` is the key of a file being written over: its old
 * bytes don't count twice.
 */
export async function assertRoom(ws: Pick<Workspace, "id" | "plan">, need: { items?: number; bytes?: number }, replacing?: string): Promise<void> {
  const plan = planOf(ws.plan);
  const counts = (need.items && plan.itemsMax !== null) || (need.bytes && plan.storageMaxBytes !== null);
  if (!counts) return;
  const full = whatIsFull(await roomOf(ws, replacing), need);
  if (full) throw new HttpError(402, await fullMessage(plan, full));
}

/** What a person reads when the plan has no room left, in their language */
export async function fullMessage(plan: Plan, full: Full): Promise<string> {
  const { t, locale } = await getT();
  return full === "items" ? t.quota.itemsFull(plan.itemsMax ?? 0, plan.name) : t.quota.storageFull(fmtGb(plan.storageMaxBytes ?? 0, locale), plan.name);
}

/** The plan of a workspace known only by its id */
export async function planIn(organizationId: string): Promise<PlanKey> {
  const [org] = await db.select({ plan: schema.organization.plan }).from(schema.organization).where(eq(schema.organization.id, organizationId)).limit(1);
  return planOf(org?.plan).key;
}

/** assertRoom for code that holds only the workspace's id */
export async function assertRoomIn(organizationId: string, need: { items?: number; bytes?: number }, replacing?: string): Promise<void> {
  await assertRoom({ id: organizationId, plan: await planIn(organizationId) }, need, replacing);
}

/**
 * Why this person may not make another team, or null if they may. A team starts on the free plan, and the free
 * workspace each person gets is their personal space: another one takes a workspace they own on a paid plan.
 */
export async function newTeamRefusal(userId: string): Promise<string | null> {
  const M = schema.member, O = schema.organization;
  const owned = await db.select({ plan: O.plan, role: M.role }).from(M).innerJoin(O, eq(O.id, M.organizationId)).where(eq(M.userId, userId));
  if (mayCreateTeam(owned.filter((r) => r.role.split(",").includes("owner")).map((r) => planOf(r.plan)))) return null;
  return (await getT()).t.quota.secondTeam;
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

/** For route handlers: null to continue, or the error response with `quota: true`. */
export async function quotaBlock(check: Promise<void>): Promise<Response | null> {
  try {
    await check;
    return null;
  } catch (e) {
    if (e instanceof HttpError) return httpErrorResponse(e);
    throw e;
  }
}

/** Throws HttpError(402) if the team exceeds its plan's seat count. */
export async function assertSeatsOk(ws: Pick<Workspace, "id" | "plan">): Promise<void> {
  const over = await overCapacity(ws.id, ws.plan);
  if (!over) return;
  const { t } = await getT();
  throw new HttpError(402, t.quota.overSeats(t.quota.people(over.members), over.planName, over.limit));
}

/** Throws HttpError(402) if the workspace has used up that action's monthly quota. */
export async function assertQuota(ws: Pick<Workspace, "id" | "plan">, action: "ai" | "jev_search"): Promise<void> {
  await assertSeatsOk(ws);
  const plan = planOf(ws.plan);
  const limit = action === "ai" ? plan.aiActionsPerMonth : plan.searchesPerMonth;
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
    try { await sendMail(emails, m); } catch (err) { log.warn("plan.owner_not_notified", { err }); }
  }
  return true;
}
