// The "Connect your agent" email: Welcome (components/Welcome.tsx) ended without an AI client connected over MCP, so
// CONNECT_AFTER_DAYS later the morning mail job sends the connector's address and each client's steps, once
// (mailOnce). Ending Welcome leaves a pending row in app_setting dated that moment; the morning reads the ones old
// enough and clears each it settles. Nothing goes if the person connected since or turned the digest off, and the
// email carries the digest's stop link like the first days' nudges (lib/first-use-mail.ts).
import "server-only";
import { and, eq, like, lte } from "drizzle-orm";
import { db, schema } from "./db";
import { connectAgentMail, unsubscribeHeaders } from "./mail";
import { mailOnce } from "./mail-once";
import { everConnected } from "./mcp/oauth";
import { baseUrl, unsubscribeUrl } from "./notify";
import { toLocale } from "./i18n/locale";

const DAY = 24 * 60 * 60 * 1000;

/** Days between Welcome's end and the email */
export const CONNECT_AFTER_DAYS = 5;

const PENDING = "connect_pending:";
export const pendingKey = (userId: string) => `${PENDING}${userId}`;
export const connectMailKey = (userId: string) => `connect_agent:${userId}`;

/** Welcome ended: with no AI client connected yet, the email waits its days */
export async function connectLater(userId: string, now = new Date()): Promise<void> {
  if (await everConnected(userId)) return;
  await db.insert(schema.appSetting).values({ key: pendingKey(userId), value: "pending", updatedBy: userId, updatedAt: now }).onConflictDoNothing();
}

/** Sends the emails due on the morning of `now`. `due` counts the people still unconnected with the digest on */
export async function sendConnectReminders(now = new Date()): Promise<{ due: number; sent: number }> {
  const A = schema.appSetting, U = schema.user;
  const rows = await db.select({ key: A.key, id: U.id, email: U.email, language: U.language, digest: U.digestEmails })
    .from(A).leftJoin(U, eq(U.id, A.updatedBy))
    .where(and(like(A.key, `${PENDING}%`), lte(A.updatedAt, new Date(now.getTime() - CONNECT_AFTER_DAYS * DAY))));
  const settle = (key: string) => db.delete(A).where(eq(A.key, key));
  let due = 0, sent = 0;
  for (const r of rows) {
    if (!r.id || !r.email || !r.digest || (await everConnected(r.id))) { await settle(r.key); continue; }
    due++;
    const stopUrl = unsubscribeUrl(r.id, "digest");
    const mail = connectAgentMail({ address: `${baseUrl()}/mcp`, url: `${baseUrl()}/?in=home` }, stopUrl, toLocale(r.language));
    // A send that fails keeps the pending row, so the next morning tries again
    if (await mailOnce(connectMailKey(r.id), [r.email], mail, { headers: unsubscribeHeaders(stopUrl) })) { sent++; await settle(r.key); }
    else if (await mailed(r.id)) await settle(r.key);
  }
  return { due, sent };
}

/** Whether the email already went to this person */
export async function mailed(userId: string): Promise<boolean> {
  const [r] = await db.select({ key: schema.appSetting.key }).from(schema.appSetting).where(eq(schema.appSetting.key, connectMailKey(userId)));
  return !!r;
}
