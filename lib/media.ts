// Images (and GIFs) uploaded as inspos of their own. The file's path is the item's `web`
// and also its thumbnail, so every place that shows thumbnails already shows it.
// Files: lib/storage.ts, under inspo/<workspace>/media/.
import "server-only";
import { putFile, deleteFiles, getFile, keyOf } from "./storage";

export const MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);
/** Kept whole, not downscaled: a GIF would lose its animation */
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

export const mediaPrefix = (organizationId: string) => `inspo/${organizationId}/media/`;

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

/** Is this path an image uploaded to this workspace? */
export function ownsMediaFile(organizationId: string, url: string): boolean {
  return keyOf(url)?.startsWith(mediaPrefix(organizationId)) ?? false;
}

/** A new, unused key in this workspace's media folder */
export const newMediaKey = (organizationId: string, type: string) =>
  `${mediaPrefix(organizationId)}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[type] ?? "jpg"}`;

export async function uploadMediaFile(organizationId: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return putFile(newMediaKey(organizationId, file.type), buffer, file.type);
}

/** Delete without failing: an orphan file blocks nothing. */
export async function deleteMediaFile(organizationId: string, url: string): Promise<void> {
  if (ownsMediaFile(organizationId, url)) await deleteFiles([keyOf(url)!]);
}

/** The bytes of an uploaded image (or a saved post's picture), for the vision step. null if it can't be read. */
export async function readMediaFile(url: string): Promise<{ data: Buffer; type: string } | null> {
  const key = keyOf(url);
  if (!key) return null;
  try {
    const f = await getFile(key);
    return f ? { data: f.body, type: f.contentType } : null;
  } catch {
    return null;
  }
}
