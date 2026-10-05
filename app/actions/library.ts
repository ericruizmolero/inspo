"use server";
// Library changes made by the interface itself: adding and removing sites, comments, language.
// What the extension asks for (key, not cookie) or takes minutes (DESIGN.md) stays in app/api.
// Tagging is the exception: an add starts its item's job after answering (lib/tag-jobs.ts), so it runs
// whatever the browser does next. The library pages give their actions the time for it (maxDuration).
import { cookies } from "next/headers";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { withCtx, getSession, canManage, HttpError } from "@/lib/workspace";
import { addItem, deleteItem, setItemNote, editUserTags } from "@/lib/items";
import { startTagJob } from "@/lib/tag-jobs";
import { embedItems, staleEmbedding } from "@/lib/embed";
import { taggerEnabled } from "@/lib/tagger";
import { createProject, renameProject, deleteProject, fileItems, unfileItems, startProject } from "@/lib/projects";
import { ownsMediaFile, deleteMediaFile } from "@/lib/media";
import { deleteTextFile } from "@/lib/text-refs";
import { fileExists, keyOf } from "@/lib/storage";
import { addComment, deleteComment } from "@/lib/comments";
import { nameFor } from "@/lib/item-name";
import { normalizeWebUrl, typeFromUrl, nameFromFile } from "@/lib/url";
import { db, schema } from "@/lib/db";
import { getErrors } from "@/lib/i18n";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, isLocale } from "@/lib/i18n/locale";
import type { CommentAttachment, CommentAnchor } from "@/types/inspo";

/** Its meaning vector, made again after answering. Its row's vector is already null (the edit cleared it),
 *  so a failure leaves it for the worker instead of keeping the old vector. */
function embedAfter(itemId: string) {
  after(() => embedItems([itemId]).catch((e) => console.warn("embed: left for the worker", e instanceof Error ? e.message : e)));
}

/** Its thread changed, which lives in another table: the vector is cleared first, then made again */
async function reembed(itemId: string) {
  await staleEmbedding(itemId);
  embedAfter(itemId);
}

/** Gathers the new item's tags once the add has answered (then the workspace's next pending ones).
 *  The worker retries it if this run fails. */
function startTagging(organizationId: string, itemId: string | undefined, userId: string) {
  if (itemId && taggerEnabled()) after(() => startTagJob(organizationId, itemId, userId));
}

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
    startTagging(ctx.workspace.id, item.id, ctx.user.id);
    return item;
  });
}

// Projects: any member can create, rename and delete them. Deleting one never deletes references.
export async function newProject(name: string) {
  return withCtx(async (ctx) => createProject(ctx.workspace.id, name, ctx.user.id));
}

/** "I have my references": the project stops opening on its board and opens on its system */
export async function markProjectStarted(id: string) {
  return withCtx(async (ctx) => startProject(ctx.workspace.id, String(id)));
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
 *  only its URL arrives here, and it must be in this workspace's media folder and exist:
 *  the browser uploads straight to R2, so the app never saw the file arrive. */
export async function addImage(input: { url: string; fileName?: string; type?: string; note?: string; projectId?: string }) {
  return withCtx(async (ctx) => {
    const url = String(input.url ?? "");
    if (!ownsMediaFile(ctx.workspace.id, url) || !(await fileExists(keyOf(url)!))) throw new HttpError(400, (await getErrors()).imageNotHere);
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
    startTagging(ctx.workspace.id, item.id, ctx.user.id);
    return item;
  });
}

/** Any member can remove a card (with its thread). If it was already gone, it is not an error. */
export async function removeInspo(id: string) {
  return withCtx(async (ctx) => {
    const [row] = await db.select({ web: schema.inspoItem.web }).from(schema.inspoItem)
      .where(and(eq(schema.inspoItem.organizationId, ctx.workspace.id), eq(schema.inspoItem.id, String(id)))).limit(1);
    await deleteItem(ctx.workspace.id, id);
    // An uploaded image or a copied video goes with its card: nothing else points at that file
    if (row) await deleteMediaFile(ctx.workspace.id, row.web);
    if (row) await deleteTextFile(ctx.workspace.id, row.web);
  });
}

/** Attachments are uploaded first via /api/comments/upload; only their URLs arrive here.
 *  With an anchor it is a post-it pinned on the page; with a parent, a reply to that comment. */
export async function postComment(itemId: string, body: string, attachments: CommentAttachment[], anchor?: CommentAnchor, parentId?: string) {
  return withCtx(async (ctx) => {
    const comment = await addComment(ctx.workspace.id, { itemId, authorId: ctx.user.id, authorName: ctx.user.name || ctx.user.email.split("@")[0], body: String(body ?? ""), attachments, anchor, parentId });
    // The thread is searchable
    if (comment.body.trim()) await reembed(String(itemId));
    return comment;
  });
}


/** Own comments, or any if they manage the workspace. */
export async function removeComment(id: string) {
  return withCtx(async (ctx) => {
    const itemId = await deleteComment(ctx.workspace.id, id, ctx.user.id, canManage(ctx.workspace.role));
    if (!itemId) throw new HttpError(403, (await getErrors()).cannotDeleteComment);
    await reembed(itemId);
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
    embedAfter(String(itemId));
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

/** Adds a tag by hand, or removes one (a selector: "s:pricing", "k:coffee", "t:dark"). Any member can.
 *  The edits are the workspace's and stay when the AI tags the item again. */
export async function editTags(itemId: string, change: { add?: string; remove?: string }) {
  return withCtx(async (ctx) => {
    const user = await editUserTags(ctx.workspace.id, String(itemId), {
      add: typeof change.add === "string" ? change.add : undefined,
      remove: typeof change.remove === "string" ? change.remove : undefined,
    });
    if (!user) throw new HttpError(404, (await getErrors()).urlNotInWorkspace);
    embedAfter(String(itemId));
    (await import("@/lib/jev")).clearSearchCache();
    return user;
  });
}
