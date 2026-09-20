import { put, list, del } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";

import type { DesignSpec } from "@/types/design";

export interface DesignMdEntry {
  url: string;
  markdown: string;
  generatedAt: string;
  model: string;
  spec?: DesignSpec;          // ausente en entradas antiguas
  screenshotUrl?: string;     // página entera a 1440px. /design-md/<key>.jpg en local, URL de Blob (privada) en producción
  coverUrl?: string;          // 720x450, portada del grid
  scrollUrl?: string;         // 720px de ancho, tira para el hover del grid
}

export interface DesignImages { fullShot: Buffer; cover: Buffer; scroll: Buffer }

export type DesignMdIndex = Record<string, { generatedAt: string; model: string; coverUrl?: string; scrollUrl?: string }>;

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
/** Prefijo en Blob de capturas, portadas y specs de DESIGN.md (compartidas entre workspaces) */
export const DESIGN_MD_PREFIX = "inspo/design-md/";
const PREFIX = DESIGN_MD_PREFIX;
const INDEX_PREFIX = "inspo/design-md-index"; // fuera de PREFIX para no confundirlo con una entrada
const FS_DIR = path.join(process.cwd(), "public", "design-md");
const FS_INDEX = path.join(FS_DIR, "_index.json");

export function keyFor(url: string): string {
  const norm = url.trim().replace(/\/+$/, "").toLowerCase();
  return createHash("sha1").update(norm).digest("hex").slice(0, 16);
}

// ─── Blob ────────────────────────────────────────────────────────────────────

async function blobGet(key: string): Promise<DesignMdEntry | null> {
  try {
    const { blobs: all } = await list({ prefix: `${PREFIX}${key}` });
    const blobs = all.filter((b) => b.pathname.endsWith(".json"));
    if (!blobs.length) return null;
    const newest = blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0];
    const res = await fetch(newest.url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as DesignMdEntry;
  } catch (e) {
    console.error("design-store blobGet:", e);
    return null;
  }
}

async function blobSet(key: string, entry: DesignMdEntry): Promise<void> {
  const { blobs: all } = await list({ prefix: `${PREFIX}${key}` });
  const old = all.filter((b) => b.pathname.endsWith(".json"));
  await put(`${PREFIX}${key}-${Date.now()}.json`, Buffer.from(JSON.stringify(entry)), {
    access: "private",
    contentType: "application/json",
  });
  if (old.length) await del(old.map((b) => b.url)).catch(() => {});
}

async function blobReadJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

async function blobGetIndex(): Promise<DesignMdIndex> {
  try {
    const { blobs } = await list({ prefix: INDEX_PREFIX });
    const sorted = blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
    for (const b of sorted) {
      const data = await blobReadJson<DesignMdIndex>(b.url);
      if (data && typeof data === "object") return data;
    }
    return {};
  } catch (e) {
    console.error("design-store blobGetIndex:", e);
    return {};
  }
}

async function blobSetIndex(index: DesignMdIndex): Promise<void> {
  // Igual que el mapa de thumbnails: escribir la nueva versión antes de borrar las viejas
  const { blobs: old } = await list({ prefix: INDEX_PREFIX });
  await put(`${INDEX_PREFIX}-${Date.now()}.json`, Buffer.from(JSON.stringify(index)), {
    access: "private",
    contentType: "application/json",
  });
  if (old.length) await del(old.map((b) => b.url)).catch(() => {});
}

// ─── Filesystem (dev) ────────────────────────────────────────────────────────

async function fsGet(key: string): Promise<DesignMdEntry | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(FS_DIR, `${key}.json`), "utf-8"));
  } catch {
    return null;
  }
}

async function fsSet(key: string, entry: DesignMdEntry): Promise<void> {
  await fs.mkdir(FS_DIR, { recursive: true });
  await fs.writeFile(path.join(FS_DIR, `${key}.json`), JSON.stringify(entry, null, 2));
}

async function fsGetIndex(): Promise<DesignMdIndex> {
  try {
    return JSON.parse(await fs.readFile(FS_INDEX, "utf-8"));
  } catch {
    // Sin índice: reconstruirlo a partir de las entradas que haya en disco
    const index: DesignMdIndex = {};
    try {
      for (const f of await fs.readdir(FS_DIR)) {
        if (!f.endsWith(".json") || f.startsWith("_")) continue;
        const e = JSON.parse(await fs.readFile(path.join(FS_DIR, f), "utf-8")) as DesignMdEntry;
        if (e?.url) index[e.url] = { generatedAt: e.generatedAt, model: e.model, coverUrl: e.coverUrl, scrollUrl: e.scrollUrl };
      }
    } catch { /* carpeta vacía */ }
    return index;
  }
}

async function fsSetIndex(index: DesignMdIndex): Promise<void> {
  await fs.mkdir(FS_DIR, { recursive: true });
  await fs.writeFile(FS_INDEX, JSON.stringify(index, null, 2));
}

async function saveImage(key: string, suffix: string, jpeg: Buffer): Promise<string> {
  const name = `${key}${suffix}`;
  if (USE_BLOB) {
    const r = await put(`${PREFIX}${name}-${Date.now()}.jpg`, jpeg, { access: "private", contentType: "image/jpeg" });
    return r.url;
  }
  await fs.mkdir(FS_DIR, { recursive: true });
  await fs.writeFile(path.join(FS_DIR, `${name}.jpg`), jpeg);
  return `/design-md/${name}.jpg?v=${Date.now()}`;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export function getDesignMd(url: string): Promise<DesignMdEntry | null> {
  const key = keyFor(url);
  return USE_BLOB ? blobGet(key) : fsGet(key);
}

export function getDesignMdIndex(): Promise<DesignMdIndex> {
  return USE_BLOB ? blobGetIndex() : fsGetIndex();
}

export async function saveDesignMd(entry: DesignMdEntry, images?: DesignImages): Promise<DesignMdEntry> {
  const key = keyFor(entry.url);
  if (images) {
    // Las imágenes viejas del mismo key se sobreescriben en local; en Blob quedan huérfanas hasta que se limpien
    [entry.screenshotUrl, entry.coverUrl, entry.scrollUrl] = await Promise.all([
      saveImage(key, "", images.fullShot),
      saveImage(key, "-cover", images.cover),
      saveImage(key, "-scroll", images.scroll),
    ]);
  }
  if (USE_BLOB) await blobSet(key, entry); else await fsSet(key, entry);

  const index = await getDesignMdIndex();
  index[entry.url] = { generatedAt: entry.generatedAt, model: entry.model, coverUrl: entry.coverUrl, scrollUrl: entry.scrollUrl };
  if (USE_BLOB) await blobSetIndex(index); else await fsSetIndex(index);
  return entry;
}
