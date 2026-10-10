// Manual thumbnail upload. The site → image map lives in inspo_item.thumbnail_url
// (see lib/items.ts); only file storage is left here. Files: lib/storage.ts, under inspo/<workspace>/thumbs/.
import "server-only";
import { putFile, deleteFiles, keyOf } from "./storage";
import { mediaPrefix } from "./media";

export type ThumbnailMap = Record<string, string>;

export const blobPrefix = (organizationId: string) => `inspo/${organizationId}/thumbs/`;

export async function uploadThumbnail(organizationId: string, filename: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "thumb.jpg";
  return putFile(`${blobPrefix(organizationId)}${Date.now()}-${safe}`, buffer, file.type || "image/jpeg", organizationId);
}

/** Is this stored path a thumbnail from this workspace? An uploaded image is its own item's thumbnail. */
export function ownsThumbnailFile(organizationId: string, url: string): boolean {
  const key = keyOf(url);
  return !!key && (key.startsWith(blobPrefix(organizationId)) || key.startsWith(mediaPrefix(organizationId)));
}

/** Delete without failing: an orphan thumbnail blocks nothing. */
export async function deleteThumbnailFiles(organizationId: string, urls: string[]): Promise<void> {
  await deleteFiles(urls.filter((u) => ownsThumbnailFile(organizationId, u)).map((u) => keyOf(u)!));
}
