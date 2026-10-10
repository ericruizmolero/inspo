"use server";
// The waitlist button on /login, for someone the signup gate turned away. The full form is #119.
import { headers } from "next/headers";
import { joinWaitlist } from "@/lib/access";
import { getErrors, getLocale } from "@/lib/i18n";
import { allow, ipOf } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/workspace";

export async function joinWaitlistFromLogin(email: string): Promise<ActionResult<null>> {
  const errors = await getErrors();
  const mail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) || mail.length > 254) return { ok: false, error: errors.badEmail };
  if (!(await allow(`waitlist:${ipOf(await headers())}`, 10, 60 * 60 * 1000))) return { ok: false, error: errors.tooMany };
  await joinWaitlist({ email: mail, locale: await getLocale(), source: "login" });
  return { ok: true, data: null };
}
