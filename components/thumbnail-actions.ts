import type { Dispatch, SetStateAction } from "react";

// Compress + resize image client-side before upload (avoids 413 on Vercel)
async function compressImage(file: File, maxPx = 1400, quality = 0.85, type: "image/jpeg" | "image/webp" = "image/jpeg"): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, type === "image/webp" ? ".webp" : ".jpg"), { type }) : file),
        type, quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

/** A card's own picture: one chosen by hand, and the lighter copy an uploaded image gets for the board */
export function thumbnailActions(setThumbMap: Dispatch<SetStateAction<Record<string, string>>>) {
  // Any workspace member can change thumbnails; the server checks the session.
  const handleThumbnailUpload = async (webUrl: string, file: File) => {
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append("file", compressed);
    fd.append("webUrl", webUrl);
    const res = await fetch("/api/thumbnail", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setThumbMap((prev) => ({ ...prev, [webUrl]: url }));
    }
  };

  // An uploaded image is kept whole for the panel, but a card is at most a few hundred px wide: a 20 MB photo
  // was downloaded and decoded at full size for it. The card gets a 1400 px WebP copy (WebP keeps transparency),
  // when that is clearly lighter. A gif stays as it is, so it still moves.
  const cardCopy = async (webUrl: string, file: File) => {
    if (!file.type.startsWith("image/") || file.type === "image/gif") return;
    const copy = await compressImage(file, 1400, 0.85, "image/webp");
    if (copy === file || copy.size > file.size * 0.7) return;
    const fd = new FormData();
    fd.append("file", copy);
    fd.append("webUrl", webUrl);
    const res = await fetch("/api/thumbnail", { method: "POST", body: fd }).catch(() => null);
    if (res?.ok) { const { url } = await res.json(); setThumbMap((prev) => ({ ...prev, [webUrl]: url })); }
  };

  const handleThumbnailRemove = async (webUrl: string) => {
    const res = await fetch(`/api/thumbnail?webUrl=${encodeURIComponent(webUrl)}`, { method: "DELETE" });
    if (res.ok) setThumbMap((prev) => { const next = { ...prev }; delete next[webUrl]; return next; });
  };
  return { handleThumbnailUpload, cardCopy, handleThumbnailRemove };
}
