export type ThumbnailMap = Record<string, string>; // webUrl → imageUrl

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

// ─── Vercel Blob (producción) ─────────────────────────────────────────────────

async function getBlobMap(): Promise<ThumbnailMap> {
  const { list } = await import("@vercel/blob");
  try {
    const { blobs } = await list({ prefix: "inspo/thumbnail-map" });
    if (!blobs.length) return {};
    const latest = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];
    const res = await fetch(latest.url, { cache: "no-store" });
    return await res.json();
  } catch {
    return {};
  }
}

async function saveBlobMap(map: ThumbnailMap): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put("inspo/thumbnail-map.json", JSON.stringify(map), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

async function uploadToBlob(filename: string, file: File): Promise<string> {
  const { put } = await import("@vercel/blob");
  const blob = await put(
    `inspo/thumbs/${Date.now()}-${filename}`,
    file,
    { access: "public" }
  );
  return blob.url;
}

// ─── Filesystem local (dev) ───────────────────────────────────────────────────

import { promises as fs } from "fs";
import path from "path";

const THUMBS_DIR = path.join(process.cwd(), "public", "thumbs");
const MAP_PATH = path.join(THUMBS_DIR, "_map.json");

async function getFsMap(): Promise<ThumbnailMap> {
  try {
    const raw = await fs.readFile(MAP_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveFsMap(map: ThumbnailMap): Promise<void> {
  await fs.mkdir(THUMBS_DIR, { recursive: true });
  await fs.writeFile(MAP_PATH, JSON.stringify(map, null, 2));
}

async function uploadToFs(filename: string, file: File): Promise<string> {
  await fs.mkdir(THUMBS_DIR, { recursive: true });
  const ext = filename.split(".").pop() ?? "jpg";
  const name = `${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(THUMBS_DIR, name), buffer);
  return `/thumbs/${name}`;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function getThumbnailMap(): Promise<ThumbnailMap> {
  return USE_BLOB ? getBlobMap() : getFsMap();
}

export async function uploadThumbnail(filename: string, file: File): Promise<string> {
  return USE_BLOB ? uploadToBlob(filename, file) : uploadToFs(filename, file);
}

export async function setThumbnailInMap(webUrl: string, imageUrl: string): Promise<ThumbnailMap> {
  const map = await getThumbnailMap();
  map[webUrl] = imageUrl;
  if (USE_BLOB) await saveBlobMap(map);
  else await saveFsMap(map);
  return map;
}

export async function removeThumbnailFromMap(webUrl: string): Promise<void> {
  const map = await getThumbnailMap();
  delete map[webUrl];
  if (USE_BLOB) await saveBlobMap(map);
  else await saveFsMap(map);
}
