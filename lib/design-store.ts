import "server-only";
import { webSet } from "./items";
import { normalizeWebUrl, webKeyOf } from "./url";
import { putFile, getFile, getJson, putJson, deleteFiles, keyOf } from "./storage";
import { createHash } from "crypto";

import type { DesignSpec } from "@/types/design";

export interface DesignMdEntry {
  url: string;
  markdown: string;
  generatedAt: string;
  model: string;
  spec?: DesignSpec;          // missing in old entries
  screenshotUrl?: string;     // whole page at 1440px (a /api/files/… path)
  coverUrl?: string;          // 720x450, grid cover
  scrollUrl?: string;         // 720px wide, strip for the grid hover
}

export interface DesignImages { fullShot: Buffer; cover: Buffer; scroll: Buffer }

export type DesignMdIndex = Record<string, { generatedAt: string; model: string; coverUrl?: string; scrollUrl?: string }>;

// Files (lib/storage.ts), shared across workspaces:
//   inspo/design-md/<key>.json               one entry per site
//   inspo/design-md/<key>[-cover|-scroll]-<t>.jpg  its images (the timestamp busts browser caches)
//   inspo/design-md-index.json               every entry's summary, for the library grid
/** Prefix of the DESIGN.md files (the file route lets any signed-in person read it) */
export const DESIGN_MD_PREFIX = "inspo/design-md/";
const INDEX_KEY = "inspo/design-md-index.json"; // outside the prefix so it isn't mistaken for an entry

export function keyFor(url: string): string {
  return createHash("sha1").update(webKeyOf(url)).digest("hex").slice(0, 16);
}

const entryKey = (key: string) => `${DESIGN_MD_PREFIX}${key}.json`;

async function saveImage(key: string, suffix: string, jpeg: Buffer): Promise<string> {
  return putFile(`${DESIGN_MD_PREFIX}${key}${suffix}-${Date.now()}.jpg`, jpeg, "image/jpeg");
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function getDesignMd(url: string): Promise<DesignMdEntry | null> {
  try { return await getJson<DesignMdEntry>(entryKey(keyFor(url))); }
  catch (e) { console.error("design-store get:", e); return null; }
}

/** Prefix of a workspace's "why it's here" captures (the file route allows it for that workspace) */
export const whyShotPrefix = (organizationId: string) => `inspo/design-why/${organizationId}/`;

/** Saves one capture of the site (image, video or sound) for this workspace's "why". Returns its path. */
export async function saveWhyAsset(organizationId: string, url: string, id: string, data: Buffer, mime: string, ext: string): Promise<string> {
  return putFile(`${whyShotPrefix(organizationId)}${keyFor(url)}-${id}-${Date.now()}.${ext}`, data, mime);
}

/** The full-page screenshot saved with the DESIGN.md (for models that need to look), or null. */
export async function getDesignScreenshot(url: string): Promise<Buffer | null> {
  const entry = await getDesignMd(url);
  const key = entry?.screenshotUrl ? keyOf(entry.screenshotUrl) : null;
  if (!key) return null;
  try { return (await getFile(key))?.body ?? null; } catch { return null; }
}

export async function getDesignMdIndex(): Promise<DesignMdIndex> {
  try { return (await getJson<DesignMdIndex>(INDEX_KEY)) ?? {}; }
  catch (e) { console.error("design-store index:", e); return {}; }
}

/** The index trimmed to this workspace's sites. */
export async function designMdIndexFor(organizationId: string): Promise<DesignMdIndex> {
  const [index, mine] = await Promise.all([getDesignMdIndex(), webSet(organizationId)]);
  const norm = new Set([...mine].map((w) => normalizeWebUrl(w) ?? w));
  return Object.fromEntries(Object.entries(index).filter(([u]) => norm.has(u)));
}

export async function saveDesignMd(entry: DesignMdEntry, images?: DesignImages): Promise<DesignMdEntry> {
  const key = keyFor(entry.url);
  const before = images ? await getDesignMd(entry.url) : null;
  if (images) {
    [entry.screenshotUrl, entry.coverUrl, entry.scrollUrl] = await Promise.all([
      saveImage(key, "", images.fullShot),
      saveImage(key, "-cover", images.cover),
      saveImage(key, "-scroll", images.scroll),
    ]);
  }
  await putJson(entryKey(key), entry);

  const index = await getDesignMdIndex();
  index[entry.url] = { generatedAt: entry.generatedAt, model: entry.model, coverUrl: entry.coverUrl, scrollUrl: entry.scrollUrl };
  await putJson(INDEX_KEY, index);

  // The images this generation replaced, once nothing points at them
  if (before) {
    const now = new Set([entry.screenshotUrl, entry.coverUrl, entry.scrollUrl]);
    await deleteFiles([before.screenshotUrl, before.coverUrl, before.scrollUrl]
      .filter((u): u is string => !!u && !now.has(u)).map(keyOf).filter((k): k is string => !!k && k.startsWith(DESIGN_MD_PREFIX)));
  }
  return entry;
}
