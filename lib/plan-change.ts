// The one way an account's plan changes after it is made: a partner sets it (/admin/plans through
// lib/plan-requests.ts or its Accounts list, or scripts/set-plan.ts), or a gifted plan runs out (the morning's "mail"
// job, lib/job-run.ts). A gift is written when the account is made (lib/auth.ts, from the access invite's grantsPlan
// and grantsUntil) and lives in billing_account.plan_until; any change made here replaces it, with no end unless the
// partner gives one, and a plan with an end runs out as a gift does.
// The account's owner hears of every move up or down; a move down also tells each team left over its seats.
import "server-only";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { db, schema, type Exec } from "./db";
import { planOf, type Plan, type PlanKey } from "./plans";
import { accountWorkspaces } from "./workspace-core";
import { notifyOverCapacity } from "./quota";
import { mailOnce } from "./mail-once";
import { giftEndedMail, giftEndsMail, planDownMail, planOnMail, sendMail, type Mail } from "./mail";
import { toLocale, type Locale } from "./i18n/locale";
import { log } from "./log";

const B = schema.billingAccount, U = schema.user;
const DAY = 24 * 60 * 60 * 1000;
/** How long before a gift ends its owner is told */
export const GIFT_WARNING = 7 * DAY;

/** A mail that must not undo what was already written: a failure is logged, never thrown */
export async function tell(to: string[], m: Mail, what: string): Promise<void> {
  if (!to.length) return;
  try { await sendMail(to, m); } catch (err) { log.warn(`plans.${what}_not_mailed`, { err }); }
}

/** Why the plan changes. A gift that ended applies only to an account whose plan_until has passed */
export type PlanChangeCause = "partner" | "giftEnded";

export interface PlanChange {
  accountId: string;
  plan: PlanKey;
  cause: PlanChangeCause;
  /** The plan's last day; null or left out, it has no end */
  until?: Date | null;
  appUrl: string;
  /** Written in the same transaction, before the plan: the request a partner closes with it (lib/plan-requests.ts) */
  alongside?: (tx: Exec) => Promise<void>;
}

type Move = "up" | "down";
const moveOf = (from: Plan, to: Plan): Move | null =>
  to.price.month > from.price.month ? "up" : to.price.month < from.price.month ? "down" : null;

/** The email for each move. A move sideways (a partner setting the same plan to end a gift) sends none */
const MAILS: Record<Move, (c: { cause: PlanChangeCause; from: Plan; to: Plan; account: string; url: string; locale: Locale; until: Date | null }) => Mail> = {
  up: (c) => planOnMail(c.to.key, c.account, c.url, c.locale, c.until),
  down: (c) => {
    const vaultLocks = c.from.vault === "full" && c.to.vault !== "full";
    return c.cause === "giftEnded"
      ? giftEndedMail(c.from.key, vaultLocks, c.account, c.url, c.locale)
      : planDownMail(c.to.key, vaultLocks, c.account, c.url, c.locale);
  },
};

/**
 * Sets an account's plan, and so the plan of every workspace in it, and its plan_until. The row is locked while it
 * is written, so of two mornings that end the same gift only one does, and a gift that a partner replaced since
 * is not ended. Returns the move, or null when nothing changed (a gift that has not ended).
 */
export async function changePlan(c: PlanChange): Promise<{ from: PlanKey; to: PlanKey } | null> {
  const changed = await db.transaction(async (tx) => {
    const [a] = await tx.select({ plan: B.plan, planUntil: B.planUntil, name: B.name, ownerUserId: B.ownerUserId })
      .from(B).where(eq(B.id, c.accountId)).for("update");
    if (!a) throw new Error("Billing account not found");
    if (c.cause === "giftEnded" && !(a.planUntil && a.planUntil <= new Date())) return null;
    await c.alongside?.(tx);
    await tx.update(B).set({ plan: c.plan, planUntil: c.until ?? null }).where(eq(B.id, c.accountId));
    return { from: planOf(a.plan), to: planOf(c.plan), account: a.name, ownerUserId: a.ownerUserId };
  });
  if (!changed) return null;
  const { from, to } = changed;
  const move = moveOf(from, to);

  // Nobody is removed: owners and admins of a team left over its seats are told, and only new invitations wait
  if (move === "down") {
    for (const w of await accountWorkspaces(c.accountId)) await notifyOverCapacity(w.id, to.key, w.name, c.appUrl);
  }
  const [owner] = move && changed.ownerUserId
    ? await db.select({ email: U.email, language: U.language }).from(U).where(eq(U.id, changed.ownerUserId))
    : [];
  if (move && owner) {
    const mail = MAILS[move]({ cause: c.cause, from, to, account: changed.account, url: `${c.appUrl}/settings/plan`, locale: toLocale(owner.language), until: c.until ?? null });
    await tell([owner.email], mail, move === "up" ? "on" : "down");
  }
  log.info("plans.changed", { billingAccountId: c.accountId, from: from.key, to: to.key, cause: c.cause });
  return { from: from.key, to: to.key };
}

/** The key of a gift's warning: once per account and end date, so a gift given again with a new date warns again */
export const giftWarningKey = (accountId: string, until: Date) => `gift-ends:${accountId}:${until.toISOString()}`;

/**
 * The morning's gifts: each account whose gift ends within GIFT_WARNING gets one warning to its owner, and each
 * whose gift has passed goes back to free. Run twice, it sends nothing new: the warning is once per key and an
 * ended gift no longer has a plan_until.
 */
export async function settleGifts(appUrl: string): Promise<{ warned: number; ended: number }> {
  const now = new Date();
  const due = await db.select({ id: B.id, name: B.name, plan: B.plan, planUntil: B.planUntil, email: U.email, language: U.language })
    .from(B).leftJoin(U, eq(U.id, B.ownerUserId))
    .where(and(isNotNull(B.planUntil), lte(B.planUntil, new Date(+now + GIFT_WARNING))));
  let warned = 0, ended = 0;
  for (const a of due) {
    const until = a.planUntil!;
    if (until <= now) {
      if (await changePlan({ accountId: a.id, plan: "free", cause: "giftEnded", appUrl })) ended++;
    } else if (a.email) {
      const mail = giftEndsMail(planOf(a.plan).key, until, a.name, `${appUrl}/settings/plan`, toLocale(a.language));
      if (await mailOnce(giftWarningKey(a.id, until), [a.email], mail)) warned++;
    }
  }
  return { warned, ended };
}
