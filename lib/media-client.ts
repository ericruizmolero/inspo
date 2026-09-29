// Uploading an image (or GIF) that will be an inspo of its own, from the browser.
// It is uploaded whole, not downscaled: a GIF would lose its animation.
// Errors come out as codes (t.errors.<code>), like lib/image-client.ts.
import { upload } from "@vercel/blob/client";

export const MEDIA_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";
const TYPES = new Set(MEDIA_ACCEPT.split(","));
const MAX_BYTES = 20 * 1024 * 1024;
// Up to here it goes through our route; heavier, straight to Blob (Vercel cuts bodies at 4.5 MB)
const SERVER_MAX_BYTES = 4 * 1024 * 1024;

export const isMediaFile = (f: File) => TYPES.has(f.type);

/** The first image in a paste or a drop, if there is one. */
export function mediaFileFrom(dt: DataTransfer | null): File | null {
  if (!dt) return null;
  for (const f of Array.from(dt.files ?? [])) if (isMediaFile(f)) return f;
  for (const it of Array.from(dt.items ?? [])) {
    if (it.kind === "file" && TYPES.has(it.type)) { const f = it.getAsFile(); if (f) return f; }
  }
  return null;
}

/** Uploads the file to this workspace's media folder and returns its URL. */
export async function uploadMedia(file: File, workspaceId: string): Promise<string> {
  if (!isMediaFile(file)) throw new Error("imagesOnly");
  if (file.size > MAX_BYTES) throw new Error("mediaTooHeavy");

  if (file.size <= SERVER_MAX_BYTES) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/media", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error ?? `Error ${res.status}`);
    return data.url as string;
  }

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const blob = await upload(`inspo/${workspaceId}/media/${Date.now()}.${ext}`, file, {
    access: "private", handleUploadUrl: "/api/media", contentType: file.type, multipart: file.size > 8 * 1024 * 1024,
  });
  return blob.url;
}
