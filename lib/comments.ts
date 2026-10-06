// Comments per inspo, always scoped to a workspace. A comment is pinned (a post-it, with an anchor) or about
// the whole reference; either can have replies, one level deep.
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./items";
import { ownsCommentFile, deleteCommentFiles, MAX_ATTACHMENTS } from "./comment-files";
import type { InspoComment, CommentMap, CommentAttachment, CommentAnchor } from "@/types/inspo";
import { getErrors } from "./i18n";
import { HttpError } from "./workspace-core";

const C = schema.inspoComment;
const U = schema.user;

const select = {
  id: C.id, itemId: C.itemId, authorId: C.authorId, authorName: C.authorName,
  body: C.body, attachments: C.attachments, createdAt: C.createdAt, authorImage: U.image,
  anchorX: C.anchorX, anchorY: C.anchorY, anchorH: C.anchorH, parentId: C.parentId,
};
type Row = {
  id: string; itemId: string; authorId: string | null; authorName: string; body: string; attachments: CommentAttachment[]; createdAt: Date; authorImage: string | null;
  anchorX: number | null; anchorY: number | null; anchorH: number | null; parentId: string | null;
};

const toComment = (r: Row): InspoComment => ({
  id: r.id, itemId: r.itemId, authorId: r.authorId, authorName: r.authorName,
  authorImage: r.authorImage ?? null, body: r.body, attachments: Array.isArray(r.attachments) ? r.attachments : [],
  ...(r.anchorX !== null && r.anchorY !== null && r.anchorH !== null ? { anchor: { x: r.anchorX, y: r.anchorY, h: r.anchorH } } : {}),
  ...(r.parentId ? { parentId: r.parentId } : {}),
  createdAt: r.createdAt.toISOString(),
});

/** A pin inside the page, or none: anything else is dropped rather than refused */
function cleanAnchor(input: unknown): CommentAnchor | null {
  if (!input || typeof input !== "object") return null;
  const a = input as Record<string, unknown>;
  const x = Number(a.x), y = Number(a.y), h = Math.round(Number(a.h));
  if (![x, y, h].every(Number.isFinite)) return null;
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), h: Math.max(1, Math.min(20000, h)) };
}

/** Only attachments uploaded by this workspace, with sane dimensions, are kept. */
function cleanAttachments(organizationId: string, input: unknown): CommentAttachment[] {
  if (!Array.isArray(input)) return [];
  const out: CommentAttachment[] = [];
  for (const a of input.slice(0, MAX_ATTACHMENTS)) {
    if (!a || typeof a.url !== "string" || !ownsCommentFile(organizationId, a.url)) continue;
    const w = Math.round(Number(a.w)), h = Math.round(Number(a.h));
    out.push({
      url: a.url,
      w: w > 0 && w < 20000 ? w : 0,
      h: h > 0 && h < 20000 ? h : 0,
      ...(typeof a.name === "string" && a.name ? { name: a.name.slice(0, 120) } : {}),
    });
  }
  return out;
}

/** All workspace comments grouped by item (small volume, one query). */
export async function listComments(organizationId: string): Promise<CommentMap> {
  const rows = await db.select(select).from(C).leftJoin(U, eq(C.authorId, U.id))
    .where(eq(C.organizationId, organizationId)).orderBy(asc(C.createdAt));
  const map: CommentMap = {};
  for (const r of rows) (map[r.itemId] ??= []).push(toComment(r));
  return map;
}

/** The thread of one item, oldest first. */
export async function listItemComments(organizationId: string, itemId: string): Promise<InspoComment[]> {
  const rows = await db.select(select).from(C).leftJoin(U, eq(C.authorId, U.id))
    .where(and(eq(C.organizationId, organizationId), eq(C.itemId, itemId))).orderBy(asc(C.createdAt));
  return rows.map(toComment);
}

/** A new comment, or with `parentId` a reply to one. A reply goes under a comment of the same reference that
 *  is not itself a reply, and never carries an anchor. */
export async function addComment(organizationId: string, input: { itemId: string; authorId: string; authorName: string; body: string; attachments?: unknown; anchor?: unknown; parentId?: unknown }): Promise<InspoComment> {
  const body = input.body.trim();
  const attachments = cleanAttachments(organizationId, input.attachments);
  if (!body && !attachments.length) throw new HttpError(400, (await getErrors()).emptyComment);
  const [item] = await db.select({ id: schema.inspoItem.id }).from(schema.inspoItem)
    .where(and(eq(schema.inspoItem.id, input.itemId), eq(schema.inspoItem.organizationId, organizationId))).limit(1);
  if (!item) throw new HttpError(400, (await getErrors()).itemNotInWorkspace);
  const parentId = typeof input.parentId === "string" && input.parentId ? input.parentId : null;
  if (parentId) {
    const [parent] = await db.select({ parentId: C.parentId }).from(C)
      .where(and(eq(C.id, parentId), eq(C.organizationId, organizationId), eq(C.itemId, input.itemId))).limit(1);
    if (!parent || parent.parentId) throw new HttpError(400, (await getErrors()).replyGone);
  }
  const anchor = parentId ? null : cleanAnchor(input.anchor);
  const row = {
    id: newId(), organizationId, itemId: input.itemId, authorId: input.authorId, authorName: input.authorName, body: body.slice(0, 4000), attachments,
    anchorX: anchor?.x ?? null, anchorY: anchor?.y ?? null, anchorH: anchor?.h ?? null, parentId, createdAt: new Date(), editedAt: null,
  };
  await db.insert(C).values(row);
  const [u] = await db.select({ image: U.image }).from(U).where(eq(U.id, input.authorId)).limit(1);
  return toComment({ ...row, authorImage: u?.image ?? null });
}

/** Deletes one's own comment (or any if `admin`), its replies (the foreign key cascades) and the screenshots
 *  of all of them. Returns the item it was on, or false if it didn't exist or wasn't theirs. */
export async function deleteComment(organizationId: string, id: string, userId: string, admin: boolean): Promise<string | false> {
  const where = admin
    ? and(eq(C.id, id), eq(C.organizationId, organizationId))
    : and(eq(C.id, id), eq(C.organizationId, organizationId), eq(C.authorId, userId));
  const [row] = await db.select({ attachments: C.attachments, itemId: C.itemId }).from(C).where(where).limit(1);
  if (!row) return false;
  // Read the replies' files before the cascade takes the rows
  const replies = await db.select({ attachments: C.attachments }).from(C)
    .where(and(eq(C.parentId, id), eq(C.organizationId, organizationId)));
  const res = await db.delete(C).where(where);
  if ((res.rowCount ?? 0) === 0) return false;
  const urls = [row, ...replies].flatMap((r) => (Array.isArray(r.attachments) ? r.attachments.map((a) => a.url) : []));
  if (urls.length) await deleteCommentFiles(organizationId, urls);
  return row.itemId;
}
