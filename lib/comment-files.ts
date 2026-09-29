// Screenshots attached to comments. Files: lib/storage.ts, under inspo/<workspace>/comments/.
import "server-only";
import { putFile, deleteFiles, keyOf } from "./storage";

/** Per-file cap after downscaling in the browser (Vercel cuts the body at 4.5 MB) */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const MAX_ATTACHMENTS = 6;
export const ATTACHMENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export const commentPrefix = (organizationId: string) => `inspo/${organizationId}/comments/`;

/** Is this stored path a comment attachment from this workspace? */
export function ownsCommentFile(organizationId: string, url: string): boolean {
  return keyOf(url)?.startsWith(commentPrefix(organizationId)) ?? false;
}

export async function uploadCommentFile(organizationId: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } as Record<string, string>)[file.type] ?? "jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return putFile(`${commentPrefix(organizationId)}${name}`, buffer, file.type);
}

/** Delete without failing: orphan attachments block nothing. */
export async function deleteCommentFiles(organizationId: string, urls: string[]): Promise<void> {
  await deleteFiles(urls.filter((u) => ownsCommentFile(organizationId, u)).map((u) => keyOf(u)!));
}
