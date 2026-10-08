"use server";
// The team emails a person gets, and what the bell in the Island shows.
import { revalidatePath } from "next/cache";
import { withCtx, HttpError } from "@/lib/workspace";
import { getErrors } from "@/lib/i18n";
import { EMAIL_KINDS, markActivitySeen, setEmailPref, teamActivity, unsubscribeValid, type EmailKind } from "@/lib/notify";

/** A switch in Account: the daily digest or the instant replies, on or off */
export async function setEmailPreference(kind: string, on: boolean) {
  return withCtx(async (ctx) => {
    if (!EMAIL_KINDS.includes(kind as EmailKind)) throw new HttpError(400, (await getErrors()).badBody);
    await setEmailPref(ctx.user.id, kind as EmailKind, !!on);
    revalidatePath("/settings/account");
  });
}

/** The "turn it back on" of the unsubscribe page: no session needed, the signed link is the proof */
export async function resubscribe(userId: string, kind: string, sig: string): Promise<boolean> {
  if (!unsubscribeValid(userId, kind, sig)) return false;
  await setEmailPref(userId, kind, true);
  return true;
}

/** What the team did in the open workspace, for the bell */
export async function teamActivityFeed() {
  return withCtx((ctx) => teamActivity(ctx.workspace.id, ctx.user.id, ctx.user.language));
}

/** The bell was opened */
export async function teamActivitySeen() {
  return withCtx((ctx) => markActivitySeen(ctx.workspace.id, ctx.user.id));
}
