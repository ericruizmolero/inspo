"use server";
// The waitlist button on /login, for someone the signup gate turned away. The marketing site's form is
// app/api/waitlist/route.ts; both enlist the same way under the same rate limit.
import { headers } from "next/headers";
import { enlist, mayEnlist, parseEmail } from "@/lib/access";
import { getErrors, getLocale } from "@/lib/i18n";
import type { ActionResult } from "@/lib/workspace";

export async function joinWaitlistFromLogin(email: string): Promise<ActionResult<null>> {
  const errors = await getErrors();
  const mail = parseEmail(email);
  if (!mail) return { ok: false, error: errors.badEmail };
  if (!(await mayEnlist(await headers()))) return { ok: false, error: errors.tooMany };
  await enlist({ email: mail, locale: await getLocale(), source: "login" });
  return { ok: true, data: null };
}
