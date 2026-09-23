"use server";
// Library changes made by the interface itself: adding and removing sites, comments, language.
// What the extension asks for (key, not cookie) or takes minutes (tags, DESIGN.md) stays in app/api.
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { withCtx, getSession, canManage, HttpError } from "@/lib/workspace";
import { addItem, deleteItem } from "@/lib/items";
import { addComment, deleteComment } from "@/lib/comments";
import { siteTextWithin } from "@/lib/extract";
import { normalizeWebUrl, guessName, typeFromUrl } from "@/lib/url";
import { db, schema } from "@/lib/db";
import { getErrors } from "@/lib/i18n";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, isLocale } from "@/lib/i18n/locale";
import type { CommentAttachment } from "@/types/inspo";

/** Only the URL is required: name and collection are inferred if missing. */
export async function addInspo(input: { web: string; name?: string; type?: string; note?: string; subNote?: string }) {
  return withCtx(async (ctx) => {
    const web = normalizeWebUrl(input.web ?? "");
    if (!web) throw new HttpError(400, (await getErrors()).badUrl);
    return addItem(ctx.workspace.id, {
      name: input.name?.trim() || guessName(web, await siteTextWithin(web)),
      web,
      type: input.type?.trim() || typeFromUrl(web),
      note: input.note, subNote: input.subNote,
      author: ctx.user.name || ctx.user.email,
      createdBy: ctx.user.id,
    });
  });
}

/** Any member can remove a card (with its thread). If it was already gone, it is not an error. */
export async function removeInspo(id: string) {
  return withCtx(async (ctx) => { await deleteItem(ctx.workspace.id, id); });
}

/** Attachments are uploaded first via /api/comments/upload; only their URLs arrive here. */
export async function postComment(itemId: string, body: string, attachments: CommentAttachment[]) {
  return withCtx(async (ctx) =>
    addComment(ctx.workspace.id, { itemId, authorId: ctx.user.id, authorName: ctx.user.name || ctx.user.email.split("@")[0], body: String(body ?? ""), attachments }));
}

/** Own comments, or any if they manage the workspace. */
export async function removeComment(id: string) {
  return withCtx(async (ctx) => {
    if (!(await deleteComment(ctx.workspace.id, id, ctx.user.id, canManage(ctx.workspace.role)))) {
      throw new HttpError(403, (await getErrors()).cannotDeleteComment);
    }
  });
}

/** The cookie is what each page reads; with a session it is also saved on the account (language of their emails). */
export async function setLanguage(lang: string): Promise<void> {
  if (!isLocale(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: LANG_COOKIE_MAX_AGE, sameSite: "lax" });
  const session = await getSession();
  if (session) await db.update(schema.user).set({ language: lang, updatedAt: new Date() }).where(eq(schema.user.id, session.user.id));
}

/**
 * A shared /i/<id> link can point to an inspiration in another of the person's workspaces.
 * Returns that workspace when the person is a member of it, so the client can switch to it; null otherwise.
 * It never says whether an item exists in a workspace the person cannot see.
 */
export async function workspaceOfItem(itemId: string) {
  return withCtx(async (ctx) => {
    const [row] = await db.select({ organizationId: schema.inspoItem.organizationId })
      .from(schema.inspoItem).where(eq(schema.inspoItem.id, itemId)).limit(1);
    if (!row || !ctx.workspaces.some((w) => w.id === row.organizationId)) return null;
    return row.organizationId;
  });
}
