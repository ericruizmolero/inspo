// Escaparate del login: las últimas webs guardadas en el workspace del estudio.
// Solo portadas (miniatura propia o la del DESIGN.md), sin nombres ni comentarios.
// En producción los blobs son privados: app/api/showcase los sirve por índice.
import { desc, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { getDesignMdIndex } from "./design-store";

export const SHOWCASE_MAX = 15;
const SLUG = (process.env.SHOWCASE_WORKSPACE_SLUG ?? "treseiscero").trim();

/** URLs de imagen (blob o ruta local) de las últimas webs con portada, más recientes primero. */
export async function showcaseCovers(): Promise<string[]> {
  if (!SLUG) return [];
  const [org] = await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.slug, SLUG)).limit(1);
  if (!org) return [];
  const [rows, index] = await Promise.all([
    db.select({ web: schema.inspoItem.web, thumbnailUrl: schema.inspoItem.thumbnailUrl, tipo: schema.inspoItem.tipo })
      .from(schema.inspoItem).where(eq(schema.inspoItem.organizationId, org.id))
      .orderBy(desc(schema.inspoItem.fecha), desc(schema.inspoItem.createdAt)).limit(120),
    getDesignMdIndex(),
  ]);
  const out: string[] = [];
  for (const r of rows) {
    if (r.tipo !== "Inspiración") continue; // vídeos y demás no tienen portada de web
    const cover = r.thumbnailUrl || index[r.web]?.coverUrl || index[r.web.replace(/\/+$/, "")]?.coverUrl;
    if (cover && !out.includes(cover)) out.push(cover);
    if (out.length >= SHOWCASE_MAX) break;
  }
  return out;
}

/** Ruta que puede pintar el navegador sin sesión: local tal cual, blob privado a través de /api/showcase. */
export const showcaseSrc = (url: string, i: number) => (url.startsWith("https://") ? `/api/showcase?i=${i}` : url);
