// Emails that go out once per key: the spend and fair-use alerts, the welcome and the day-3 nudge. The key is a
// row in app_setting, so of two instances that send at once, only one does. Its own module, not lib/mail.ts, so a
// test that mocks sendMail also catches the sends made here.
import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { sendMail, type Mail } from "./mail";
import { log } from "./log";

/** True for whoever claims `key` first */
export async function firstTime(key: string): Promise<boolean> {
  const rows = await db.insert(schema.appSetting).values({ key, value: "sent", updatedAt: new Date() })
    .onConflictDoNothing().returning({ key: schema.appSetting.key });
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
    await db.delete(schema.appSetting).where(eq(schema.appSetting.key, key));
    return false;
  }
}
