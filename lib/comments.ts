// Comments per inspo, always scoped to a workspace.
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./items";
import { ownsCommentFile, deleteCommentFiles, MAX_ATTACHMENTS } from "./comment-files";
import type { InspoComment, CommentMap, CommentAttachment } from "@/types/inspo";
import { getErrors } from "./i18n";

const C = schema.inspoComment;
const U = schema.user;

const select = {
  id: C.id, itemId: C.itemId, authorId: C.authorId, authorName: C.authorName,
  body: C.body, attachments: C.attachments, createdAt: C.createdAt, authorImage: U.image,
};
type Row = { id: string; itemId: string; authorId: string | null; authorName: string; body: string; attachments: CommentAttachment[]; createdAt: Date; authorImage: string | null };

const toComment = (r: Row): InspoComment => ({
  id: r.id, itemId: r.itemId, authorId: r.authorId, authorName: r.authorName,
  authorImage: r.authorImage ?? null, body: r.body, attachments: Array.isArray(r.attachments) ? r.attachments : [],
  createdAt: r.createdAt.toISOString(),
});

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

export async function addComment(organizationId: string, input: { itemId: string; authorId: string; authorName: string; body: string; attachments?: unknown }): Promise<InspoComment> {
  const body = input.body.trim();
  const attachments = cleanAttachments(organizationId, input.attachments);
  if (!body && !attachments.length) throw new Error((await getErrors()).emptyComment);
  const [item] = await db.select({ id: schema.inspoItem.id }).from(schema.inspoItem)
    .where(and(eq(schema.inspoItem.id, input.itemId), eq(schema.inspoItem.organizationId, organizationId))).limit(1);
  if (!item) throw new Error((await getErrors()).itemNotInWorkspace);
  const row = { id: newId(), organizationId, itemId: input.itemId, authorId: input.authorId, authorName: input.authorName, body: body.slice(0, 4000), attachments, createdAt: new Date(), editedAt: null };
  await db.insert(C).values(row);
  const [u] = await db.select({ image: U.image }).from(U).where(eq(U.id, input.authorId)).limit(1);
  return toComment({ ...row, authorImage: u?.image ?? null });
}

/** Deletes one's own comment (or any if `admin`) and its screenshots. Returns false if it didn't exist or wasn't theirs. */
export async function deleteComment(organizationId: string, id: string, userId: string, admin: boolean): Promise<boolean> {
  const where = admin
    ? and(eq(C.id, id), eq(C.organizationId, organizationId))
    : and(eq(C.id, id), eq(C.organizationId, organizationId), eq(C.authorId, userId));
  const [row] = await db.select({ attachments: C.attachments }).from(C).where(where).limit(1);
  if (!row) return false;
  const res = await db.delete(C).where(where);
  if ((res.rowsAffected ?? 0) === 0) return false;
  const urls = Array.isArray(row.attachments) ? row.attachments.map((a) => a.url) : [];
  if (urls.length) await deleteCommentFiles(organizationId, urls);
  return true;
}
