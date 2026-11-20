// Emails that go out once per key: the spend and fair-use alerts, the welcome and the day 3 and day 7 nudges. Or at
// most once per period per key: a client's comments on a share link (lib/client-comments.ts) and the win-back
// (lib/win-back.ts). The key is a row in app_setting, so of two instances that send at once, only one does. Its own
// module, not lib/mail.ts, so a test that mocks sendMail also catches the sends made here.
import "server-only";
import { and, eq, lte } from "drizzle-orm";
import { db, schema } from "./db";
import { sendMail, type Mail } from "./mail";
import { log } from "./log";

const A = schema.appSetting;

/** True for whoever claims `key` first */
export async function firstTime(key: string): Promise<boolean> {
  const rows = await db.insert(A).values({ key, value: "sent", updatedAt: new Date() })
    .onConflictDoNothing().returning({ key: A.key });
  return rows.length > 0;
}

/** Sends `mail` once per `key`, and says whether this call sent it. A failed send gives the key back, so the next call tries again */
export async function mailOnce(key: string, to: string[], mail: Mail, opts: { headers?: Record<string, string> } = {}): Promise<boolean> {
  if (!(await firstTime(key))) return false;
  try {
    await sendMail(to, mail, opts);
    return true;
  } catch (err) {
    log.warn("mail.not_sent_once", { key, err });
    await db.delete(A).where(eq(A.key, key));
    return false;
  }
}

/** When `key` was last taken by claimEvery, or null if never */
export async function lastSent(key: string): Promise<Date | null> {
  const [row] = await db.select({ at: A.updatedAt }).from(A).where(eq(A.key, key)).limit(1);
  return row?.at ?? null;
}

/** Takes `key` at `now` unless it was taken less than `everyMs` before. True for whoever takes it: of two calls at
 *  once, one does */
export async function claimEvery(key: string, everyMs: number, now = new Date()): Promise<boolean> {
  const rows = await db.insert(A).values({ key, value: "sent", updatedAt: now })
    .onConflictDoUpdate({ target: A.key, set: { updatedAt: now }, setWhere: lte(A.updatedAt, new Date(now.getTime() - everyMs)) })
    .returning({ key: A.key });
  return rows.length > 0;
}

/** Undoes the claim made at `now` after a send that failed: the key goes back to `before`, or away if it had none */
export async function giveBack(key: string, before: Date | null, now: Date): Promise<void> {
  const mine = and(eq(A.key, key), eq(A.updatedAt, now));
  if (before) await db.update(A).set({ updatedAt: before }).where(mine);
  else await db.delete(A).where(mine);
}

/** Sends `mail` unless `key` sent one less than `everyMs` before `now`, and says whether this call sent it. A failed
 *  send gives the key back */
export async function mailEvery(key: string, everyMs: number, to: string[], mail: Mail, opts: { headers?: Record<string, string> } = {}, now = new Date()): Promise<boolean> {
  const before = await lastSent(key);
  if (!(await claimEvery(key, everyMs, now))) return false;
  try {
    await sendMail(to, mail, opts);
    return true;
  } catch (err) {
    log.warn("mail.not_sent_every", { key, err });
    await giveBack(key, before, now);
    return false;
  }
}
