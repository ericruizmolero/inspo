// The emails of a person's first days (#103), each one once per person (mailOnce, lib/mail-once.ts). Both follow the
// first steps (lib/first-steps-core.ts STEPS), the same list the app ticks off:
//   - The welcome, when the account is made (lib/auth.ts, after the response): the steps in order.
//   - A nudge on day 3 and another on day 7, from the morning cron: the first step not done, with its link. Nothing
//     once the steps are walked or the list was hidden (user.first_steps_done_at). It carries the digest's stop link,
//     so turning the digest off also turns these off.
import "server-only";
import { and, asc, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { welcomeMail, nudgeMail } from "./mail";
import { mailOnce } from "./mail-once";
import { baseUrl, inBackground, unsubscribeUrl } from "./notify";
import { firstSteps } from "./first-steps";
import { REFS_GOAL, STEPS, nextStep } from "./first-steps-core";
import { toLocale } from "./i18n/locale";
import { mailed as connectMailed } from "./connect-mail";

const DAY = 24 * 60 * 60 * 1000;

interface Person { id: string; email: string; language?: string | null }

/** The days after signing up a nudge goes out on */
export const NUDGE_DAYS = [3, 7] as const;
export type NudgeDay = (typeof NUDGE_DAYS)[number];

export const welcomeKey = (userId: string) => `welcome:${userId}`;
export const nudgeKey = (day: NudgeDay, userId: string) => `nudge${day}:${userId}`;

export function sendWelcome(p: Person): Promise<boolean> {
  return mailOnce(welcomeKey(p.id), [p.email], welcomeMail(baseUrl(), toLocale(p.language)));
}

/** The welcome after the signup's response has gone out: a mail that fails never fails the signup */
export function welcomeLater(p: Person): void {
  inBackground(async () => { await sendWelcome(p); });
}

/**
 * Who the day's nudge looks at on the morning of `now`: the accounts made on the UTC day `day + 1` days back. The cron
 * runs once a day, always on the same UTC day as its date, so each day's run takes the next whole day and nobody is
 * skipped or seen twice. Whoever it reaches has had at least `day` days.
 */
export function nudgeWindow(now: Date, day: NudgeDay): { from: Date; to: Date } {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { from: new Date(today - (day + 1) * DAY), to: new Date(today - day * DAY) };
}

/** The workspace a person's first steps are read in: their own, or the first one they joined */
async function homeOf(userId: string): Promise<string | null> {
  const M = schema.member, O = schema.organization;
  const [m] = await db.select({ id: M.organizationId }).from(M).innerJoin(O, eq(O.id, M.organizationId))
    .where(eq(M.userId, userId)).orderBy(desc(sql`${O.kind} = 'personal'`), asc(M.createdAt)).limit(1);
  return m?.id ?? null;
}

/** Sends the day 3 and day 7 nudges due on the morning of `now`. `due` counts the people with a step to name */
export async function sendNudges(now = new Date()): Promise<{ due: number; sent: number }> {
  const U = schema.user;
  let due = 0, sent = 0;
  for (const day of NUDGE_DAYS) {
    const { from, to } = nudgeWindow(now, day);
    const people = await db.select({ id: U.id, email: U.email, language: U.language }).from(U)
      .where(and(gte(U.createdAt, from), lt(U.createdAt, to), eq(U.digestEmails, true), isNull(U.firstStepsDoneAt)));
    for (const p of people) {
      const ws = await homeOf(p.id);
      // Null once walked: firstSteps hides the list for good then, and no nudge names a step
      const steps = ws ? await firstSteps(p.id, ws) : null;
      const step = steps && nextStep(steps);
      if (!steps || !step) continue;
      // The connect reminder already said it, with the steps
      if (step === "out" && (await connectMailed(p.id))) continue;
      due++;
      const url = baseUrl() + STEPS.find((s) => s.key === step)!.href(steps);
      const stopUrl = unsubscribeUrl(p.id, "digest");
      const mail = nudgeMail(step, { url, refs: steps.refs, goal: REFS_GOAL }, stopUrl, toLocale(p.language));
      if (await mailOnce(nudgeKey(day, p.id), [p.email], mail)) sent++;
    }
  }
  return { due, sent };
}
