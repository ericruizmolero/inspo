// Who may create an account: the waitlist, the invite codes (waitlist_entry, access_invite) and the
// signup_mode flag that turns the gate on and off.
import "server-only";
import { randomBytes } from "crypto";
import { and, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { sha256 } from "./hash";
import { newId } from "./workspace-core";
import type { Locale } from "./i18n/locale";
import type { PlanKey } from "./plans";
import { SIGNUP_MODES, type SignupMode, type WaitlistSource } from "./db/schema";
import { isAdmin } from "./activity";

const W = schema.waitlistEntry;
const I = schema.accessInvite;

export const normalEmail = (email: string) => email.trim().toLowerCase();

export interface WaitlistAnswers {
  email: string;
  locale: Locale;
  source: WaitlistSource;
  name?: string | null;
  role?: string | null;
  teamSize?: string | null;
  tools?: string | null;
  website?: string | null;
  note?: string | null;
}

/** Adds the person once. Joining again with the same email keeps the first entry and its answers. */
export async function joinWaitlist(a: WaitlistAnswers) {
  const email = normalEmail(a.email);
  const now = new Date();
  const [created] = await db.insert(W).values({ ...a, id: newId(), email, consentAt: now, createdAt: now })
    .onConflictDoNothing({ target: W.email })
    .returning({ id: W.id, status: W.status });
  if (created) return { ...created, created: true };
  const [existing] = await db.select({ id: W.id, status: W.status }).from(W).where(eq(W.email, email));
  return { ...existing, created: false };
}

export interface InviteOptions {
  /** Only this person can redeem it. Without it, anyone with the code */
  email?: string | null;
  /** The person handing it out. Without it, the team */
  createdBy?: string | null;
  wave?: string | null;
  maxUses?: number;
  expiresAt?: Date | null;
  grantsPlan?: PlanKey | null;
  grantsUntil?: Date | null;
}

/** Makes an invite and returns its code: the only time it exists. A waitlist entry for its email moves to invited. */
export async function createInvite(o: InviteOptions = {}): Promise<{ id: string; code: string }> {
  const code = randomBytes(15).toString("base64url");
  const id = newId();
  const email = o.email ? normalEmail(o.email) : null;
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(I).values({
      id, codeHash: sha256(code), email, createdBy: o.createdBy ?? null, wave: o.wave ?? null,
      maxUses: o.maxUses ?? 1, expiresAt: o.expiresAt ?? null,
      grantsPlan: o.grantsPlan ?? null, grantsUntil: o.grantsUntil ?? null, createdAt: now,
    });
    if (email) {
      await tx.update(W).set({ status: "invited", inviteId: id, invitedAt: now })
        .where(and(eq(W.email, email), eq(W.status, "pending")));
    }
  });
  return { id, code };
}

export type { SignupMode };

const MODE_KEY = "signup_mode";
const MODE_TTL_MS = 30_000;
const isMode = (v: unknown): v is SignupMode => SIGNUP_MODES.includes(v as SignupMode);

/** Without a row: SIGNUP_MODE, else open. Production stays open until someone turns the gate on in /admin */
function defaultMode(): SignupMode {
  const env = process.env.SIGNUP_MODE?.trim();
  return isMode(env) ? env : "open";
}

let cachedMode: { mode: SignupMode; at: number } | null = null;

/** Cached per instance for 30 seconds, so the gate does not cost a query per request. */
export async function getSignupMode(): Promise<SignupMode> {
  if (cachedMode && Date.now() - cachedMode.at < MODE_TTL_MS) return cachedMode.mode;
  const [row] = await db.select({ value: schema.appSetting.value }).from(schema.appSetting).where(eq(schema.appSetting.key, MODE_KEY));
  const mode = isMode(row?.value) ? row.value : defaultMode();
  cachedMode = { mode, at: Date.now() };
  return mode;
}

export interface SignupModeState { mode: SignupMode; updatedAt: Date | null; updatedBy: string | null }

/** For /admin: the mode and who set it last. Null updatedAt: no one has, it is the default */
export async function signupModeState(): Promise<SignupModeState> {
  const [row] = await db.select({ value: schema.appSetting.value, updatedAt: schema.appSetting.updatedAt, name: schema.user.name, email: schema.user.email })
    .from(schema.appSetting).leftJoin(schema.user, eq(schema.user.id, schema.appSetting.updatedBy))
    .where(eq(schema.appSetting.key, MODE_KEY));
  if (!row || !isMode(row.value)) return { mode: defaultMode(), updatedAt: null, updatedBy: null };
  return { mode: row.value, updatedAt: row.updatedAt, updatedBy: row.name || row.email };
}

export async function setSignupMode(mode: SignupMode, userId: string | null): Promise<void> {
  const now = new Date();
  await db.insert(schema.appSetting).values({ key: MODE_KEY, value: mode, updatedBy: userId, updatedAt: now })
    .onConflictDoUpdate({ target: schema.appSetting.key, set: { value: mode, updatedBy: userId, updatedAt: now } });
  cachedMode = { mode, at: Date.now() };
}

export type RedeemFailure = "not_found" | "revoked" | "expired" | "wrong_email" | "used_up";
export type RedeemResult =
  | { ok: true; inviteId: string; grantsPlan: PlanKey | null; grantsUntil: Date | null }
  | { ok: false; reason: RedeemFailure };

/** An invite this email can still spend */
const usableBy = (mail: string) => and(
  lt(I.uses, I.maxUses),
  isNull(I.revokedAt),
  or(isNull(I.expiresAt), gt(I.expiresAt, sql`now()`)),
  or(isNull(I.email), eq(I.email, mail)),
);
const spentFields = { inviteId: I.id, grantsPlan: I.grantsPlan, grantsUntil: I.grantsUntil };

/** Spends one use of the code for this email. */
export async function redeemInvite(code: string, email: string): Promise<RedeemResult> {
  const hash = sha256(code.trim());
  const mail = normalEmail(email);
  const [spent] = await db.update(I).set({ uses: sql`${I.uses} + 1` })
    .where(and(eq(I.codeHash, hash), usableBy(mail)))
    .returning(spentFields);
  if (spent) return { ok: true, ...spent };
  return { ok: false, reason: await whyNotRedeemed(hash, mail) };
}

/** For /login's headline: a code that still has a use left, whoever it is made out to. Spends nothing. */
export async function codeIsUsable(code: string): Promise<boolean> {
  const [row] = await db.select({ id: I.id }).from(I)
    .where(and(eq(I.codeHash, sha256(code.trim())), lt(I.uses, I.maxUses), isNull(I.revokedAt), or(isNull(I.expiresAt), gt(I.expiresAt, sql`now()`))))
    .limit(1);
  return !!row;
}

/** Spends one use of an invite made out to this email, for someone who arrives without the code. */
async function redeemInviteFor(mail: string) {
  const oldest = db.select({ id: I.id }).from(I).where(and(eq(I.email, mail), usableBy(mail))).orderBy(I.createdAt).limit(1);
  const [spent] = await db.update(I).set({ uses: sql`${I.uses} + 1` })
    .where(and(inArray(I.id, oldest), usableBy(mail)))
    .returning(spentFields);
  return spent ?? null;
}

async function whyNotRedeemed(hash: string, mail: string): Promise<RedeemFailure> {
  const [row] = await db.select().from(I).where(eq(I.codeHash, hash));
  if (!row) return "not_found";
  if (row.revokedAt) return "revoked";
  if (row.expiresAt && row.expiresAt <= new Date()) return "expired";
  if (row.email && row.email !== mail) return "wrong_email";
  return "used_up";
}

export async function hasAccess(email: string): Promise<boolean> {
  const [row] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, normalEmail(email))).limit(1);
  return !!row;
}

/** Let in without an invite of their own: a pending team invitation (#116), or a seat on /admin. */
async function admittedWithoutInvite(mail: string): Promise<boolean> {
  const [team] = await db.select({ id: schema.invitation.id }).from(schema.invitation)
    .where(and(eq(sql`lower(${schema.invitation.email})`, mail), eq(schema.invitation.status, "pending"), gt(schema.invitation.expiresAt, sql`now()`)))
    .limit(1);
  return !!team || isAdmin(mail);
}

/** Before sending a magic link: whether this email can sign in or create its account. Spends nothing. */
export async function maySignIn(email: string, code: string | null): Promise<boolean> {
  const mail = normalEmail(email);
  if ((await getSignupMode()) === "open" || (await hasAccess(mail))) return true;
  const [invite] = await db.select({ id: I.id }).from(I)
    .where(and(code ? or(eq(I.codeHash, sha256(code.trim())), eq(I.email, mail)) : eq(I.email, mail), usableBy(mail)))
    .limit(1);
  return !!invite || admittedWithoutInvite(mail);
}

export type Admission =
  | { ok: true; inviteId: string | null; grantsPlan: PlanKey | null }
  | { ok: false };

/**
 * At account creation, the gate. Spends the code or an invite in the person's name when there is one,
 * in both modes so invites keep counting once signup is open. With the gate on and no invite, only a
 * pending team invitation or a seat on /admin gets in.
 */
export async function admit(email: string, code: string | null): Promise<Admission> {
  const mail = normalEmail(email);
  const byCode = code ? await redeemInvite(code, mail) : null;
  const spent = byCode?.ok ? byCode : await redeemInviteFor(mail);
  if (spent) return { ok: true, inviteId: spent.inviteId, grantsPlan: spent.grantsPlan };
  if ((await getSignupMode()) === "open" || (await admittedWithoutInvite(mail))) return { ok: true, inviteId: null, grantsPlan: null };
  return { ok: false };
}

/** Once the account exists: its waitlist entry, if any, is done. */
export async function markJoined(email: string): Promise<void> {
  await db.update(W).set({ status: "joined", joinedAt: new Date() })
    .where(and(eq(W.email, normalEmail(email)), inArray(W.status, ["pending", "invited"])));
}
