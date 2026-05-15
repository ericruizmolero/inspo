import { put, list, del } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";

export type ThumbnailMap = Record<string, string>;

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

// ─── Vercel Blob (producción) ─────────────────────────────────────────────────

async function fetchBlobJson(url: string): Promise<ThumbnailMap | null> {
  // Approach 1: Bearer token (most reliable for private blobs)
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    if (res.ok) return await res.json();
  } catch { /* fall through */ }

  // Approach 2: Direct fetch (works if blob URL is signed/public)
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch { /* fall through */ }

  return null;
}

async function getBlobMap(): Promise<ThumbnailMap> {
  try {
    const { blobs } = await list({ prefix: "inspo/thumbnail-map" });
    if (!blobs.length) return {};

    // Sort by uploadedAt descending, take the newest
    const sorted = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    // Try each blob until we get a valid map (newest first)
    for (const blob of sorted) {
      const data = await fetchBlobJson(blob.url);
      if (data && typeof data === "object") return data;
    }
    return {};
  } catch (e) {
    console.error("getBlobMap error:", e);
    return {};
  }
}

async function saveBlobMap(map: ThumbnailMap): Promise<void> {
  // 1. Record OLD blobs BEFORE writing anything
  const { blobs: oldBlobs } = await list({ prefix: "inspo/thumbnail-map" });

  // 2. Save the new version FIRST — timestamped to avoid name collision
  await put(
    `inspo/thumbnail-map-${Date.now()}.json`,
    Buffer.from(JSON.stringify(map)),
    { access: "private", contentType: "application/json" }
  );

  // 3. THEN delete old versions (data safe even if this fails)
  if (oldBlobs.length > 0) {
    try {
      await del(oldBlobs.map((b) => b.url));
    } catch (e) {
      console.warn("saveBlobMap: could not delete old blobs (non-fatal):", e);
    }
  }
}

async function uploadToBlob(filename: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await put(
    `inspo/thumbs/${Date.now()}-${filename}`,
    buffer,
    { access: "private", contentType: file.type || "image/jpeg" }
  );
  return result.url;
}

// ─── Filesystem local (dev) ───────────────────────────────────────────────────

const THUMBS_DIR = path.join(process.cwd(), "public", "thumbs");
const MAP_PATH   = path.join(THUMBS_DIR, "_map.json");

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
  const ext  = filename.split(".").pop() ?? "jpg";
  const name = `${Date.now()}.${ext}`;
  const buf  = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(THUMBS_DIR, name), buf);
  return `/thumbs/${name}`;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function getThumbnailMap(): Promise<ThumbnailMap> {
  return USE_BLOB ? getBlobMap() : getFsMap();
}

export async function uploadThumbnail(filename: string, file: File): Promise<string> {
  return USE_BLOB ? uploadToBlob(filename, file) : uploadToFs(filename, file);
}

export async function setThumbnailInMap(webUrl: string, imageUrl: string): Promise<void> {
  const map = await getThumbnailMap();
  map[webUrl] = imageUrl;
  if (USE_BLOB) await saveBlobMap(map);
  else await saveFsMap(map);
}

export async function removeThumbnailFromMap(webUrl: string): Promise<void> {
  const map = await getThumbnailMap();
  delete map[webUrl];
  if (USE_BLOB) await saveBlobMap(map);
  else await saveFsMap(map);
}
