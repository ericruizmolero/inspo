"use server";
// Activity panel (/admin): who has access, and deleting feedback. Only for those who already have access.
import { addAdmin, removeAdmin } from "@/lib/activity";
import { deleteFeedbackNotes, resolveFeedbackNotes } from "@/lib/feedback";
import { sendMail, adminAccessMail, localeForEmail } from "@/lib/mail";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";
import { log } from "@/lib/log";
import { giveInvites, setSignupMode as storeSignupMode, signupModeState, type SignupMode } from "@/lib/access";
import { appBase, asAdmin } from "@/lib/admin-action";

/** Grants access and emails the new person, in their language (not the granter's). */
export async function grantAccess(email: string) {
  return asAdmin(async (s) => {
    if (!email?.trim()) throw new HttpError(400, (await getErrors()).missingEmail);
    const by = s.user.name || s.user.email;
    const r = await addAdmin(email, by);
    let mailed = false;
    if (r.added) {
      const m = adminAccessMail(`${await appBase()}/admin`, by, await localeForEmail(r.email));
      try { await sendMail(r.email, m); mailed = true; }
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

/** The signup gate: invite-only or open to anyone. Takes effect within 30 seconds, no deploy. */
export async function setSignupMode(mode: SignupMode) {
  return asAdmin(async (s) => {
    if (mode !== "invite" && mode !== "open") throw new HttpError(400, (await getErrors()).badBody);
    await storeSignupMode(mode, s.user.id);
    log.info("admin.signup_mode", { mode, by: s.user.email });
    return signupModeState();
  });
}

/** More personal invites for one account, on top of what it has. Returns its new balance */
export async function giveMoreInvites(email: string, n: number) {
  return asAdmin(async (s) => {
    const errors = await getErrors();
    if (!email?.trim()) throw new HttpError(400, errors.missingEmail);
    if (!Number.isInteger(n) || n < 1 || n > 100) throw new HttpError(400, errors.badInviteCount);
    const left = await giveInvites(email, n);
    if (left === null) throw new HttpError(404, errors.noAccountForEmail);
    log.info("admin.invites_given", { n, by: s.user.email });
    return left;
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
