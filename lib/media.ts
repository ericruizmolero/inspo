// Images (and GIFs) uploaded as inspos of their own. The file's address is the item's `web`
// and also its thumbnail, so every place that shows thumbnails already shows it.
// Production: private Vercel Blob under inspo/<workspace>/media/ (served via /api/thumbnail/img).
// Local without a Blob token: public/media.
import "server-only";
import { put, del } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { isBlobUrl, isBlobUrlUnder } from "./blob-url";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = path.join(process.cwd(), "public", "media");

export const MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);
/** Kept whole, not downscaled: a GIF would lose its animation. Past 4 MB it goes straight from the browser to Blob. */
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
/** Vercel cuts request bodies at 4.5 MB: up to here the file can come through our own route */
export const MAX_SERVER_UPLOAD_BYTES = 4 * 1024 * 1024;

export const mediaPrefix = (organizationId: string) => `inspo/${organizationId}/media/`;

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

/** Is this URL an image uploaded to this workspace? (Blob or local) */
export function ownsMediaFile(organizationId: string, url: string): boolean {
  return USE_BLOB
    ? isBlobUrlUnder(url, mediaPrefix(organizationId))
    : /^\/media\/[\w.-]+$/.test(url);
}

export async function uploadMediaFile(organizationId: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[file.type] ?? "jpg"}`;
  if (USE_BLOB) {
    const r = await put(`${mediaPrefix(organizationId)}${name}`, buffer, { access: "private", contentType: file.type });
    return r.url;
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, name), buffer);
  return `/media/${name}`;
}

/** Delete without failing: an orphan file blocks nothing. */
export async function deleteMediaFile(organizationId: string, url: string): Promise<void> {
  if (!ownsMediaFile(organizationId, url)) return;
  try {
    if (USE_BLOB) await del(url);
    else await fs.unlink(path.join(LOCAL_DIR, path.basename(url)));
  } catch (e) {
    console.warn("Could not delete an uploaded image:", e);
  }
}

/** The bytes of an uploaded image (or a saved post's picture), for the vision step. null if it can't be read. */
export async function readMediaFile(url: string): Promise<{ data: Buffer; type: string } | null> {
  try {
    // Local copies (uploaded images, saved posts) live under public/
    const local = url.match(/^\/(media|posts)\/([\w./-]+)$/);
    if (local && !url.includes("..")) {
      const data = await fs.readFile(path.join(process.cwd(), "public", local[1], local[2]));
      const ext = path.extname(url).slice(1).toLowerCase();
      return { data, type: Object.entries(EXT).find(([, e]) => e === ext)?.[0] ?? "image/jpeg" };
    }
    if (!isBlobUrl(url)) return null;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
    if (!res.ok) return null;
    return { data: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") ?? "image/jpeg" };
  } catch {
    return null;
  }
}
