// Monthly quotas per plan, counted on ai_usage. Server only.
// The plan belongs to the billing account: AI actions, searches and workspaces count across all of its
// workspaces (an agency has one pool for all its clients). Seats count per workspace.
import "server-only";
import { and, eq, gt, gte, inArray, isNull, lt, max, ne, not, notLike, or, sql } from "drizzle-orm";
import { db, schema, type Exec } from "./db";
import { planOf, type Plan, type PlanKey } from "./plans";
import { AUTO_REF, FIRST_REF, type UsageAction } from "./usage-core";
import { accountOf, HttpError, httpErrorResponse, listMembers, type Workspace } from "./workspace-core";
import type { Locale } from "./i18n/locale";
import { getT } from "./i18n";
import { fairUseMail, overCapacityMail, sendMail, localeForEmail } from "./mail";
import { fixedAdmins } from "./activity";
import { mailOnce } from "./mail-once";
import { log } from "./log";
import { isSampleItem } from "./sample-items";
import { fmtGb, mayCreateTeam, roomLeft, whatIsFull, type Full, type Room, type Usage } from "./room";

export interface QuotaLine { used: number; limit: number | null }
export interface QuotaStatus {
  plan: PlanKey;
  /** First day of next month, ISO */
  resetsAt: string;
  /** AI actions: what people asked of the model this month */
  ai: QuotaLine;
  /** On a fair-use plan the limit is the internal ceiling: nobody is cut off at it */
  searches: QuotaLine & { fairUse: boolean };
  members: QuotaLine;
  /** References in the library, the sample project's left out */
  items: QuotaLine;
  /** Bytes of the workspace's own files */
  storage: QuotaLine;
  /** Workspaces the billing account pays for */
  workspaces: QuotaLine;
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
async function countAction(accountId: string, action: "ai" | "jev_search"): Promise<number> {
  if (action === "ai") return countAi(accountId);
  const U = schema.aiUsage;
  const n = action === "jev_search" ? sql<number>`count(distinct lower(trim(${U.ref})))` : sql<number>`count(*)`;
  const [r] = await db.select({ n }).from(U)
    .where(and(inAccount(accountId), eq(U.action, action), gte(U.createdAt, monthStart())));
  return Number(r?.n ?? 0);
}

/**
 * The model calls that count as an AI action: the ones a person asks for (improve with AI, the agent,
 * bringing a brand in). What runs by itself on saving (tags, embeddings, captions) is not here, and neither
 * are the passes logged with an AUTO_REF ref (the board's own re-read after filing a reference and the brand
 * pass chained to a system pass) or a FIRST_REF one (the account's first system pass). One click on "Improve with AI"
 * is one action.
 */
export const AI_ACTIONS: UsageAction[] = ["system", "brand", "polish", "design_md", "design_why", "revise", "explain"];

/** ai_usage rows the account paid for: of any of its workspaces, deleted ones included, while they were in it */
const inAccount = (accountId: string) => eq(schema.aiUsage.billingAccountId, accountId);

async function countAi(accountId: string): Promise<number> {
  const U = schema.aiUsage;
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(U)
    .where(and(inAccount(accountId), inArray(U.action, AI_ACTIONS), gte(U.createdAt, monthStart()),
      or(isNull(U.ref), and(notLike(U.ref, `${AUTO_REF}%`), notLike(U.ref, `${FIRST_REF}%`)))));
  return Number(r?.n ?? 0);
}

/** Whether the account behind this workspace ever had a system pass asked for by hand, its free first one included.
 *  Ever, not this month: the first pass is the first of the account's life */
export async function hadSystemPass(organizationId: string): Promise<boolean> {
  const U = schema.aiUsage, O = schema.organization;
  const [r] = await db.select({ one: sql<number>`1` }).from(U)
    .where(and(sql`${U.billingAccountId} = (select ${O.billingAccountId} from ${O} where ${O.id} = ${organizationId})`, eq(U.action, "system"), or(isNull(U.ref), notLike(U.ref, `${AUTO_REF}%`))))
    .limit(1);
  return !!r;
}

/** Automatic re-reads of this project's board since 00:00 UTC */
export async function autoSystemToday(organizationId: string, projectId: string): Promise<number> {
  const U = schema.aiUsage;
  const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0);
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(U)
    .where(and(eq(U.organizationId, organizationId), eq(U.action, "system"), eq(U.ref, `${AUTO_REF}project:${projectId}`), gte(U.createdAt, midnight)));
  return Number(r?.n ?? 0);
}

/** The project's last system pass asked for by hand (the account's free first one too) and its last brand pass, to
 *  tell a chained brand pass */
export async function brandChain(organizationId: string, projectId: string): Promise<{ systemAt: Date | null; brandAt: Date | null }> {
  const U = schema.aiUsage;
  const last = async (action: UsageAction, refs: string[]) => {
    const [r] = await db.select({ at: max(U.createdAt) }).from(U)
      .where(and(eq(U.organizationId, organizationId), eq(U.action, action), inArray(U.ref, refs)));
    return r?.at ?? null;
  };
  const ref = `project:${projectId}`;
  const [systemAt, brandAt] = await Promise.all([last("system", [ref, `${FIRST_REF}${ref}`]), last("brand", [ref, `${AUTO_REF}${ref}`])]);
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

export async function countWorkspaces(accountId: string, exec: Exec = db): Promise<number> {
  const [r] = await exec.select({ n: sql<number>`count(*)` }).from(schema.organization).where(eq(schema.organization.billingAccountId, accountId));
  return Number(r?.n ?? 0);
}

type QuotaWorkspace = Pick<Workspace, "id" | "plan" | "billingAccountId">;

export async function quotaStatus(ws: QuotaWorkspace): Promise<QuotaStatus> {
  const plan: Plan = planOf(ws.plan);
  const [ai, searches, members, workspaces, pendingInvites, items, bytes] = await Promise.all([
    countAction(ws.billingAccountId, "ai"), countAction(ws.billingAccountId, "jev_search"), countMembers(ws.id),
    countWorkspaces(ws.billingAccountId), countPendingInvitations(ws.id), countItems(ws.id), storageUsed(ws.id),
  ]);
  return {
    plan: plan.key, resetsAt: nextMonth().toISOString(),
    ai: { used: ai, limit: plan.aiActionsPerMonth },
    searches: plan.searches.kind === "capped"
      ? { used: searches, limit: plan.searches.perMonth, fairUse: false }
      : { used: searches, limit: plan.searches.ceiling, fairUse: true },
    members: { used: members, limit: plan.members },
    items: { used: items, limit: plan.itemsMax },
    storage: { used: bytes, limit: plan.storageMaxBytes },
    workspaces: { used: workspaces, limit: plan.workspaces },
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
  const name = t.plans.items[plan.key].name;
  return full === "items" ? t.quota.itemsFull(plan.itemsMax ?? 0, name) : t.quota.storageFull(fmtGb(plan.storageMaxBytes ?? 0, locale), name);
}

/** The plan of a workspace known only by its id: its billing account's */
export async function planIn(organizationId: string): Promise<PlanKey> {
  return planOf((await accountOf(organizationId))?.plan).key;
}

/** assertRoom for code that holds only the workspace's id */
export async function assertRoomIn(organizationId: string, need: { items?: number; bytes?: number }, replacing?: string): Promise<void> {
  await assertRoom({ id: organizationId, plan: await planIn(organizationId) }, need, replacing);
}

/**
 * Why this person may not make another team, or null if they may. A team starts on a free account of its own, and
 * the free workspace each person gets is their personal space: another one takes paying for a plan, that is, owning
 * a billing account on a paid plan. Being an owner of a workspace someone else pays for (an agency's client) is not.
 */
export async function newTeamRefusal(userId: string): Promise<string | null> {
  const B = schema.billingAccount;
  const paying = await db.select({ plan: B.plan }).from(B).where(eq(B.ownerUserId, userId));
  if (mayCreateTeam(paying.map((r) => planOf(r.plan)))) return null;
  return (await getT()).t.quota.secondTeam;
}

export interface OverCapacity { members: number; limit: number; plan: PlanKey }

/**
 * A team can end up with more people than its plan allows after a downgrade.
 * Nobody is removed and the AI keeps working: only new invitations wait (memberLimitMessage)
 * until someone leaves or the plan goes up.
 */
export async function overCapacity(organizationId: string, planKey: string | null | undefined): Promise<OverCapacity | null> {
  const plan = planOf(planKey);
  if (plan.members === null) return null;
  const members = await countMembers(organizationId);
  return members > plan.members ? { members, limit: plan.members, plan: plan.key } : null;
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

/**
 * Throws HttpError(402) if the workspace has used up that action's monthly quota. Searches on a fair-use plan
 * never throw: past the ceiling the team and the account's owner are told, once a month.
 */
/** The first search past the ceiling each month emails the team and the account's owner. Nobody is cut off */
async function fairUsePassed(accountId: string, plan: Plan, used: number, ceiling: number): Promise<void> {
  log.warn("quota.fair_use_passed", { billingAccountId: accountId, plan: plan.key, used, ceiling });
  const key = `fair_use:${accountId}:${monthStart().toISOString().slice(0, 7)}`;
  const B = schema.billingAccount;
  const [a] = await db.select({ name: B.name, owner: schema.user.email }).from(B)
    .leftJoin(schema.user, eq(schema.user.id, B.ownerUserId)).where(eq(B.id, accountId)).limit(1);
  const name = a?.name ?? accountId;
  await mailOnce(key, fixedAdmins(), {
    subject: `${name} passed the fair-use ceiling: ${used} searches this month on ${plan.key}`,
    text: `The ${plan.key} plan's searches are fair use, with an internal ceiling of ${ceiling} a month. ${name} (billing account ${accountId}, owner ${a?.owner ?? "none"}) has made ${used}.\n\nNobody is cut off${a?.owner ? ", and the owner gets an email of their own" : ""}. Its usage is in /admin.`,
  });
  if (a?.owner) await mailOnce(`${key}:owner`, [a.owner], fairUseMail(name, plan.key, used, ceiling, await localeForEmail(a.owner)));
}

export async function assertQuota(ws: QuotaWorkspace, action: "ai" | "jev_search"): Promise<void> {
  const plan = planOf(ws.plan);
  const searches = plan.searches;
  if (action === "jev_search" && searches.kind === "fairUse") {
    const used = await countAction(ws.billingAccountId, action);
    if (used >= searches.ceiling) await fairUsePassed(ws.billingAccountId, plan, used, searches.ceiling);
    return;
  }
  const limit = action === "ai" ? plan.aiActionsPerMonth : searches.kind === "capped" ? searches.perMonth : null;
  if (limit === null) return;
  const used = await countAction(ws.billingAccountId, action);
  if (used >= limit) {
    const { t } = await getT();
    throw new HttpError(402, t.quota.spent(used, limit, t.quota.actions[action], t.plans.items[plan.key].name));
  }
}

/**
 * Throws HttpError(402) if the account already has as many workspaces as its plan allows. Run it in the
 * transaction that adds the workspace, after locking the account's row, so two at once cannot both fit.
 * An account left over the limit by a downgrade keeps every workspace: only adding one is refused.
 */
export async function assertWorkspaceRoom(accountId: string, exec: Exec = db): Promise<void> {
  const [a] = await exec.select({ plan: schema.billingAccount.plan }).from(schema.billingAccount)
    .where(eq(schema.billingAccount.id, accountId)).limit(1);
  const plan = planOf(a?.plan);
  if (plan.workspaces === null || (await countWorkspaces(accountId, exec)) < plan.workspaces) return;
  const { t } = await getT();
  throw new HttpError(402, t.quota.noWorkspaceRoom(t.plans.items[plan.key].name, plan.workspaces));
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
  const allows = t.quota.planAllows(t.plans.items[plan.key].name, t.quota.people(plan.members));
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
    const m = overCapacityMail(`${appUrl.replace(/\/$/, "")}/settings/members`, teamName, over.plan, over.members, over.limit, locale);
    try { await sendMail(emails, m); } catch (err) { log.warn("plan.owner_not_notified", { err }); }
  }
  return true;
}
