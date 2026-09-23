// Access to inspiration items, always scoped to a workspace (organizationId).
import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import type { InspoItem, InspoTags, TagMap } from "@/types/inspo";
import type { ThumbnailMap } from "./thumbnails";
import { webKeyOf } from "./url";
import { getErrors } from "./i18n";
import { HttpError, newId } from "./workspace-core";

const T = schema.inspoItem;
type Row = typeof T.$inferSelect;

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
  };
}

export async function listRows(organizationId: string): Promise<Row[]> {
  return db.select().from(T).where(eq(T.organizationId, organizationId)).orderBy(desc(T.date), desc(T.createdAt));
}

export async function listItems(organizationId: string): Promise<InspoItem[]> {
  return (await listRows(organizationId)).map(rowToItem);
}

/** Items + thumbnail map + tag map in a single query. */
export async function loadWorkspaceData(organizationId: string) {
  const rows = await listRows(organizationId);
  const items = rows.map(rowToItem);
  const thumbnailMap: ThumbnailMap = {};
  const tagMap: TagMap = {};
  for (const r of rows) {
    if (r.thumbnailUrl) thumbnailMap[r.web] = r.thumbnailUrl;
    if (r.tagsJson) { try { tagMap[r.web] = JSON.parse(r.tagsJson) as InspoTags; } catch { /* ignore */ } }
  }
  return { items, thumbnailMap, tagMap };
}

export async function findByWeb(organizationId: string, web: string): Promise<Row | null> {
  const [r] = await db.select().from(T)
    .where(and(eq(T.organizationId, organizationId), eq(T.webKey, webKeyOf(web)))).limit(1);
  return r ?? null;
}

export interface NewItem {
  name: string; web: string; type?: string; note?: string; subNote?: string;
  author: string; createdBy?: string | null; dateIso?: string;
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

export async function setThumbnail(organizationId: string, web: string, thumbnailUrl: string | null): Promise<boolean> {
  const res = await db.update(T).set({ thumbnailUrl, updatedAt: new Date() })
    .where(and(eq(T.organizationId, organizationId), eq(T.webKey, webKeyOf(web))));
  return (res.rowsAffected ?? 0) > 0;
}

export async function setTags(organizationId: string, web: string, tags: InspoTags): Promise<void> {
  await db.update(T).set({ tagsJson: JSON.stringify(tags), updatedAt: new Date() })
    .where(and(eq(T.organizationId, organizationId), eq(T.webKey, webKeyOf(web))));
}

export async function setTagsBulk(organizationId: string, map: TagMap): Promise<void> {
  for (const [web, tags] of Object.entries(map)) await setTags(organizationId, web, tags);
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

export async function deleteItems(organizationId: string, ids: string[]) {
  if (!ids.length) return;
  await db.delete(T).where(and(eq(T.organizationId, organizationId), inArray(T.id, ids)));
}

/** Deletes an item and its comment thread (Turso doesn't guarantee ON DELETE CASCADE). */
export async function deleteItem(organizationId: string, id: string): Promise<boolean> {
  const C = schema.inspoComment;
  await db.delete(C).where(and(eq(C.organizationId, organizationId), eq(C.itemId, id)));
  const res = await db.delete(T).where(and(eq(T.organizationId, organizationId), eq(T.id, id)));
  return (res.rowsAffected ?? 0) > 0;
}
