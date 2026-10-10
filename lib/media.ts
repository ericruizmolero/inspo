// Images (and GIFs) uploaded as inspos of their own. The file's path is the item's `web`
// and also its thumbnail, so every place that shows thumbnails already shows it.
// Videos saved from the extension are copies too, so they play when the site they came from
// expires the link or refuses it: their path is the item's `web`, and a frame is its thumbnail.
// Files: lib/storage.ts, under inspo/<workspace>/media/ and inspo/<workspace>/video/.
import "server-only";
import { createHash } from "node:crypto";
import { putFile, deleteFiles, getFile, keyOf, fileUrl } from "./storage";
import { webKeyOf } from "./url";
import { log } from "./log";

export const MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);
/** Kept whole, not downscaled: a GIF would lose its animation */
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

export const mediaPrefix = (organizationId: string) => `inspo/${organizationId}/media/`;

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
/** Held in memory while it goes up, as the copies of posts from X are */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const videoPrefix = (organizationId: string) => `inspo/${organizationId}/video/`;
export const newVideoKey = (organizationId: string, type: string) =>
  `${videoPrefix(organizationId)}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${VIDEO_TYPES[type] ?? "mp4"}`;

/** Is this path an image uploaded to this workspace? */
export function ownsMediaFile(organizationId: string, url: string): boolean {
  return keyOf(url)?.startsWith(mediaPrefix(organizationId)) ?? false;
}

/** A new, unused key in this workspace's media folder */
export const newMediaKey = (organizationId: string, type: string) =>
  `${mediaPrefix(organizationId)}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[type] ?? "jpg"}`;

/** The key of an image brought in from `page` (a pin on Pinterest): the same page always gives the same key,
 *  so importing it again finds the reference it already made instead of copying the image twice */
export const importedMediaKey = (organizationId: string, page: string, type: string) =>
  `${mediaPrefix(organizationId)}from-${createHash("sha1").update(webKeyOf(page)).digest("hex").slice(0, 20)}.${EXT[type] ?? "jpg"}`;
/** Every path an image imported from `page` may have been stored at, whatever its type turned out to be */
export const importedMediaUrls = (organizationId: string, page: string) =>
  Object.keys(EXT).map((type) => fileUrl(importedMediaKey(organizationId, page, type)));

export async function uploadMediaFile(organizationId: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return putFile(newMediaKey(organizationId, file.type), buffer, file.type, organizationId);
}

/** Delete an uploaded image or a copied video without failing: an orphan file blocks nothing. */
export async function deleteMediaFile(organizationId: string, url: string): Promise<void> {
  const key = keyOf(url);
  if (key && (key.startsWith(mediaPrefix(organizationId)) || key.startsWith(videoPrefix(organizationId)))) await deleteFiles([key]);
}

/** The bytes of an uploaded image (or a saved post's picture), for the vision step. null if it can't be read. */
export async function readMediaFile(url: string): Promise<{ data: Buffer; type: string } | null> {
  const key = keyOf(url);
  if (!key) return null;
  try {
    const f = await getFile(key);
    return f ? { data: f.body, type: f.contentType } : null;
  } catch (err) {
    log.warn("storage.read_failed", { ref: key, err });
    return null;
  }
}
