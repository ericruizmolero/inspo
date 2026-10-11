// The floor under AI spend (#33). Every model call asks first (lib/llm.ts, lib/embed.ts): past the day's alert
// the team gets one email, and at the cap no call goes out until 00:00 UTC. Counted on ai_usage across the whole
// app, so it holds whatever plan a quota bug or an abuse comes through. A call that skips ai_usage is caught each
// night instead, against OpenRouter's own bill (lib/usage-check.ts).
import "server-only";
import { eq, gte, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { fixedAdmins } from "./activity";
import { sendMail, type Mail } from "./mail";
import { log } from "./log";

/** The costliest day so far was $1.44 (2026-09-21): the alert sits far above any real day, the cap stops a runaway one */
export function spendLimits(): { alertUsd: number; capUsd: number } {
  return { alertUsd: Number(process.env.AI_DAILY_ALERT_USD) || 10, capUsd: Number(process.env.AI_DAILY_CAP_USD) || 50 };
}

export class SpendCapError extends Error {}

/** True for whoever claims `key` first: of two instances crossing a line at once, only one sends the email */
export async function firstTime(key: string): Promise<boolean> {
  const rows = await db.insert(schema.appSetting).values({ key, value: "sent", updatedAt: new Date() })
    .onConflictDoNothing().returning({ key: schema.appSetting.key });
  return rows.length > 0;
}

/** Sends `mail` once per `key`. A failed send gives the key back, so the next call tries again */
export async function mailOnce(key: string, to: string[], mail: Mail): Promise<void> {
  if (!(await firstTime(key))) return;
  try {
    await sendMail(to, mail);
  } catch (err) {
    log.warn("spend.not_mailed", { key, err });
    await db.delete(schema.appSetting).where(eq(schema.appSetting.key, key));
  }
}

/** What the app has spent on models since `since`, in USD. Not lib/usage.ts: it reaches lib/llm.ts, which calls this */
async function spentSince(since: Date): Promise<number> {
  const U = schema.aiUsage;
  const [r] = await db.select({ micros: sql<number>`coalesce(sum(${U.costMicros}), 0)` }).from(U).where(gte(U.createdAt, since));
  return Number(r?.micros ?? 0) / 1e6;
}

const usd = (n: number) => `$${n.toFixed(2)}`;

/** Throws SpendCapError once today's spend (UTC) reaches the cap. Emails the team the first time it passes each line */
export async function assertSpendRoom(): Promise<void> {
  const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0);
  const spent = await spentSince(midnight);
  const { alertUsd, capUsd } = spendLimits();
  if (spent < alertUsd) return;
  const day = midnight.toISOString().slice(0, 10);
  const lines = `The alert is at ${usd(alertUsd)} and the cap at ${usd(capUsd)}. At the cap every model call stops until 00:00 UTC.`;
  const where = "Spend by workspace and by person is in /admin. To move the lines, set AI_DAILY_ALERT_USD and AI_DAILY_CAP_USD on Vercel and redeploy.";
  if (spent < capUsd) {
    log.warn("spend.alert", { spent, alertUsd });
    await mailOnce(`spend_alert:${day}`, fixedAdmins(), {
      subject: `AI spend today is ${usd(spent)}, past the ${usd(alertUsd)} alert`,
      text: `Today (UTC) the app has spent ${usd(spent)} on AI. ${lines}\n\n${where}`,
    });
    return;
  }
  log.error("spend.cap", { spent, capUsd });
  await mailOnce(`spend_cap:${day}`, fixedAdmins(), {
    subject: `AI is off until 00:00 UTC, today's spend reached the ${usd(capUsd)} cap`,
    text: `Today (UTC) the app has spent ${usd(spent)} on AI. ${lines}\n\nNobody can use the AI until then. ${where}`,
  });
  throw new SpendCapError(`Today's AI spend reached the ${usd(capUsd)} cap`);
}
