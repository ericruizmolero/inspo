"use server";
// Activity panel (/admin): who has access, and deleting feedback. Only for those who already have access.
import { headers } from "next/headers";
import { getSession, type ActionResult } from "@/lib/workspace";
import { APP_URL } from "@/lib/auth";
import { isAdmin, addAdmin, removeAdmin } from "@/lib/activity";
import { deleteFeedbackNotes, resolveFeedbackNotes } from "@/lib/feedback";
import { sendMail, adminAccessMail, localeForEmail } from "@/lib/mail";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";
import { log } from "@/lib/log";

type Admin = NonNullable<Awaited<ReturnType<typeof getSession>>>;

async function asAdmin<T>(fn: (s: Admin) => Promise<T>): Promise<ActionResult<T>> {
  const s = await getSession();
  if (!s) return { ok: false, error: (await getErrors()).notSignedIn };
  if (!(await isAdmin(s.user.email))) return { ok: false, error: (await getErrors()).noPanelAccess };
  try {
    return { ok: true, data: await fn(s) };
  } catch (e) {
    if (!(e instanceof HttpError)) log.error("admin.action_failed", { err: e });
    return { ok: false, error: e instanceof HttpError ? e.message : (await getErrors()).unexpected };
  }
}

/** Grants access and emails the new person, in their language (not the granter's). */
export async function grantAccess(email: string) {
  return asAdmin(async (s) => {
    if (!email?.trim()) throw new HttpError(400, (await getErrors()).missingEmail);
    const by = s.user.name || s.user.email;
    const r = await addAdmin(email, by);
    let mailed = false;
    if (r.added) {
      const h = await headers();
      const base = APP_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
      const m = adminAccessMail(`${base}/admin`, by, await localeForEmail(r.email));
      try { await sendMail(r.email, m.subject, m.html, m.text); mailed = true; }
      catch (err) { log.warn("admin.access_mail_not_sent", { err }); }
    }
    return { ...r, mailed };
  });
}

/** You cannot remove yourself or the fixed ones. */
export async function revokeAccess(email: string) {
  return asAdmin(async (s) => {
    const e = email?.trim().toLowerCase();
    if (!e) throw new HttpError(400, (await getErrors()).missingEmail);
    if (e === s.user.email.toLowerCase()) throw new HttpError(400, (await getErrors()).cannotRemoveSelf);
    await removeAdmin(e);
  });
}

/** The ids are feedback_note ids (one submission = several notes). */
export async function deleteFeedback(ids: string[]) {
  return asAdmin(async () => {
    const list = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 500) : [];
    if (!list.length) throw new HttpError(400, (await getErrors()).nothingToDelete);
    return deleteFeedbackNotes(list);
  });
}

/** Marks a submission as dealt with (or reopens it). Same ids as deleteFeedback. */
export async function resolveFeedback(ids: string[], resolved: boolean) {
  return asAdmin(async () => {
    const list = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 500) : [];
    if (!list.length) throw new HttpError(400, (await getErrors()).nothingToDelete);
    return resolveFeedbackNotes(list, !!resolved);
  });
}
