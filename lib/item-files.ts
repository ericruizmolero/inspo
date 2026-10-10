// Files that hang off items: the manual thumbnail and the screenshots attached to comments.
// The database cascades delete the rows, but storage knows nothing about them, so whoever
// deletes items collects the file URLs first and drops them afterwards. A whole workspace goes by
// storage prefix instead (lib/workspace-delete.ts).
import "server-only";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { deleteThumbnailFiles } from "./thumbnails";
import { deleteCommentFiles } from "./comment-files";
import { log } from "./log";

export interface ItemFiles { thumbnails: string[]; attachments: string[] }

/** File URLs of these items */
export async function collectItemFiles(organizationId: string, itemIds: string[]): Promise<ItemFiles> {
  const T = schema.inspoItem, C = schema.inspoComment;
  if (!itemIds.length) return { thumbnails: [], attachments: [] };
  const [thumbs, comments] = await Promise.all([
    db.select({ url: T.thumbnailUrl }).from(T).where(and(
      eq(T.organizationId, organizationId), isNotNull(T.thumbnailUrl), inArray(T.id, itemIds),
    )),
    db.select({ attachments: C.attachments }).from(C).where(and(
      eq(C.organizationId, organizationId), inArray(C.itemId, itemIds),
    )),
  ]);
  return {
    thumbnails: thumbs.map((r) => r.url!),
    attachments: comments.flatMap((r) => (Array.isArray(r.attachments) ? r.attachments.map((a) => a.url) : [])),
  };
}

/**
 * Deletes the files no row points to anymore. Call it after deleting or changing the rows.
 * The check keeps a file that another item or comment still uses: as a thumbnail, or as the item itself (an
 * uploaded image is its own thumbnail until its card copy replaces it, and the original must stay: it is the
 * reference, what the sheet shows and what "open the image" opens; 2026-10-08). Never throws.
 */
export async function dropUnusedFiles(organizationId: string, files: ItemFiles): Promise<void> {
  try {
    const thumbs = [...new Set(files.thumbnails)], atts = [...new Set(files.attachments)];
    const [usedThumbs, usedWebs, usedAtts] = await Promise.all([
      thumbs.length
        ? db.select({ url: schema.inspoItem.thumbnailUrl }).from(schema.inspoItem).where(inArray(schema.inspoItem.thumbnailUrl, thumbs))
        : [],
      thumbs.length
        ? db.select({ url: schema.inspoItem.web }).from(schema.inspoItem).where(inArray(schema.inspoItem.web, thumbs))
        : [],
      atts.length
        ? db.execute<{ url: string }>(sql`select distinct a->>'url' as url from ${schema.inspoComment}, jsonb_array_elements(${schema.inspoComment.attachments}) a where a->>'url' in ${atts}`).then((r) => r.rows)
        : [],
    ]);
    const keepThumbs = new Set([...usedThumbs, ...usedWebs].map((r) => r.url)), keepAtts = new Set(usedAtts.map((r) => r.url));
    await Promise.all([
      deleteThumbnailFiles(organizationId, thumbs.filter((u) => !keepThumbs.has(u))),
      deleteCommentFiles(organizationId, atts.filter((u) => !keepAtts.has(u))),
    ]);
  } catch (e) {
    log.warn("storage.cleanup_failed", { err: e });
  }
}
