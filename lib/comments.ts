// Comments per inspo, always scoped to a workspace. A comment is about the whole reference and can have
// replies, one level deep.
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "./db";
import type { CommentReactionRow } from "./db/schema";
import { newId } from "./items";
import { ownsCommentFile, deleteCommentFiles, MAX_ATTACHMENTS } from "./comment-files";
import type { InspoComment, CommentMap, CommentAttachment } from "@/types/inspo";
import { getErrors } from "./i18n";
import { HttpError } from "./workspace-core";
import { inBackground, notifyReply } from "./notify";
import { groupReactions, isReaction, MAX_REACTIONS } from "./reactions";

const C = schema.inspoComment;
const U = schema.user;

const select = {
  id: C.id, itemId: C.itemId, authorId: C.authorId, authorName: C.authorName,
  body: C.body, attachments: C.attachments, createdAt: C.createdAt, authorImage: U.image,
  parentId: C.parentId, reactions: C.reactions,
};
type Row = {
  id: string; itemId: string; authorId: string | null; authorName: string; body: string; attachments: CommentAttachment[]; createdAt: Date; authorImage: string | null;
  parentId: string | null; reactions: CommentReactionRow[];
};

const toComment = (r: Row): InspoComment => ({
  id: r.id, itemId: r.itemId, authorId: r.authorId, authorName: r.authorName,
  authorImage: r.authorImage ?? null, body: r.body, attachments: Array.isArray(r.attachments) ? r.attachments : [],
  ...(r.parentId ? { parentId: r.parentId } : {}),
  ...(Array.isArray(r.reactions) && r.reactions.length ? { reactions: groupReactions(r.reactions) } : {}),
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

/** All workspace comments grouped by item: the shared view of a whole workspace (lib/share-view.ts) */
export async function listComments(organizationId: string): Promise<CommentMap> {
  const rows = await db.select(select).from(C).leftJoin(U, eq(C.authorId, U.id))
    .where(eq(C.organizationId, organizationId)).orderBy(asc(C.createdAt));
  const map: CommentMap = {};
  for (const r of rows) (map[r.itemId] ??= []).push(toComment(r));
  return map;
}

/** The threads of these items, grouped by item: what the library sends with each page of references */
export async function listCommentsOf(organizationId: string, itemIds: string[]): Promise<CommentMap> {
  if (!itemIds.length) return {};
  const rows = await db.select(select).from(C).leftJoin(U, eq(C.authorId, U.id))
    .where(and(eq(C.organizationId, organizationId), inArray(C.itemId, itemIds))).orderBy(asc(C.createdAt));
  const map: CommentMap = {};
  for (const r of rows) (map[r.itemId] ??= []).push(toComment(r));
  return map;
}

/** Comments written or edited after `after`, oldest first (lib/pulse.ts) */
export async function commentsSince(organizationId: string, after: Date): Promise<InspoComment[]> {
  const rows = await db.select(select).from(C).leftJoin(U, eq(C.authorId, U.id))
    .where(and(eq(C.organizationId, organizationId), sql`coalesce(${C.editedAt}, ${C.createdAt}) > ${after}`)).orderBy(asc(C.createdAt));
  return rows.map(toComment);
}

/** The thread of one item, oldest first. */
export async function listItemComments(organizationId: string, itemId: string): Promise<InspoComment[]> {
  const rows = await db.select(select).from(C).leftJoin(U, eq(C.authorId, U.id))
    .where(and(eq(C.organizationId, organizationId), eq(C.itemId, itemId))).orderBy(asc(C.createdAt));
  return rows.map(toComment);
}

/** A new comment, or with `parentId` a reply to one. A reply goes under a comment of the same reference that
 *  is not itself a reply. */
export async function addComment(organizationId: string, input: { itemId: string; authorId: string; authorName: string; body: string; attachments?: unknown; parentId?: unknown }): Promise<InspoComment> {
  const body = input.body.trim();
  const attachments = cleanAttachments(organizationId, input.attachments);
  if (!body && !attachments.length) throw new HttpError(400, (await getErrors()).emptyComment);
  const [item] = await db.select({ id: schema.inspoItem.id }).from(schema.inspoItem)
    .where(and(eq(schema.inspoItem.id, input.itemId), eq(schema.inspoItem.organizationId, organizationId))).limit(1);
  if (!item) throw new HttpError(400, (await getErrors()).itemNotInWorkspace);
  const parentId = typeof input.parentId === "string" && input.parentId ? input.parentId : null;
  let parent: { parentId: string | null; authorId: string | null; body: string } | undefined;
  if (parentId) {
    [parent] = await db.select({ parentId: C.parentId, authorId: C.authorId, body: C.body }).from(C)
      .where(and(eq(C.id, parentId), eq(C.organizationId, organizationId), eq(C.itemId, input.itemId))).limit(1);
    if (!parent || parent.parentId) throw new HttpError(400, (await getErrors()).replyGone);
  }
  const row = {
    id: newId(), organizationId, itemId: input.itemId, authorId: input.authorId, authorName: input.authorName, body: body.slice(0, 4000), attachments,
    parentId, reactions: [], createdAt: new Date(), editedAt: null,
  };
  await db.insert(C).values(row);
  // Whoever wrote the comment answered hears of it by email, once this has answered (lib/notify.ts)
  if (parent) {
    const { authorId, body: mine } = parent;
    inBackground(async () => { await notifyReply(organizationId, { toUserId: authorId, fromUserId: input.authorId, fromName: input.authorName, mine, theirs: body, path: `/i/${encodeURIComponent(input.itemId)}` }); });
  }
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

/** Gives this person's reaction to a comment of the workspace, or takes it away if they had given it. One statement,
 *  so two people reacting at once both count. It touches edited_at, so the pulse carries the new reactions to the
 *  other boards. Returns the comment as it is now. */
export async function toggleReaction(organizationId: string, commentId: string, user: { id: string; name: string }, emoji: unknown): Promise<InspoComment> {
  const errors = await getErrors();
  if (!isReaction(emoji)) throw new HttpError(400, errors.badBody);
  const mine = sql`jsonb_build_array(jsonb_build_object('e', ${emoji}::text, 'u', ${user.id}::text))`;
  const res = await db.execute<{ id: string }>(sql`
    update inspo_comment set
      reactions = case
        when reactions @> ${mine} then coalesce((
          select jsonb_agg(r order by i) from jsonb_array_elements(reactions) with ordinality as x(r, i)
          where not (r->>'e' = ${emoji}::text and r->>'u' = ${user.id}::text)), '[]'::jsonb)
        else reactions || jsonb_build_array(jsonb_build_object('e', ${emoji}::text, 'u', ${user.id}::text, 'n', ${user.name.slice(0, 120)}::text))
      end,
      edited_at = now()
    where id = ${commentId} and organization_id = ${organizationId}
      and (reactions @> ${mine} or jsonb_array_length(reactions) < ${MAX_REACTIONS})
    returning id`);
  if (!res.rows.length) {
    const [there] = await db.select({ id: C.id }).from(C).where(and(eq(C.id, commentId), eq(C.organizationId, organizationId))).limit(1);
    throw new HttpError(there ? 409 : 404, there ? errors.tooManyReactions : errors.reactionGone);
  }
  const [row] = await db.select(select).from(C).leftJoin(U, eq(C.authorId, U.id))
    .where(and(eq(C.id, commentId), eq(C.organizationId, organizationId))).limit(1);
  return toComment(row);
}
