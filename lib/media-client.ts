// Uploading an image (or GIF) that will be an inspo of its own, from the browser.
// It is uploaded whole, not downscaled: a GIF would lose its animation.
// Errors come out as codes (t.errors.<code>), like lib/image-client.ts.

export const MEDIA_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";
const TYPES = new Set(MEDIA_ACCEPT.split(","));
const MAX_BYTES = 20 * 1024 * 1024;

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

/** What a function takes on Vercel is 4.5 MB, the form around the file included */
const VIA_APP_MAX = 4 * 1024 * 1024;

/** Uploads the file to this workspace's media folder and returns its path.
 *  First it asks for a signed URL and PUTs the file straight to R2 (app/api/media/route.ts);
 *  with files on disk there is none, or when that PUT cannot be made, and the file is posted to the app. */
export async function uploadMedia(file: File): Promise<string> {
  if (!isMediaFile(file)) throw new Error("imagesOnly");
  if (file.size > MAX_BYTES) throw new Error("mediaTooHeavy");
  const ask = await fetch("/api/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: file.type, size: file.size }),
  });
  const slot = await ask.json().catch(() => ({}));
  if (!ask.ok || !slot.url) throw new Error(slot.error ?? `Error ${ask.status}`);
  if (slot.put) {
    // Straight to the storage. If the browser cannot get there (the bucket's CORS rules, a blocked request: it shows
    // as "Failed to fetch"), a file small enough for a function goes through the app instead of failing
    try {
      const put = await fetch(slot.put as string, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (put.ok) return slot.url as string;
      if (file.size > VIA_APP_MAX) throw new Error(`Error ${put.status}`);
    } catch (e) {
      if (file.size > VIA_APP_MAX) throw e;
      console.warn("media: direct upload failed, sending it through the app", e instanceof Error ? e.message : e);
    }
  }
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/media", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error ?? `Error ${res.status}`);
  return data.url as string;
}
