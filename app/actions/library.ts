"use server";
// Library changes made by the interface itself: adding and removing sites, comments, language.
// What the extension asks for (key, not cookie) or takes minutes (DESIGN.md) stays in app/api.
// Tagging is the exception: an add starts its item's job after answering (lib/tag-jobs.ts), so it runs
// whatever the browser does next. The library pages give their actions the time for it (maxDuration).
import { cookies } from "next/headers";
import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { withCtx, getSession, canManage, HttpError, type ActionResult } from "@/lib/workspace";
import { addItem, deleteItem, deleteItems, deletableIds, setItemNote, editUserTags } from "@/lib/items";
import { startTagJob } from "@/lib/tag-jobs";
import { embedItems, staleEmbedding } from "@/lib/embed";
import { taggerEnabled } from "@/lib/tagger";
import { createProject, projectForBoard, renameProject, deleteProject, startedProject, fileItems, unfileItems, startProject } from "@/lib/projects";
import { castVotes, closePolish, restoreForgotten } from "@/lib/polish-votes";
import { ownsMediaFile, deleteMediaFile } from "@/lib/media";
import { deleteTextFile } from "@/lib/text-refs";
import { fileExists, keyOf } from "@/lib/storage";
import { addComment, deleteComment } from "@/lib/comments";
import { nameFor } from "@/lib/item-name";
import { z } from "zod";
import { addMany, type AddResult, type NewRef } from "@/lib/add-many";
import { MAX_IMAGES_PER_BATCH, MAX_PER_BATCH } from "@/lib/batch-limits";
import { boardOf, type Platform } from "@/lib/boards/match";
import { MAX_TEXT, type Entry, type Skipped } from "@/lib/boards/entries";
import { readBoard, BoardError, type BoardFailure } from "@/lib/boards/read";
import { allow } from "@/lib/rate-limit";
import { normalizeWebUrl, typeFromUrl, nameFromFile } from "@/lib/url";
import { db, schema } from "@/lib/db";
import { getErrors } from "@/lib/i18n";
import { log, recordFailure } from "@/lib/log";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, isLocale } from "@/lib/i18n/locale";
import type { CommentAttachment, CommentAnchor, InspoItem, PolishChoice } from "@/types/inspo";

/** Its meaning vector, made again after answering. Its row's vector is already null (the edit cleared it),
 *  so a failure leaves it for the worker instead of keeping the old vector. */
function embedAfter(itemId: string) {
  after(() => embedItems([itemId]).catch((err) => log.warn("embed.deferred", { ref: itemId, err })));
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
    if (input.projectId && item.id) await fileItems(ctx.workspace.id, input.projectId, [item.id], ctx.user.id).catch((e) => void recordFailure("action", "file in project", e, { ref: input.projectId }));
    startTagging(ctx.workspace.id, item.id, ctx.user.id);
    return item;
  });
}

export type BoardRead =
  | { ok: true; name: string; platform: Platform; entries: Entry[]; skipped: Skipped; capped: boolean }
  | { ok: false; reason: BoardFailure };

/** What Criterio can save of a board on Are.na, Pinterest or Cosmos, to import with importBatch. Creates nothing. */
export async function readBoardAction(input: string): Promise<ActionResult<BoardRead>> {
  return withCtx(async (ctx) => {
    const ref = boardOf(String(input ?? ""));
    if (!ref) throw new HttpError(400, (await getErrors()).badUrl);
    if (!(await allow(`board:${ctx.user.id}`, 10, 10 * 60 * 1000))) throw new HttpError(429, (await getErrors()).tooMany);
    try {
      const b = await readBoard(ref);
      return { ok: true, name: b.name, platform: b.platform, entries: b.entries, skipped: b.skipped, capped: b.capped };
    } catch (e) {
      if (!(e instanceof BoardError)) throw e;
      log.warn("board.not_read", { reason: e.reason, err: e });
      return { ok: false, reason: e.reason };
    }
  });
}

const entryTitle = z.string().max(300).optional();
const BoardBatch = z.array(z.discriminatedUnion("kind", [
  z.object({ kind: z.enum(["web", "video", "post"]), url: z.string().max(2048), title: entryTitle }),
  z.object({ kind: z.literal("image"), images: z.array(z.string().max(2048)).min(1).max(3), page: z.string().max(2048), title: entryTitle }),
  z.object({ kind: z.literal("text"), text: z.string().max(MAX_TEXT), page: z.string().max(2048), title: entryTitle }),
])).max(MAX_PER_BATCH).refine((b) => b.length <= MAX_IMAGES_PER_BATCH || !b.some((e) => e.kind === "image"));

/** What addMany is given for an entry: its address, or the page an image or a text was found on */
const refOf = (e: Entry): NewRef =>
  e.kind === "image" ? { url: e.page, title: e.title, image: e.images }
  : e.kind === "text" ? { url: e.page, title: e.title, text: e.text }
  : { url: e.url, title: e.title };

/** One batch of a board's entries (batchesOf in lib/boards/entries.ts), filed in the board's project (boardProject; what was
 *  already saved goes there too). The results keep the order of the batch. */
export async function importBatch(projectId: string, entries: Entry[]): Promise<ActionResult<{ results: AddResult[]; added: InspoItem[] }>> {
  return withCtx(async (ctx) => {
    const batch = BoardBatch.safeParse(entries);
    if (!batch.success) throw new HttpError(400, (await getErrors()).badBody);
    return addMany({ workspaceId: ctx.workspace.id, user: ctx.user }, batch.data.map(refOf), { source: "board", projectId: String(projectId) });
  });
}

/** The project a board's batches go to: the one already named after the board, made the first time */
export async function boardProject(name: string) {
  return withCtx(async (ctx) => projectForBoard(ctx.workspace.id, String(name), ctx.user.id));
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

/** A project goes with everything the team decided in it: whoever manages the workspace, or whoever started it */
export async function removeProject(id: string) {
  return withCtx(async (ctx) => {
    if (!canManage(ctx.workspace.role) && !(await startedProject(ctx.workspace.id, String(id), ctx.user.id))) {
      throw new HttpError(403, (await getErrors()).projectNotYours);
    }
    await deleteProject(ctx.workspace.id, String(id));
  });
}

/** Files items in a project (on) or takes them out (off). */
export async function setFiled(projectId: string, itemIds: string[], on: boolean) {
  return withCtx(async (ctx) => {
    const ids = Array.isArray(itemIds) ? itemIds.map(String).slice(0, 500) : [];
    if (on) await fileItems(ctx.workspace.id, String(projectId), ids, ctx.user.id);
    else await unfileItems(ctx.workspace.id, String(projectId), ids);
  });
}

// Polish as a team (lib/polish-votes.ts): any member votes, whoever manages the workspace closes
export async function votePolish(projectId: string, itemIds: string[], vote: PolishChoice | null) {
  return withCtx(async (ctx) => castVotes(ctx.workspace.id, String(projectId), Array.isArray(itemIds) ? itemIds.map(String).slice(0, 2000) : [], ctx.user.id, vote));
}

export async function closeProjectPolish(projectId: string, resolve: Record<string, PolishChoice>) {
  return withCtx(async (ctx) => closePolish(ctx.workspace.id, String(projectId), ctx.user.id, resolve && typeof resolve === "object" ? resolve : {}), { manage: true });
}

export async function restoreToBoard(projectId: string, itemId: string) {
  return withCtx(async (ctx) => restoreForgotten(ctx.workspace.id, String(projectId), String(itemId), ctx.user.id));
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
    if (input.projectId && item.id) await fileItems(ctx.workspace.id, input.projectId, [item.id], ctx.user.id).catch((e) => void recordFailure("action", "file in project", e, { ref: input.projectId }));
    startTagging(ctx.workspace.id, item.id, ctx.user.id);
    return item;
  });
}

/** Removes a card (with its thread): a member the ones they saved, whoever manages the workspace any of them.
 *  If it was already gone, it is not an error. */
export async function removeInspo(id: string) {
  return withCtx(async (ctx) => {
    const [row] = await db.select({ web: schema.inspoItem.web }).from(schema.inspoItem)
      .where(and(eq(schema.inspoItem.organizationId, ctx.workspace.id), eq(schema.inspoItem.id, String(id)))).limit(1);
    if (row && !(await deletableIds(ctx.workspace.id, [String(id)], ctx.user, canManage(ctx.workspace.role))).length) {
      throw new HttpError(403, (await getErrors()).cardsNotYours);
    }
    await deleteItem(ctx.workspace.id, id);
    // An uploaded image or a copied video goes with its card: nothing else points at that file
    if (row) await deleteMediaFile(ctx.workspace.id, row.web);
    if (row) await deleteTextFile(ctx.workspace.id, row.web);
  });
}

/** Several cards at once (the selection bar), in one request. Answers how many were there to remove. */
export async function removeInspos(ids: string[]) {
  return withCtx(async (ctx) => {
    const list = [...new Set((Array.isArray(ids) ? ids : []).map(String))].slice(0, 5000);
    if (!list.length) return 0;
    const rows = await db.select({ id: schema.inspoItem.id, web: schema.inspoItem.web }).from(schema.inspoItem)
      .where(and(eq(schema.inspoItem.organizationId, ctx.workspace.id), inArray(schema.inspoItem.id, list)));
    // All or nothing: a selection with someone else's cards in it is not half deleted
    const mine = await deletableIds(ctx.workspace.id, rows.map((r) => r.id), ctx.user, canManage(ctx.workspace.role));
    if (mine.length < rows.length) throw new HttpError(403, (await getErrors()).cardsNotYours);
    const n = await deleteItems(ctx.workspace.id, list);
    // Uploaded images, copied videos and pasted texts go with their cards, as in removeInspo
    await Promise.all(rows.flatMap((r) => [deleteMediaFile(ctx.workspace.id, r.web), deleteTextFile(ctx.workspace.id, r.web)]));
    return n;
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
