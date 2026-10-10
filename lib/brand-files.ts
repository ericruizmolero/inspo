// The files a brand owns: its logos, its fonts, example pictures for its imagery and mockups, and other files to hand out.
// They live under inspo/<workspace>/brand/<project>/ (lib/storage.ts). A file is uploaded, then checked before the
// brand points at it: its bytes must be what its name says, and an SVG must be a plain drawing (no script, no
// handlers, no links out), because a logo is shown to people outside the team through a share.
import "server-only";
import sharp from "sharp";
import { getFile, deleteFiles, listFiles, isSafeKey } from "./storage";
import type { BrandFile } from "@/types/brand";
import { recordFailure } from "./log";

export const brandPrefix = (organizationId: string) => `inspo/${organizationId}/brand/`;
export const projectBrandPrefix = (organizationId: string, projectId: string) => `${brandPrefix(organizationId)}${projectId}/`;
export const MAX_BRAND_BYTES = 20 * 1024 * 1024;

// DESIGN_MD_PREFIX (lib/design-store.ts, which imports this file): a logo seeded from a site's DESIGN.md
// stays where it was captured, and that content is public to everyone signed in.
const DESIGN_MD_FILES = "inspo/design-md/";

/** May this workspace's brand point at this key? Only its own brand files, or a captured DESIGN.md logo.
 *  Any other key would let a brand read someone else's file through its zip or its share link. */
export const brandKeyAllowed = (organizationId: string, key: string) =>
  isSafeKey(key) && (key.startsWith(brandPrefix(organizationId)) || key.startsWith(DESIGN_MD_FILES));

/** Every storage key inside a brand value (a section or the whole spec): any `key` that is a storage path */
export function keysIn(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) for (const v of value) keysIn(v, out);
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "key" && typeof v === "string" && v.startsWith("inspo/")) out.push(v);
      else keysIn(v, out);
    }
  }
  return out;
}

export type BrandPurpose = "logo" | "font" | "image" | "file";
/** What each purpose takes, by extension: a font's type is often blank in the browser */
const TYPES: Record<string, string> = {
  svg: "image/svg+xml", png: "image/png", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg",
  woff2: "font/woff2", woff: "font/woff", otf: "font/otf", ttf: "font/ttf", pdf: "application/pdf",
};
const BY_PURPOSE: Record<BrandPurpose, string[]> = {
  logo: ["svg", "png", "webp", "jpg", "jpeg"],
  image: ["png", "webp", "jpg", "jpeg"],
  font: ["woff2", "woff", "otf", "ttf"],
  file: ["svg", "png", "webp", "jpg", "jpeg", "pdf"],
};

export const isPurpose = (p: unknown): p is BrandPurpose => p === "logo" || p === "font" || p === "image" || p === "file";
export const extOf = (name: string) => (name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "");
/** The type a file is stored as, or null when this purpose does not take it */
export function brandTypeFor(purpose: BrandPurpose, name: string): string | null {
  const ext = extOf(name);
  return BY_PURPOSE[purpose].includes(ext) ? TYPES[ext] : null;
}
export const newBrandKey = (organizationId: string, projectId: string, purpose: BrandPurpose, name: string) =>
  `${projectBrandPrefix(organizationId, projectId)}${purpose}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extOf(name) === "jpeg" ? "jpg" : extOf(name)}`;

/** Does the start of the file match what it claims to be */
function sniff(buf: Buffer, type: string): boolean {
  const head = buf.subarray(0, 16);
  const ascii = head.toString("latin1");
  switch (type) {
    case "image/png": return head[0] === 0x89 && ascii.slice(1, 4) === "PNG";
    case "image/jpeg": return head[0] === 0xff && head[1] === 0xd8;
    case "image/webp": return ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WEBP";
    case "application/pdf": return ascii.startsWith("%PDF");
    case "font/woff2": return ascii.startsWith("wOF2");
    case "font/woff": return ascii.startsWith("wOFF");
    case "font/otf": return ascii.startsWith("OTTO") || (head[0] === 0 && head[1] === 1 && head[2] === 0 && head[3] === 0);
    case "font/ttf": return (head[0] === 0 && head[1] === 1 && head[2] === 0 && head[3] === 0) || ascii.startsWith("true");
    case "image/svg+xml": return /<svg[\s>]/i.test(buf.subarray(0, 4096).toString("utf8"));
    default: return false;
  }
}

/** A plain drawing: nothing that runs, nothing that fetches. Refused, not cleaned: a cleaned logo may look wrong */
export function svgIsSafe(svg: string): boolean {
  if (/<script[\s>/]/i.test(svg)) return false;
  if (/\son[a-z]+\s*=/i.test(svg)) return false;
  if (/javascript:/i.test(svg)) return false;
  if (/<foreignObject[\s>/]/i.test(svg)) return false;
  if (/<(iframe|embed|object|animate|set)[\s>/]/i.test(svg) && /(href|src|data)\s*=|attributeName\s*=\s*["']?(href|xlink:href)/i.test(svg)) return false;
  if (/<!ENTITY/i.test(svg)) return false;
  // Links may only point inside the file (#id) or carry the picture itself (data:)
  for (const m of svg.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) if (!/^(#|data:image\/)/i.test(m[1].trim())) return false;
  if (/url\(\s*["']?(?!#|data:)/i.test(svg)) return false;
  return true;
}

/** The stored file checked and measured, as the brand keeps it; an error code when it fails */
export async function inspectBrandFile(key: string, type: string, name?: string): Promise<BrandFile | "missing" | "type" | "unsafe"> {
  const file = await getFile(key);
  if (!file) return "missing";
  if (!sniff(file.body, type)) return "type";
  const out: BrandFile = { key, type, ...(name ? { name: name.slice(0, 200) } : {}) };
  if (type === "image/svg+xml") {
    const text = file.body.toString("utf8");
    if (!svgIsSafe(text)) return "unsafe";
    const vb = text.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    const w = Number(text.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i)?.[1] ?? vb?.[1]);
    const h = Number(text.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i)?.[1] ?? vb?.[2]);
    if (w > 0 && h > 0) { out.w = Math.round(w); out.h = Math.round(h); }
  } else if (type.startsWith("image/")) {
    const meta = await sharp(file.body).metadata().catch(() => null);
    if (meta?.width && meta.height) { out.w = meta.width; out.h = meta.height; }
  }
  return out;
}

/** Every file of a project's brand, when the project goes */
export async function deleteProjectBrandFiles(organizationId: string, projectId: string): Promise<void> {
  const prefix = projectBrandPrefix(organizationId, projectId);
  const files = await listFiles(prefix).catch((err) => { void recordFailure("storage", "brand files list", err, { ref: prefix, organizationId }); return []; });
  // deleteFiles stores its own failure
  if (files.length) await deleteFiles(files.map((f) => f.key));
}
