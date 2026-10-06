// Access to inspiration items, always scoped to a workspace (organizationId).
import "server-only";
import { and, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { db, schema } from "./db";
import type { InspoItem, InspoTags, TagMap, TagStatus, UserTags } from "@/types/inspo";
import type { ThumbnailMap } from "./thumbnails";
import { webKeyOf } from "./url";
import { getErrors } from "./i18n";
import { HttpError, newId } from "./workspace-core";
import { collectItemFiles, dropUnusedFiles } from "./item-files";
import { statusOf } from "./tag-jobs";
import { cleanTag, MAX_ADDED } from "./taxonomy";

const T = schema.inspoItem;
// Every column but the embedding: 1024 floats per row that only search by meaning reads (lib/embed.ts)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { embedding: _e, embeddingAt: _ea, ...ROW } = getTableColumns(T);
export const ITEM_COLUMNS = ROW;
export type ItemRow = Omit<typeof T.$inferSelect, "embedding" | "embeddingAt">;
type Row = ItemRow;

const TYPES = new Set(["inspiration", "videos", "ideas", "documentaries"]);
export { newId };

/** Normalizes a URL for dedup: no spaces, no trailing slash, lowercase host. */
export { webKeyOf };

export function normalizeType(v: string | undefined): InspoItem["type"] {
  return TYPES.has(v ?? "") ? (v as InspoItem["type"]) : "inspiration";
}

/** DD/MM/YYYY ↔ YYYY-MM-DD */
export function isoToDmy(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
export function dmyToIso(es: string): string {
  const m = es.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(es);
  return isNaN(+d) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

export function rowToItem(r: Row): InspoItem {
  return {
    id: r.id,
    name: r.name,
    web: r.web,
    date: isoToDmy(r.date),
    addedBy: r.author,
    type: normalizeType(r.type),
    note: r.note,
    subNote: r.subNote || undefined,
    ...(r.via ? { via: r.via } : {}),
  };
}

/** The workspace's rows, newest first. With `webs`, only those addresses. */
export async function listRows(organizationId: string, webs?: string[]): Promise<Row[]> {
  const where = webs ? and(eq(T.organizationId, organizationId), inArray(T.web, webs)) : eq(T.organizationId, organizationId);
  return db.select(ROW).from(T).where(where).orderBy(desc(T.date), desc(T.createdAt));
}

export async function listItems(organizationId: string): Promise<InspoItem[]> {
  return (await listRows(organizationId)).map(rowToItem);
}

/** An item's tags as the client gets them: the AI's, with the workspace's edits attached */
export const tagsOfRow = (r: Pick<Row, "tagsJson" | "tagsUser">): InspoTags | null =>
  r.tagsJson ? { ...r.tagsJson, user: r.tagsUser ?? undefined } : null;

/** Items + thumbnail map + tag map + the tagging jobs not done, in a single query. With `webs`, only those. */
export async function loadWorkspaceData(organizationId: string, webs?: string[]) {
  const rows = await listRows(organizationId, webs);
  const items = rows.map(rowToItem);
  const thumbnailMap: ThumbnailMap = {};
  const tagMap: TagMap = {};
  const tagJobs: Record<string, TagStatus> = {};
  for (const r of rows) {
    if (r.thumbnailUrl) thumbnailMap[r.web] = r.thumbnailUrl;
    const tags = tagsOfRow(r);
    if (tags) tagMap[r.web] = tags;
    const job = statusOf(r);
    if (job) tagJobs[r.web] = job;
  }
  return { items, thumbnailMap, tagMap, tagJobs };
}

/** Adds or removes one tag by hand. `remove` is a selector ("s:pricing", "k:coffee", "t:dark").
 *  Returns the item's edits after the change, or null if the item isn't in the workspace. */
export async function editUserTags(organizationId: string, id: string, change: { add?: string; remove?: string }): Promise<UserTags | null> {
  const where = and(eq(T.organizationId, organizationId), eq(T.id, id));
  const [row] = await db.select({ user: T.tagsUser }).from(T).where(where).limit(1);
  if (!row) return null;
  const added = new Set(row.user?.added ?? []), removed = new Set(row.user?.removed ?? []);
  const add = change.add ? cleanTag(change.add) : "";
  if (add) { removed.delete(`k:${add}`); if (added.size < MAX_ADDED) added.add(add); }
  if (change.remove) {
    const sel = change.remove.slice(0, 60);
    // A tag somebody added just goes; one the AI gave is remembered as removed, so a new tagging keeps it out
    if (sel.startsWith("k:")) added.delete(sel.slice(2));
    removed.add(sel);
  }
  const user: UserTags = { added: [...added], removed: [...removed] };
  // New words, new meaning: the vector is cleared in the same write (lib/embed.ts makes it again)
  await db.update(T).set({ tagsUser: user, embedding: null, updatedAt: new Date() }).where(where);
  return user;
}

export async function findByWeb(organizationId: string, web: string): Promise<Row | null> {
  const [r] = await db.select(ROW).from(T)
    .where(and(eq(T.organizationId, organizationId), eq(T.webKey, webKeyOf(web)))).limit(1);
  return r ?? null;
}

/** The first item saved at any of these addresses, or null */
export async function findByWebs(organizationId: string, webs: string[]): Promise<Row | null> {
  if (!webs.length) return null;
  const [r] = await db.select(ROW).from(T)
    .where(and(eq(T.organizationId, organizationId), inArray(T.webKey, webs.map(webKeyOf)))).limit(1);
  return r ?? null;
}

export interface NewItem {
  name: string; web: string; type?: string; note?: string; subNote?: string;
  author: string; createdBy?: string | null; dateIso?: string;
  /** Uploaded images are their own thumbnail */
  thumbnailUrl?: string | null;
  /** The AI client it was saved from over MCP ("Claude"); nothing for the app and the extension */
  via?: string | null;
}

export async function addItem(organizationId: string, input: NewItem): Promise<InspoItem> {
  const web = input.web.trim().replace(/\/+$/, "");
  const existing = await findByWeb(organizationId, web);
  if (existing) throw new HttpError(409, (await getErrors()).urlAlreadyHere);
  const now = new Date();
  const row: typeof T.$inferInsert = {
    id: newId(),
    organizationId,
    name: input.name.trim(),
    web,
    webKey: webKeyOf(web),
    date: input.dateIso ?? now.toISOString().slice(0, 10),
    type: normalizeType(input.type),
    author: input.author,
    createdBy: input.createdBy ?? null,
    note: (input.note ?? "").trim(),
    subNote: (input.subNote ?? "").trim() || null,
    thumbnailUrl: input.thumbnailUrl ?? null,
    via: input.via?.trim().slice(0, 40) || null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(T).values(row);
  return rowToItem(row as Row);
}

export async function hasItem(organizationId: string, web: string): Promise<boolean> {
  const [r] = await db.select({ id: T.id }).from(T)
    .where(and(eq(T.organizationId, organizationId), eq(T.webKey, webKeyOf(web)))).limit(1);
  return !!r;
}

/** Sets or clears the manual thumbnail. The file it replaces is deleted if nothing else uses it. */
/** Moves the item to another day (YYYY-MM-DD): what an import learns about a post once it has read it */
export async function setItemDate(organizationId: string, web: string, dateIso: string): Promise<boolean> {
  const res = await db.update(T).set({ date: dateIso, updatedAt: new Date() })
    .where(and(eq(T.organizationId, organizationId), eq(T.webKey, webKeyOf(web))));
  return (res.rowCount ?? 0) > 0;
}

export async function setThumbnail(organizationId: string, web: string, thumbnailUrl: string | null): Promise<boolean> {
  const where = and(eq(T.organizationId, organizationId), eq(T.webKey, webKeyOf(web)));
  const [old] = await db.select({ url: T.thumbnailUrl }).from(T).where(where).limit(1);
  const res = await db.update(T).set({ thumbnailUrl, updatedAt: new Date() }).where(where);
  if (old?.url && old.url !== thumbnailUrl) await dropUnusedFiles(organizationId, { thumbnails: [old.url], attachments: [] });
  return (res.rowCount ?? 0) > 0;
}

export async function setTags(organizationId: string, web: string, tags: InspoTags): Promise<void> {
  await db.update(T).set({ tagsJson: tags, tagStatus: "done", updatedAt: new Date() })
    .where(and(eq(T.organizationId, organizationId), eq(T.webKey, webKeyOf(web))));
}

/** Many items at once: one UPDATE per 500 items instead of one per item. */
export async function setTagsBulk(organizationId: string, map: TagMap): Promise<void> {
  const rows = Object.entries(map).map(([web, tags]) => sql`(${webKeyOf(web)}, ${JSON.stringify(tags)}::jsonb)`);
  for (let i = 0; i < rows.length; i += 500) {
    await db.execute(sql`
      update ${T} set tags_json = v.tags, tag_status = 'done', updated_at = now()
      from (values ${sql.join(rows.slice(i, i + 500), sql`, `)}) as v(web_key, tags)
      where ${T.organizationId} = ${organizationId} and ${T.webKey} = v.web_key`);
  }
}

/** Does this thumbnail URL belong to the workspace? (for the image proxy) */
export async function ownsThumbnail(organizationId: string, thumbnailUrl: string): Promise<boolean> {
  const [r] = await db.select({ id: T.id }).from(T)
    .where(and(eq(T.organizationId, organizationId), eq(T.thumbnailUrl, thumbnailUrl))).limit(1);
  return !!r;
}

export async function webSet(organizationId: string): Promise<Set<string>> {
  const rows = await db.select({ web: T.web }).from(T).where(eq(T.organizationId, organizationId));
  return new Set(rows.map((r) => r.web));
}

/**
 * Deletes items. Their comment threads go with them (ON DELETE CASCADE), and their files
 * (thumbnail, comment screenshots) are deleted from storage afterwards. Returns how many went.
 */
export async function deleteItems(organizationId: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const files = await collectItemFiles(organizationId, ids);
  const res = await db.delete(T).where(and(eq(T.organizationId, organizationId), inArray(T.id, ids)));
  if (res.rowCount) await dropUnusedFiles(organizationId, files);
  return res.rowCount ?? 0;
}

/**
 * Rewrites the note (or sub-note) that opens the item's thread.
 * Only whoever saved it, or someone who manages the workspace. Older rows have no createdBy,
 * so for those the saved author name is what proves it is theirs.
 * Returns the updated item, null if it does not exist, false if this person cannot edit it.
 */
export async function setItemNote(
  organizationId: string, id: string, field: "note" | "subNote", text: string,
  user: { id: string; name: string; email: string }, admin: boolean,
): Promise<InspoItem | null | false> {
  const [row] = await db.select(ROW).from(T).where(and(eq(T.organizationId, organizationId), eq(T.id, id))).limit(1);
  if (!row) return null;
  const own = row.createdBy ? row.createdBy === user.id : row.author === (user.name || user.email);
  if (!own && !admin) return false;
  const clean = text.replace(/\r\n/g, "\n").trim().slice(0, 4000);
  const patch = field === "note" ? { note: clean } : { subNote: clean || null };
  const updatedAt = new Date();
  // New words, new meaning: the vector is cleared in the same write (lib/embed.ts makes it again)
  await db.update(T).set({ ...patch, embedding: null, updatedAt }).where(and(eq(T.organizationId, organizationId), eq(T.id, id)));
  return rowToItem({ ...row, ...patch, updatedAt });
}

export async function deleteItem(organizationId: string, id: string): Promise<boolean> {
  return (await deleteItems(organizationId, [id])) > 0;
}
