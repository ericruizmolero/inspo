// Subida de miniaturas manuales. El mapa web → imagen vive ahora en inspo_item.thumbnail_url
// (ver lib/items.ts); aquí solo queda el almacenamiento del fichero.
// Producción: Vercel Blob (privado, bajo inspo/<workspace>/thumbs/). Local: public/thumbs.
import "server-only";
import { put, list } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";

export type ThumbnailMap = Record<string, string>;

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const THUMBS_DIR = path.join(process.cwd(), "public", "thumbs");

export const blobPrefix = (organizationId: string) => `inspo/${organizationId}/thumbs/`;

export async function uploadThumbnail(organizationId: string, filename: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (USE_BLOB) {
    const r = await put(`${blobPrefix(organizationId)}${Date.now()}-${filename}`, buffer, {
      access: "private", contentType: file.type || "image/jpeg",
    });
    return r.url;
  }
  await fs.mkdir(THUMBS_DIR, { recursive: true });
  const ext = filename.split(".").pop() ?? "jpg";
  const name = `${Date.now()}.${ext}`;
  await fs.writeFile(path.join(THUMBS_DIR, name), buffer);
  return `/thumbs/${name}`;
}

/** Biblioteca de miniaturas ya subidas por este workspace (para el selector). */
export async function listThumbnailLibrary(organizationId: string): Promise<string[]> {
  if (USE_BLOB) {
    const { blobs } = await list({ prefix: blobPrefix(organizationId) });
    return blobs
      .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
      .map((b) => b.url);
  }
  try {
    const files = await fs.readdir(THUMBS_DIR);
    return files
      .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
      .sort((a, b) => b.localeCompare(a))
      .map((f) => `/thumbs/${f}`);
  } catch { return []; }
}
