// Escaparate del login: las últimas webs guardadas en el workspace del estudio.
// Solo imágenes (miniatura propia, portada del DESIGN.md o captura automática),
// sin nombres ni comentarios. En producción los blobs son privados y los sirve
// app/api/showcase por índice; en local son rutas de /public.
//
// Cada imagen pasa una vez por el filtro de calidad (lib/shot-quality): una captura
// en blanco, la pantalla de Cloudflare o un preloader nunca llegan al escaparate.
// El veredicto se guarda en un JSON (blob privado en prod, .data en local) para no
// volver a descargar ni analizar la imagen en cada arranque.
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { desc, eq } from "drizzle-orm";
import { get, put } from "@vercel/blob";
import { db, schema } from "./db";
import { getDesignMdIndex } from "./design-store";
import { getStoredShot, hasStoredShot, localShotPath, shotKey } from "./screenshot";
import { looksLikeRealPage } from "./shot-quality";

export const SHOWCASE_MAX = 18; // 3 columnas × 6
const SLUG = (process.env.SHOWCASE_WORKSPACE_SLUG ?? "treseiscero").trim();
const CANDIDATES = 60; // últimas webs entre las que buscar imagen
const TTL_MS = 5 * 60 * 1000;
const ANALYZE_CONCURRENCY = 6;
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const VERDICTS_BLOB = "inspo/showcase/verdicts.json";
const VERDICTS_LOCAL = path.join(process.cwd(), ".data", "showcase-verdicts.json");

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
  const candidates: ShowcaseEntry[] = [];
  for (const e of resolved) {
    if (!e) continue;
    const k = entryKey(e);
    if (seen.has(k)) continue;
    seen.add(k); candidates.push(e);
  }
  return (await keepRealPages(candidates)).slice(0, SHOWCASE_MAX);
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

// ─── Filtro de calidad con veredictos guardados ──────────────────────────────

const entryKey = (e: ShowcaseEntry) => e.kind === "image" ? e.url : e.web;

/** Clave del veredicto: las capturas se sobrescriben con el mismo nombre, así que va con su hash;
 *  las miniaturas y portadas tienen URL única por subida. */
const verdictKey = (e: ShowcaseEntry) => e.kind === "shot" ? `shot:${shotKey(e.web)}` : `img:${createHash("sha1").update(e.url).digest("hex")}`;

type Verdicts = Record<string, boolean>;

async function loadVerdicts(): Promise<Verdicts> {
  try {
    if (USE_BLOB) {
      const res = await get(VERDICTS_BLOB, { access: "private" });
      if (!res || !res.stream) return {};
      return JSON.parse(await new Response(res.stream).text()) as Verdicts;
    }
    return JSON.parse(await fs.readFile(VERDICTS_LOCAL, "utf8")) as Verdicts;
  } catch { return {}; }
}

async function saveVerdicts(v: Verdicts): Promise<void> {
  try {
    const body = JSON.stringify(v);
    if (USE_BLOB) {
      await put(VERDICTS_BLOB, body, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
      return;
    }
    await fs.mkdir(path.dirname(VERDICTS_LOCAL), { recursive: true });
    await fs.writeFile(VERDICTS_LOCAL, body);
  } catch (e) { console.error("showcase: no se pudo guardar el veredicto:", e); }
}

/** Bytes de una entrada: captura guardada, blob privado (prod) o archivo de /public (local). */
async function readEntry(e: ShowcaseEntry): Promise<Buffer | null> {
  try {
    if (e.kind === "shot") return await getStoredShot(e.web);
    if (e.url.startsWith("https://")) {
      const res = await fetch(e.url, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    }
    return await fs.readFile(path.join(process.cwd(), "public", e.url.split("?")[0]));
  } catch { return null; }
}

/** Deja solo las entradas que parecen portadas reales. Analiza las que no tienen veredicto y lo guarda. */
async function keepRealPages(entries: ShowcaseEntry[]): Promise<ShowcaseEntry[]> {
  const verdicts = await loadVerdicts();
  const pending = entries.filter((e) => verdicts[verdictKey(e)] === undefined);
  if (pending.length) {
    // Pocas a la vez: cada análisis decodifica una imagen y en serverless la memoria es justa
    const queue = [...pending];
    await Promise.all(Array.from({ length: Math.min(ANALYZE_CONCURRENCY, queue.length) }, async () => {
      for (let e = queue.shift(); e; e = queue.shift()) {
        const img = await readEntry(e);
        // Si no se pudo leer no se guarda nada: se reintenta la próxima vez
        if (img) verdicts[verdictKey(e)] = await looksLikeRealPage(img);
      }
    }));
    await saveVerdicts(verdicts);
  }
  return entries.filter((e) => verdicts[verdictKey(e)] === true);
}
