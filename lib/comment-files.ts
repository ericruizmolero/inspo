// Screenshots attached to comments. Production: private Vercel Blob under
// inspo/<workspace>/comments/ (served via /api/thumbnail/img). Local: public/comments.
import "server-only";
import { put, del } from "@vercel/blob";
import { isBlobUrlUnder } from "./blob-url";
import { promises as fs } from "fs";
import path from "path";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = path.join(process.cwd(), "public", "comments");

/** Per-file cap after downscaling in the browser (Vercel cuts the body at 4.5 MB) */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const MAX_ATTACHMENTS = 6;
export const ATTACHMENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export const commentPrefix = (organizationId: string) => `inspo/${organizationId}/comments/`;

/** Is this URL a comment attachment from this workspace? (Blob or local) */
export function ownsCommentFile(organizationId: string, url: string): boolean {
  return USE_BLOB
    ? isBlobUrlUnder(url, commentPrefix(organizationId))
    : url.startsWith("/comments/") && !url.includes("..");
}

export async function uploadCommentFile(organizationId: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } as Record<string, string>)[file.type] ?? "jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  if (USE_BLOB) {
    const r = await put(`${commentPrefix(organizationId)}${name}`, buffer, { access: "private", contentType: file.type });
    return r.url;
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, name), buffer);
  return `/comments/${name}`;
}

/** Delete without failing: orphan attachments block nothing. */
export async function deleteCommentFiles(organizationId: string, urls: string[]): Promise<void> {
  const own = urls.filter((u) => ownsCommentFile(organizationId, u));
  if (!own.length) return;
  try {
    if (USE_BLOB) await del(own);
    else await Promise.all(own.map((u) => fs.unlink(path.join(LOCAL_DIR, path.basename(u)))));
  } catch (e) {
    console.warn("Could not delete a comment attachment:", e);
  }
}
