// Opening the product by waves (#120): the waitlist as /admin sees it, the invites the team hands out, and how each
// wave did. A wave is no table of its own, only the `wave` name on its invites. Shared by app/actions/waitlist-admin.ts
// and scripts/access.ts.
import "server-only";
import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { sha256 } from "./hash";
import { createInvite, newInviteCode, normalEmail } from "./access";
import { accessInviteMail, localeForEmail, sendMail } from "./mail";
import type { Locale } from "./i18n/locale";
import type { PlanKey } from "./plans";
import type { WaitlistStatus } from "./db/schema";

const W = schema.waitlistEntry;
const I = schema.accessInvite;

/** One wave mails at most this many people: a bigger send hurts the domain's standing with the inboxes. */
export const WAVE_CAP = 50;
/** Resend takes about 2 requests a second */
const SEND_GAP_MS = 600;

export const inviteLink = (baseUrl: string, code: string) => `${baseUrl}/login?invite=${encodeURIComponent(code)}`;

export interface WaitlistRow {
  id: string; email: string; name: string | null; role: string | null; teamSize: string | null; note: string | null;
  source: string; locale: Locale; status: WaitlistStatus; priority: number; createdAt: Date; invitedAt: Date | null;
  /** The wave of the invite they got, if any */
  wave: string | null;
}

const rowFields = {
  id: W.id, email: W.email, name: W.name, role: W.role, teamSize: W.teamSize, note: W.note, source: W.source, locale: W.locale,
  status: W.status, priority: W.priority, createdAt: W.createdAt, invitedAt: W.invitedAt, wave: I.wave,
};
const queue = [desc(W.priority), asc(W.createdAt)];

/** Everyone on the list, in the order a wave would take them. */
export async function listWaitlist(): Promise<WaitlistRow[]> {
  return db.select(rowFields).from(W).leftJoin(I, eq(I.id, W.inviteId)).orderBy(...queue);
}

export async function setPriority(entryId: string, priority: number): Promise<boolean> {
  const done = await db.update(W).set({ priority }).where(eq(W.id, entryId)).returning({ id: W.id });
  return done.length > 0;
}

/** The next `n` people still waiting, highest priority first and then oldest. With `among`, only those entries. */
export async function nextByPriority(n: number, among?: string[]): Promise<WaitlistRow[]> {
  const pending = eq(W.status, "pending");
  return db.select(rowFields).from(W).leftJoin(I, eq(I.id, W.inviteId))
    .where(among ? and(pending, inArray(W.id, among)) : pending)
    .orderBy(...queue).limit(Math.min(n, WAVE_CAP));
}

/** The recipient's language: what they picked on the waitlist, else their account's, else English. */
async function inviteLocale(email: string): Promise<Locale> {
  const [entry] = await db.select({ locale: W.locale }).from(W).where(eq(W.email, normalEmail(email)));
  return entry?.locale ?? localeForEmail(email);
}

/** Throws when the mail does not go out; the invite stays, so it can be resent. */
export async function mailInvite(email: string, code: string, baseUrl: string, locale?: Locale): Promise<void> {
  await sendMail(email, accessInviteMail(inviteLink(baseUrl, code), email, locale ?? await inviteLocale(email)));
}

export interface WaveOptions { wave: string; grantsPlan?: PlanKey | null; grantsUntil?: Date | null }

export type WaveResult =
  | { entryId: string; email: string; status: "sent" | "failed"; inviteId: string; code: string }
  /** No longer waiting when its turn came (someone else invited them, or they joined) */
  | { entryId: string; email: null; status: "skipped" };

/**
 * One invite per person, made out to their email with a single use, and the mail with their link, one after another.
 * Each entry is claimed under a row lock, so two people confirming the same wave never invite anyone twice.
 */
export async function openWave(entryIds: string[], o: WaveOptions, baseUrl: string): Promise<WaveResult[]> {
  const ids = [...new Set(entryIds)];
  if (ids.length > WAVE_CAP) throw new RangeError(`A wave is at most ${WAVE_CAP} people`);
  const results: WaveResult[] = [];
  for (const entryId of ids) {
    const made = await db.transaction(async (tx) => {
      const [entry] = await tx.select({ email: W.email, locale: W.locale }).from(W)
        .where(and(eq(W.id, entryId), eq(W.status, "pending"))).for("update");
      if (!entry) return null;
      const invite = await createInvite({ email: entry.email, wave: o.wave, maxUses: 1, grantsPlan: o.grantsPlan ?? null, grantsUntil: o.grantsUntil ?? null }, tx);
      return { ...entry, ...invite };
    });
    if (!made) { results.push({ entryId, email: null, status: "skipped" }); continue; }
    if (results.some((r) => r.status !== "skipped")) await new Promise((r) => setTimeout(r, SEND_GAP_MS));
    const sent = await mailInvite(made.email, made.code, baseUrl, made.locale).then(() => true, () => false);
    results.push({ entryId, email: made.email, status: sent ? "sent" : "failed", inviteId: made.id, code: made.code });
  }
  return results;
}

/** Takes back an invite that still has a use left. The waitlist entry it was for goes back to waiting. */
export async function revokeInvite(inviteId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [done] = await tx.update(I).set({ revokedAt: new Date() })
      .where(and(eq(I.id, inviteId), isNull(I.revokedAt), lt(I.uses, I.maxUses))).returning({ id: I.id });
    if (!done) return false;
    await tx.update(W).set({ status: "pending", inviteId: null, invitedAt: null })
      .where(and(eq(W.inviteId, inviteId), eq(W.status, "invited")));
    return true;
  });
}

/** A new code for an invite no one has used: the old link stops working. Null when it was used or revoked. */
export async function rotateInvite(inviteId: string): Promise<{ code: string; email: string | null } | null> {
  const code = newInviteCode();
  const [row] = await db.update(I).set({ codeHash: sha256(code) })
    .where(and(eq(I.id, inviteId), eq(I.uses, 0), isNull(I.revokedAt))).returning({ email: I.email });
  return row ? { code, email: row.email } : null;
}

export interface TeamInvite {
  id: string; email: string | null; wave: string | null; uses: number; maxUses: number;
  grantsPlan: PlanKey | null; expiresAt: Date | null; revokedAt: Date | null; createdAt: Date;
}

/** The invites made from /admin or the script (not the ones people hand out), newest first. */
export async function listTeamInvites(): Promise<TeamInvite[]> {
  return db.select({
    id: I.id, email: I.email, wave: I.wave, uses: I.uses, maxUses: I.maxUses, grantsPlan: I.grantsPlan,
    expiresAt: I.expiresAt, revokedAt: I.revokedAt, createdAt: I.createdAt,
  }).from(I).where(isNull(I.createdBy)).orderBy(desc(I.createdAt)).limit(500);
}

export interface WaveMetric {
  /** Null: the loose invites, made without a wave */
  wave: string | null;
  since: Date;
  /** Invites not revoked */
  invited: number;
  /** Accounts created with one of its invites */
  entered: number;
  /** Of those, the ones who made a project of their own. Templates are projects too, so they are left out. */
  activated: number;
  /** Of those who entered, the ones on a paid plan they did not get as a gift from the invite */
  paying: number;
}

/** Invited, entered, activated, paying: one row per wave of team invites, newest first. */
export async function waveMetrics(): Promise<WaveMetric[]> {
  const U = schema.user, P = schema.project, B = schema.billingAccount;
  const made = sql`exists (select 1 from ${P} where ${P.createdBy} = ${U.id} and ${P.template} is null)`;
  const free: PlanKey = "free";
  const pays = sql`${I.grantsPlan} is null and exists (select 1 from ${B} where ${B.ownerUserId} = ${U.id} and ${B.plan} <> ${free})`;
  const since = sql`min(${I.createdAt})`;
  return db.select({
    wave: I.wave,
    since: sql<Date>`${since}`.mapWith(I.createdAt),
    invited: sql<number>`count(distinct ${I.id}) filter (where ${I.revokedAt} is null)`.mapWith(Number),
    entered: sql<number>`count(distinct ${U.id})`.mapWith(Number),
    activated: sql<number>`count(distinct ${U.id}) filter (where ${made})`.mapWith(Number),
    paying: sql<number>`count(distinct ${U.id}) filter (where ${pays})`.mapWith(Number),
  }).from(I).leftJoin(U, eq(U.accessInviteId, I.id)).where(isNull(I.createdBy)).groupBy(I.wave).orderBy(desc(since));
}
