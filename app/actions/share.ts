"use server";
// Share links of a project's board (lib/share.ts): any member makes them, invites people to them, sees them and
// turns them off. The guest half (lib/share-guests.ts) takes no session: the address is the proof, and an anonymous
// guest also sends the random secret their browser keeps.
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { withCtx, HttpError, type ActionResult } from "@/lib/workspace";
import { createShare, inviteToShare, listShares, resolveShare, revokeShare, uninviteFromShare, type ShareAccess, type ShareGuestRow } from "@/lib/share";
import { deleteGuestComment, postGuestComment, renameGuest, shareActivity, toggleGuestPick, type ShareActivity } from "@/lib/share-guests";
import { APP_URL } from "@/lib/auth";
import { inBackground } from "@/lib/notify";
import { localeForEmail, sendMail, shareInviteMail } from "@/lib/mail";
import { db, schema } from "@/lib/db";
import { getErrors } from "@/lib/i18n";
import { recordFailure } from "@/lib/log";

export async function loadShares(projectId: string) {
  return withCtx(async (ctx) => listShares(ctx.workspace.id, String(projectId)));
}

/** Writes to each person invited, with their own address, once this has answered */
async function sendInvites(organizationId: string, projectId: string, invited: ShareGuestRow[], who: string) {
  if (!invited.length) return;
  const origin = APP_URL || (await headers()).get("origin") || "";
  inBackground(async () => {
    const [project] = await db.select({ name: schema.project.name }).from(schema.project)
      .where(and(eq(schema.project.organizationId, organizationId), eq(schema.project.id, projectId))).limit(1);
    for (const g of invited) {
      await sendMail(g.email, shareInviteMail({ who, project: project?.name ?? "", url: `${origin}/s/${g.token}` }, await localeForEmail(g.email)));
    }
  });
}

export async function makeShare(projectId: string, input: { mode: "clean" | "full"; access: ShareAccess; label: string; itemIds: string[] | null; emails: string[] }) {
  return withCtx(async (ctx) => {
    const { links, invited } = await createShare(ctx.workspace.id, String(projectId), {
      mode: input?.mode === "full" ? "full" : "clean",
      access: input?.access === "invite" ? "invite" : "link",
      label: String(input?.label ?? ""),
      itemIds: Array.isArray(input?.itemIds) ? input.itemIds.map(String) : null,
      emails: Array.isArray(input?.emails) ? input.emails.map(String) : [],
    }, ctx.user.id);
    await sendInvites(ctx.workspace.id, String(projectId), invited, ctx.user.name);
    return links;
  });
}

export async function inviteMore(projectId: string, shareId: string, emails: string[]) {
  return withCtx(async (ctx) => {
    const { links, invited } = await inviteToShare(ctx.workspace.id, String(projectId), String(shareId), Array.isArray(emails) ? emails.map(String) : []);
    await sendInvites(ctx.workspace.id, String(projectId), invited, ctx.user.name);
    return links;
  });
}

export async function uninvite(projectId: string, guestId: string) {
  return withCtx(async (ctx) => uninviteFromShare(ctx.workspace.id, String(projectId), String(guestId)));
}

export async function stopShare(projectId: string, id: string) {
  return withCtx(async (ctx) => revokeShare(ctx.workspace.id, String(projectId), String(id)));
}

// ─── Guests, with no session ────────────────────────────────────────────────

async function asGuest<T>(token: string, fn: (share: NonNullable<Awaited<ReturnType<typeof resolveShare>>>) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const share = await resolveShare(String(token));
    if (!share) throw new HttpError(404, (await getErrors()).shareGone);
    return { ok: true, data: await fn(share) };
  } catch (e) {
    if (!(e instanceof HttpError)) void recordFailure("action", "share guest", e);
    return { ok: false, error: e instanceof HttpError ? e.message : (await getErrors()).unexpected };
  }
}

export async function guestActivity(token: string): Promise<ActionResult<ShareActivity>> {
  return asGuest(token, shareActivity);
}

export async function guestComment(token: string, secret: string, input: { itemId: string; body: string; parentId?: string | null; name: string }) {
  return asGuest(token, async (share) => {
    await postGuestComment(share, secret, { itemId: String(input?.itemId ?? ""), body: String(input?.body ?? ""), parentId: input?.parentId ?? null, name: input?.name });
    return shareActivity(share);
  });
}

export async function guestUncomment(token: string, secret: string, id: string) {
  return asGuest(token, async (share) => { await deleteGuestComment(share, secret, String(id)); return shareActivity(share); });
}

export async function guestPick(token: string, secret: string, itemId: string, name: string) {
  return asGuest(token, async (share) => { await toggleGuestPick(share, secret, String(itemId), name); return shareActivity(share); });
}

export async function guestRename(token: string, secret: string, name: string) {
  return asGuest(token, async (share) => ({ name: await renameGuest(share, secret, name), activity: await shareActivity(share) }));
}
