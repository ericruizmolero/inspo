// Manual thumbnail upload. The site → image map now lives in inspo_item.thumbnail_url
// (see lib/items.ts); only file storage is left here.
// Production: Vercel Blob (private, under inspo/<workspace>/thumbs/). Local: public/thumbs.
import "server-only";
import { put } from "@vercel/blob";
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

