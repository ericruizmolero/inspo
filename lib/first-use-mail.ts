// The two emails of a person's first days (#103). Each goes out once per person (mailOnce, lib/mail-once.ts):
//   - The welcome, when the account is made (lib/auth.ts, after the response): the five steps to a first criterio.md.
//   - The day-3 nudge, from the morning cron: only if none of their projects has a reference yet. A template's
//     sample references and the templates themselves do not count. It carries the digest's stop link, so turning
//     the digest off also turns this off.
import "server-only";
import { and, eq, gte, isNull, lt, not, notExists, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { welcomeMail, nudgeMail, unsubscribeHeaders } from "./mail";
import { mailOnce } from "./mail-once";
import { baseUrl, inBackground, unsubscribeUrl } from "./notify";
import { isSampleItem } from "./sample-items";
import { toLocale } from "./i18n/locale";

const DAY = 24 * 60 * 60 * 1000;

interface Person { id: string; email: string; language?: string | null }

export const welcomeKey = (userId: string) => `welcome:${userId}`;
export const nudgeKey = (userId: string) => `nudge3:${userId}`;

export function sendWelcome(p: Person): Promise<boolean> {
  return mailOnce(welcomeKey(p.id), [p.email], welcomeMail(baseUrl(), toLocale(p.language)));
}

/** The welcome after the signup's response has gone out: a mail that fails never fails the signup */
export function welcomeLater(p: Person): void {
  inBackground(async () => { await sendWelcome(p); });
}

/**
 * Who the nudge looks at on the morning of `now`: the accounts made on the UTC day four days back. The cron runs
 * once a day, always on the same UTC day as its date, so each day's run takes the next whole day and nobody is
 * skipped or seen twice. Whoever it reaches has had at least three days.
 */
export function nudgeWindow(now: Date): { from: Date; to: Date } {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { from: new Date(today - 4 * DAY), to: new Date(today - 3 * DAY) };
}

/** The people in the window with the digest on and no reference of their own in any project of any of their workspaces */
async function emptyHanded(now: Date): Promise<Person[]> {
  const U = schema.user, M = schema.member, PI = schema.projectItem, P = schema.project, T = schema.inspoItem;
  const { from, to } = nudgeWindow(now);
  const filed = db.select({ one: sql`1` }).from(M)
    .innerJoin(PI, eq(PI.organizationId, M.organizationId))
    .innerJoin(P, and(eq(P.id, PI.projectId), isNull(P.template)))
    .innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(M.userId, U.id), not(isSampleItem())));
  return db.select({ id: U.id, email: U.email, language: U.language }).from(U)
    .where(and(gte(U.createdAt, from), lt(U.createdAt, to), eq(U.digestEmails, true), notExists(filed)));
}

export async function sendNudges(now = new Date()): Promise<{ empty: number; sent: number }> {
  const people = await emptyHanded(now);
  let sent = 0;
  for (const p of people) {
    const stopUrl = unsubscribeUrl(p.id, "digest");
    if (await mailOnce(nudgeKey(p.id), [p.email], nudgeMail(baseUrl(), stopUrl, toLocale(p.language)), { headers: unsubscribeHeaders(stopUrl) })) sent++;
  }
  return { empty: people.length, sent };
}
