// Who may create an account: the waitlist and the invite codes (waitlist_entry, access_invite).
import "server-only";
import { randomBytes } from "crypto";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { sha256 } from "./hash";
import { newId } from "./workspace-core";
import type { Locale } from "./i18n/locale";
import type { PlanKey } from "./plans";
import type { WaitlistSource } from "./db/schema";

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

export type RedeemFailure = "not_found" | "revoked" | "expired" | "wrong_email" | "used_up";
export type RedeemResult =
  | { ok: true; inviteId: string; grantsPlan: PlanKey | null; grantsUntil: Date | null }
  | { ok: false; reason: RedeemFailure };

/** Spends one use of the code for this email. */
export async function redeemInvite(code: string, email: string): Promise<RedeemResult> {
  const hash = sha256(code.trim());
  const mail = normalEmail(email);
  const [spent] = await db.update(I).set({ uses: sql`${I.uses} + 1` })
    .where(and(
      eq(I.codeHash, hash),
      lt(I.uses, I.maxUses),
      isNull(I.revokedAt),
      or(isNull(I.expiresAt), gt(I.expiresAt, sql`now()`)),
      or(isNull(I.email), eq(I.email, mail)),
    ))
    .returning({ inviteId: I.id, grantsPlan: I.grantsPlan, grantsUntil: I.grantsUntil });
  if (spent) return { ok: true, ...spent };
  return { ok: false, reason: await whyNotRedeemed(hash, mail) };
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
