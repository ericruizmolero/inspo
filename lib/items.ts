// Acceso a los items de inspiración, siempre acotado a un workspace (organizationId).
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import type { InspoItem, InspoTags, TagMap } from "@/types/inspo";
import type { ThumbnailMap } from "./thumbnails";
import { webKeyOf } from "./url";

const T = schema.inspoItem;
type Row = typeof T.$inferSelect;

const TIPOS = new Set(["Inspiración", "Videos", "Ideas", "Documentales"]);
export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);

/** Normaliza una URL para deduplicar: sin espacios, sin barra final, host en minúsculas. */
export { webKeyOf };

export function normalizeTipo(v: string | undefined): InspoItem["tipo"] {
  return TIPOS.has(v ?? "") ? (v as InspoItem["tipo"]) : "Inspiración";
}

/** DD/MM/YYYY ↔ YYYY-MM-DD */
export function isoToEs(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
export function esToIso(es: string): string {
  const m = es.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(es);
  return isNaN(+d) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

export function rowToItem(r: Row): InspoItem {
  return {
    id: r.id,
    empresa: r.empresa,
    web: r.web,
    fecha: isoToEs(r.fecha),
    puestoPor: r.autor,
    tipo: normalizeTipo(r.tipo),
    comentarios: r.comentarios,
    subcomentarios: r.subcomentarios || undefined,
  };
}

export async function listRows(organizationId: string): Promise<Row[]> {
  return db.select().from(T).where(eq(T.organizationId, organizationId)).orderBy(desc(T.fecha), desc(T.createdAt));
}

export async function listItems(organizationId: string): Promise<InspoItem[]> {
  return (await listRows(organizationId)).map(rowToItem);
}

/** Items + mapa de miniaturas + mapa de etiquetas en una sola consulta. */
export async function loadWorkspaceData(organizationId: string) {
  const rows = await listRows(organizationId);
  const items = rows.map(rowToItem);
  const thumbnailMap: ThumbnailMap = {};
  const tagMap: TagMap = {};
  for (const r of rows) {
    if (r.thumbnailUrl) thumbnailMap[r.web] = r.thumbnailUrl;
    if (r.tagsJson) { try { tagMap[r.web] = JSON.parse(r.tagsJson) as InspoTags; } catch { /* ignorar */ } }
  }
  return { items, thumbnailMap, tagMap };
}

export async function findByWeb(organizationId: string, web: string): Promise<Row | null> {
  const [r] = await db.select().from(T)
    .where(and(eq(T.organizationId, organizationId), eq(T.webKey, webKeyOf(web)))).limit(1);
  return r ?? null;
}

export interface NewItem {
  empresa: string; web: string; tipo?: string; comentarios?: string; subcomentarios?: string;
  autor: string; createdBy?: string | null; fechaIso?: string;
}

export async function addItem(organizationId: string, input: NewItem): Promise<InspoItem> {
  const web = input.web.trim().replace(/\/+$/, "");
  const existing = await findByWeb(organizationId, web);
  if (existing) throw new Error("Esa URL ya está en este workspace");
  const now = new Date();
  const row: typeof T.$inferInsert = {
    id: newId(),
    organizationId,
    empresa: input.empresa.trim(),
    web,
    webKey: webKeyOf(web),
    fecha: input.fechaIso ?? now.toISOString().slice(0, 10),
    tipo: normalizeTipo(input.tipo),
    autor: input.autor,
    createdBy: input.createdBy ?? null,
    comentarios: (input.comentarios ?? "").trim(),
    subcomentarios: (input.subcomentarios ?? "").trim() || null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(T).values(row);
  return rowToItem(row as Row);
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

/** ¿Alguna de estas URLs de miniatura pertenece al workspace? (para el proxy de imágenes) */
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

/** Borra un item y su hilo de comentarios (Turso no garantiza el ON DELETE CASCADE). */
export async function deleteItem(organizationId: string, id: string): Promise<boolean> {
  const C = schema.inspoComment;
  await db.delete(C).where(and(eq(C.organizationId, organizationId), eq(C.itemId, id)));
  const res = await db.delete(T).where(and(eq(T.organizationId, organizationId), eq(T.id, id)));
  return (res.rowsAffected ?? 0) > 0;
}
