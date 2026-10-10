import "server-only";
import { webSet } from "./items";
import { normalizeWebUrl, webKeyOf } from "./url";
import { putFile, getFile, getJson, putJson, deleteFiles, keyOf } from "./storage";
import { createHash } from "crypto";
import { makeCanvasCopies, colorOfStored } from "./page-shots";

import type { DesignSpec } from "@/types/design";
import { svgIsSafe } from "./brand-files";
import { log } from "./log";

export interface DesignMdEntry {
  url: string;
  markdown: string;
  generatedAt: string;
  model: string;
  spec?: DesignSpec;          // missing in old entries
  screenshotUrl?: string;     // whole page at 1440px (a /api/files/… path)
  coverUrl?: string;          // 720x450, grid cover
  scrollUrl?: string;         // 720px wide, strip for the grid hover
  logoUrl?: string;           // png of the logo as it sits on the page, at 2x (missing when none was found)
  logoSvgUrl?: string;        // the logo as its own svg, colours baked in, when the page draws it as one
  shotH?: number;             // height of screenshotUrl in px (1440 wide): the canvas sizes the card before it loads
  topUrl?: string;            // the top of the page (cut at twice its width) at 1440, 720 and 288px: the canvas
  tileUrl?: string;
  thumbUrl?: string;
  color?: string;             // the page's most common colour, painted on the canvas before the image
  icons?: string[];           // up to 8 of the site's icons as standalone svg markup
  fontFiles?: { family: string; formats: string[] }[]; // the file format each @font-face family is served in
}

export interface DesignImages { fullShot: Buffer; cover: Buffer; scroll: Buffer; logo?: Buffer | null; logoSvg?: string | null }

export interface DesignMdIndexEntry {
  generatedAt: string; model: string; coverUrl?: string; scrollUrl?: string;
  /** The whole page (shotUrl), its top at 1440, 720 and 288 wide, and the whole page's height at 1440 */
  shotUrl?: string; topUrl?: string; tileUrl?: string; thumbUrl?: string; shotH?: number; color?: string;
}
export type DesignMdIndex = Record<string, DesignMdIndexEntry>;

const indexEntry = (e: DesignMdEntry): DesignMdIndexEntry => ({
  generatedAt: e.generatedAt, model: e.model, coverUrl: e.coverUrl, scrollUrl: e.scrollUrl,
  shotUrl: e.screenshotUrl, topUrl: e.topUrl, tileUrl: e.tileUrl, thumbUrl: e.thumbUrl, shotH: e.shotH, color: e.color,
});

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

async function saveImage(key: string, suffix: string, data: Buffer, ext: "jpg" | "png" | "svg" = "jpg"): Promise<string> {
  return putFile(`${DESIGN_MD_PREFIX}${key}${suffix}-${Date.now()}.${ext}`, data, ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : "image/jpeg");
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function getDesignMd(url: string): Promise<DesignMdEntry | null> {
  try { return await getJson<DesignMdEntry>(entryKey(keyFor(url))); }
  catch (err) { log.error("design_store.read_failed", { ref: url, err }); return null; }
}

/** Prefix of a workspace's "why it's here" captures (the file route allows it for that workspace) */
export const whyShotPrefix = (organizationId: string) => `inspo/design-why/${organizationId}/`;

/** The full-page screenshot saved with the DESIGN.md (for models that need to look), or null. */
export async function getDesignScreenshot(url: string): Promise<Buffer | null> {
  const entry = await getDesignMd(url);
  const key = entry?.screenshotUrl ? keyOf(entry.screenshotUrl) : null;
  if (!key) return null;
  try { return (await getFile(key))?.body ?? null; } catch (err) { log.warn("storage.read_failed", { ref: key, err }); return null; }
}

// Read on every library load: kept in memory for a short while, and replaced by what this process writes.
// Callers that change it copy it first.
const INDEX_FRESH_MS = 20_000;
let indexCache: { at: number; index: Promise<DesignMdIndex> } | null = null;
export function getDesignMdIndex(): Promise<DesignMdIndex> {
  if (indexCache && Date.now() - indexCache.at < INDEX_FRESH_MS) return indexCache.index;
  const index = getJson<DesignMdIndex>(INDEX_KEY).then((v) => v ?? {}, (err) => { log.error("design_store.index_failed", { err }); return {}; });
  indexCache = { at: Date.now(), index };
  return index;
}
async function writeIndex(index: DesignMdIndex) {
  await putJson(INDEX_KEY, index);
  indexCache = { at: Date.now(), index: Promise.resolve(index) };
}

/** The index trimmed to this workspace's sites. `webs`: its addresses when the caller already has them. */
export async function designMdIndexFor(organizationId: string, webs?: Set<string>): Promise<DesignMdIndex> {
  const [index, mine] = await Promise.all([getDesignMdIndex(), webs ?? webSet(organizationId)]);
  const norm = new Set([...mine].map((w) => normalizeWebUrl(w) ?? w));
  return Object.fromEntries(Object.entries(index).filter(([u]) => norm.has(u)));
}

/** The canvas copies of the page (lib/page-shots.ts). Never throws: a page without them still shows. */
async function canvasShots(key: string, fullShot: Buffer): Promise<Pick<DesignMdEntry, "shotH" | "topUrl" | "tileUrl" | "thumbUrl" | "color">> {
  try { return await makeCanvasCopies(`${DESIGN_MD_PREFIX}${key}`, fullShot); }
  catch (err) { log.warn("design_store.canvas_copies_failed", { ref: key, err }); return {}; }
}

const imagesOf = (e: DesignMdEntry | null) => e ? [e.screenshotUrl, e.coverUrl, e.scrollUrl, e.logoUrl, e.logoSvgUrl, e.topUrl, e.tileUrl, e.thumbUrl] : [];

/** Deletes the design images `before` had that `after` no longer points at */
async function dropReplaced(before: DesignMdEntry | null, after: DesignMdEntry) {
  if (!before) return;
  const now = new Set(imagesOf(after));
  await deleteFiles(imagesOf(before)
    .filter((u): u is string => !!u && !now.has(u)).map(keyOf).filter((k): k is string => !!k && k.startsWith(DESIGN_MD_PREFIX)));
}

export async function saveDesignMd(entry: DesignMdEntry, images?: DesignImages): Promise<DesignMdEntry> {
  const key = keyFor(entry.url);
  const before = images ? await getDesignMd(entry.url) : null;
  if (images) {
    const [screenshotUrl, coverUrl, scrollUrl, shots] = await Promise.all([
      saveImage(key, "", images.fullShot),
      saveImage(key, "-cover", images.cover),
      saveImage(key, "-scroll", images.scroll),
      canvasShots(key, images.fullShot),
    ]);
    Object.assign(entry, { screenshotUrl, coverUrl, scrollUrl, shotH: undefined, topUrl: undefined, tileUrl: undefined, thumbUrl: undefined, color: undefined }, shots);
    entry.logoUrl = images.logo ? await saveImage(key, "-logo", images.logo, "png") : undefined;
    // Kept only when it is a plain drawing: it is shown to people outside the team through a brand's share
    entry.logoSvgUrl = images.logoSvg && svgIsSafe(images.logoSvg) ? await saveImage(key, "-logo", Buffer.from(images.logoSvg), "svg") : undefined;
  }
  await putJson(entryKey(key), entry);

  indexCache = null; // read it fresh before changing it: another process may have written since
  const index = { ...(await getDesignMdIndex()) };
  index[entry.url] = indexEntry(entry);
  await writeIndex(index);

  // The images this generation replaced, once nothing points at them
  await dropReplaced(before, entry);
  return entry;
}

/**
 * Entries saved before the canvas existed have no page height and no smaller copies: makes them from the
 * full screenshot already stored. Safe to run twice (entries that have them are skipped). Returns how many changed.
 */
export async function backfillCanvasShots(log: (msg: string) => void = () => {}): Promise<number> {
  indexCache = null;
  const index = { ...(await getDesignMdIndex()) };
  let done = 0;
  for (const url of Object.keys(index)) {
    const entry = await getDesignMd(url);
    if (!entry?.screenshotUrl || (entry.shotH && entry.topUrl && entry.tileUrl && entry.thumbUrl)) {
      // Cut before the colour existed: read it off the stored thumb
      if (entry?.thumbUrl && !entry.color) {
        const color = await colorOfStored(entry.thumbUrl);
        if (color) { entry.color = color; await putJson(entryKey(keyFor(url)), entry); log(`${url}: ${color}`); }
      }
      // The entry has them but the index missed them (written before this field existed)
      if (entry?.topUrl && (!index[url].topUrl || index[url].color !== entry.color)) { index[url] = indexEntry(entry); done++; }
      continue;
    }
    const k = keyOf(entry.screenshotUrl);
    const file = k ? await getFile(k).catch(() => null) : null;
    if (!file) { log(`skip ${url}: screenshot not found`); continue; }
    const shots = await canvasShots(keyFor(url), file.body);
    if (!shots.shotH) { log(`skip ${url}: could not resize`); continue; }
    const before = { ...entry };
    Object.assign(entry, shots);
    await putJson(entryKey(keyFor(url)), entry);
    index[url] = indexEntry(entry);
    await dropReplaced(before, entry);
    done++;
    log(`${url}: ${shots.shotH}px`);
  }
  if (done) await writeIndex(index);
  return done;
}
