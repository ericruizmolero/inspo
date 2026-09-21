// Escaparate del login: las últimas webs guardadas en el workspace del estudio.
// Solo imágenes (miniatura propia, portada del DESIGN.md o captura automática),
// sin nombres ni comentarios. En producción los blobs son privados y los sirve
// app/api/showcase por índice; en local son rutas de /public.
import { desc, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { getDesignMdIndex } from "./design-store";
import { hasStoredShot, localShotPath } from "./screenshot";

export const SHOWCASE_MAX = 18; // 3 columnas × 6
const SLUG = (process.env.SHOWCASE_WORKSPACE_SLUG ?? "treseiscero").trim();
const CANDIDATES = 60; // últimas webs entre las que buscar imagen
const TTL_MS = 5 * 60 * 1000;

export type ShowcaseEntry =
  | { kind: "image"; url: string }   // miniatura o portada: URL de blob (prod) o ruta local
  | { kind: "shot"; web: string };   // captura automática guardada, por URL de la web

let cache: { at: number; entries: ShowcaseEntry[] } | null = null;

async function compute(): Promise<ShowcaseEntry[]> {
  if (!SLUG) return [];
  const [org] = await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.slug, SLUG)).limit(1);
  if (!org) return [];
  const [rows, index] = await Promise.all([
    db.select({ web: schema.inspoItem.web, thumbnailUrl: schema.inspoItem.thumbnailUrl })
      .from(schema.inspoItem)
      .where(eq(schema.inspoItem.organizationId, org.id))
      .orderBy(desc(schema.inspoItem.fecha), desc(schema.inspoItem.createdAt))
      .limit(CANDIDATES * 2),
    getDesignMdIndex(),
  ]);
  // Vídeos y redes no tienen portada de web que merezca escaparate
  const webs = rows.filter((r) => !/youtube\.com|youtu\.be|vimeo\.com|x\.com|twitter\.com|instagram\.com|linkedin\.com|tiktok\.com/.test(r.web)).slice(0, CANDIDATES);
  const resolved = await Promise.all(webs.map(async (r): Promise<ShowcaseEntry | null> => {
    const cover = r.thumbnailUrl || index[r.web]?.coverUrl || index[r.web.replace(/\/+$/, "")]?.coverUrl;
    if (cover) return { kind: "image", url: cover };
    return (await hasStoredShot(r.web)) ? { kind: "shot", web: r.web } : null;
  }));
  const seen = new Set<string>();
  const out: ShowcaseEntry[] = [];
  for (const e of resolved) {
    if (!e) continue;
    const k = e.kind === "image" ? e.url : e.web;
    if (seen.has(k)) continue;
    seen.add(k); out.push(e);
    if (out.length >= SHOWCASE_MAX) break;
  }
  return out;
}

/** Lista del escaparate, más recientes primero. Se recuerda 5 minutos por instancia. */
export async function showcaseEntries(): Promise<ShowcaseEntry[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.entries;
  const entries = await compute();
  cache = { at: Date.now(), entries };
  return entries;
}

/** Lo que puede pintar el navegador sin sesión: rutas locales tal cual, blobs privados vía /api/showcase. */
export function showcaseSrc(e: ShowcaseEntry, i: number): string {
  if (e.kind === "image") return e.url.startsWith("https://") ? `/api/showcase?i=${i}` : e.url;
  return process.env.BLOB_READ_WRITE_TOKEN ? `/api/showcase?i=${i}` : localShotPath(e.web);
}
