"use server";
// Library changes made by the interface itself: adding and removing sites, comments, language.
// What the extension asks for (key, not cookie) or takes minutes (tags, DESIGN.md) stays in app/api.
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { withCtx, getSession, canManage, HttpError } from "@/lib/workspace";
import { addItem, deleteItem, setItemNote } from "@/lib/items";
import { createProject, renameProject, deleteProject, fileItems, unfileItems } from "@/lib/projects";
import { ownsMediaFile, deleteMediaFile } from "@/lib/media";
import { addComment, deleteComment } from "@/lib/comments";
import { nameFor } from "@/lib/item-name";
import { normalizeWebUrl, typeFromUrl, nameFromFile } from "@/lib/url";
import { db, schema } from "@/lib/db";
import { getErrors } from "@/lib/i18n";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, isLocale } from "@/lib/i18n/locale";
import type { CommentAttachment } from "@/types/inspo";

/** Only the URL is required: name and collection are inferred if missing.
 *  Added from inside a project, it is filed there too (otherwise it lands in the Inbox). */
export async function addInspo(input: { web: string; name?: string; type?: string; note?: string; subNote?: string; projectId?: string }) {
  return withCtx(async (ctx) => {
    const web = normalizeWebUrl(input.web ?? "");
    if (!web) throw new HttpError(400, (await getErrors()).badUrl);
    const item = await addItem(ctx.workspace.id, {
      name: input.name?.trim() || await nameFor(web),
      web,
      type: input.type?.trim() || typeFromUrl(web),
      note: input.note, subNote: input.subNote,
      author: ctx.user.name || ctx.user.email,
      createdBy: ctx.user.id,
    });
    if (input.projectId && item.id) await fileItems(ctx.workspace.id, input.projectId, [item.id], ctx.user.id).catch(() => {});
    return item;
  });
}

// Projects: any member can create, rename and delete them. Deleting one never deletes references.
export async function newProject(name: string) {
  return withCtx(async (ctx) => createProject(ctx.workspace.id, name, ctx.user.id));
}

export async function editProject(id: string, name: string) {
  return withCtx(async (ctx) => renameProject(ctx.workspace.id, String(id), name));
}

export async function removeProject(id: string) {
  return withCtx(async (ctx) => { await deleteProject(ctx.workspace.id, String(id)); });
}

/** Files items in a project (on) or takes them out (off). */
export async function setFiled(projectId: string, itemIds: string[], on: boolean) {
  return withCtx(async (ctx) => {
    const ids = Array.isArray(itemIds) ? itemIds.map(String).slice(0, 500) : [];
    if (on) await fileItems(ctx.workspace.id, String(projectId), ids, ctx.user.id);
    else await unfileItems(ctx.workspace.id, String(projectId), ids);
  });
}

/** An image (or GIF) as an inspo of its own. The file was uploaded first via /api/media;
 *  only its URL arrives here, and it must be in this workspace's media folder. */
export async function addImage(input: { url: string; fileName?: string; type?: string; note?: string; projectId?: string }) {
  return withCtx(async (ctx) => {
    const url = String(input.url ?? "");
    if (!ownsMediaFile(ctx.workspace.id, url)) throw new HttpError(400, (await getErrors()).imageNotHere);
    const item = await addItem(ctx.workspace.id, {
      name: nameFromFile(String(input.fileName ?? "")) || "Image",
      web: url,
      thumbnailUrl: url,
      type: input.type?.trim() || "inspiration",
      note: input.note,
      author: ctx.user.name || ctx.user.email,
      createdBy: ctx.user.id,
    });
    if (input.projectId && item.id) await fileItems(ctx.workspace.id, input.projectId, [item.id], ctx.user.id).catch(() => {});
    return item;
  });
}

/** Any member can remove a card (with its thread). If it was already gone, it is not an error. */
export async function removeInspo(id: string) {
  return withCtx(async (ctx) => {
    const [row] = await db.select({ web: schema.inspoItem.web }).from(schema.inspoItem)
      .where(and(eq(schema.inspoItem.organizationId, ctx.workspace.id), eq(schema.inspoItem.id, String(id)))).limit(1);
    await deleteItem(ctx.workspace.id, id);
    // An uploaded image goes with its card: nothing else points at that file
    if (row) await deleteMediaFile(ctx.workspace.id, row.web);
  });
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

/** Edits the original note (or sub-note) that opens the thread: whoever saved it, or a manager. */
export async function editNote(itemId: string, field: "note" | "subNote", text: string) {
  return withCtx(async (ctx) => {
    const errors = await getErrors();
    if (field !== "note" && field !== "subNote") throw new HttpError(400, errors.badBody);
    const item = await setItemNote(ctx.workspace.id, String(itemId), field, String(text ?? ""), ctx.user, canManage(ctx.workspace.role));
    if (item === null) throw new HttpError(404, errors.cardGone);
    if (item === false) throw new HttpError(403, errors.cannotEditNote);
    return item;
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
