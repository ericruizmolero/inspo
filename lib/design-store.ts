import "server-only";
import { eq, inArray } from "drizzle-orm";
import { createHash } from "crypto";
import { db, schema } from "./db";
import { webKeyOf } from "./url";
import { putFile, getFile, deleteFiles, keyOf } from "./storage";
import { makeCanvasCopies, colorOfStored, byWebKey } from "./page-shots";
import type { DesignSpec } from "@/types/design";
import type { SiteCopy } from "./ref-measured";
import type { DesignIndex } from "@/types/inspo";
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
  copy?: SiteCopy;            // the headline, headings and buttons, for criterio.md's voice samples (missing in old entries)
}

export interface DesignImages { fullShot: Buffer; cover: Buffer; scroll: Buffer; logo?: Buffer | null; logoSvg?: string | null }

// The doc is a row of design_doc, keyed by webKeyOf(url) and shared across workspaces. Its images are files
// (lib/storage.ts): inspo/design-md/<key>[-cover|-scroll|-logo|-top|-tile|-thumb]-<t>.jpg, <key> a hash of
// that same web key, <t> a timestamp that busts browser caches.
/** Prefix of the DESIGN.md images (the file route lets any signed-in person read them) */
export const DESIGN_MD_PREFIX = "inspo/design-md/";

export function keyFor(url: string): string {
  return createHash("sha1").update(webKeyOf(url)).digest("hex").slice(0, 16);
}

const D = schema.designDoc;
type Row = typeof D.$inferSelect;

const opt = <T>(v: T | null) => v ?? undefined;
const entryOf = (r: Row): DesignMdEntry => ({
  url: r.url, markdown: r.markdown, generatedAt: r.generatedAt.toISOString(), model: r.model, spec: opt(r.spec),
  screenshotUrl: opt(r.screenshotUrl), coverUrl: opt(r.coverUrl), scrollUrl: opt(r.scrollUrl), logoUrl: opt(r.logoUrl), logoSvgUrl: opt(r.logoSvgUrl),
  shotH: opt(r.shotH), topUrl: opt(r.topUrl), tileUrl: opt(r.tileUrl), thumbUrl: opt(r.thumbUrl), color: opt(r.color),
  icons: opt(r.icons), fontFiles: opt(r.fontFiles), copy: opt(r.copy),
});
const rowOf = (e: DesignMdEntry): typeof D.$inferInsert => ({
  webKey: webKeyOf(e.url), url: e.url, markdown: e.markdown, generatedAt: new Date(e.generatedAt), model: e.model, spec: e.spec ?? null,
  screenshotUrl: e.screenshotUrl ?? null, coverUrl: e.coverUrl ?? null, scrollUrl: e.scrollUrl ?? null, logoUrl: e.logoUrl ?? null, logoSvgUrl: e.logoSvgUrl ?? null,
  shotH: e.shotH ?? null, topUrl: e.topUrl ?? null, tileUrl: e.tileUrl ?? null, thumbUrl: e.thumbUrl ?? null, color: e.color ?? null,
  icons: e.icons ?? null, fontFiles: e.fontFiles ?? null, copy: e.copy ?? null, updatedAt: new Date(),
});

async function saveImage(key: string, suffix: string, data: Buffer, ext: "jpg" | "png" | "svg" = "jpg"): Promise<string> {
  return putFile(`${DESIGN_MD_PREFIX}${key}${suffix}-${Date.now()}.${ext}`, data, ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : "image/jpeg");
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function getDesignMd(url: string): Promise<DesignMdEntry | null> {
  const [row] = await db.select().from(D).where(eq(D.webKey, webKeyOf(url))).limit(1);
  return row ? entryOf(row) : null;
}

/** What the library knows of each site's DESIGN.md without loading it, by the address the caller gave */
export async function designDocsFor(webs: Iterable<string>): Promise<DesignIndex> {
  const asked = byWebKey(webs);
  if (!asked.size) return {};
  const rows = await db.select({
    webKey: D.webKey, coverUrl: D.coverUrl, scrollUrl: D.scrollUrl,
    shotUrl: D.screenshotUrl, topUrl: D.topUrl, tileUrl: D.tileUrl, thumbUrl: D.thumbUrl, shotH: D.shotH, color: D.color,
  }).from(D).where(inArray(D.webKey, [...asked.keys()]));
  const out: DesignIndex = {};
  for (const { webKey, ...r } of rows) {
    const entry = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null)) as DesignIndex[string];
    for (const web of asked.get(webKey)!) out[web] = entry;
  }
  return out;
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

/** Writes the site's row under a lock and returns the one it replaced, so two saves of one site each delete only
 *  the images their own write took out of use. The images themselves are the caller's: saveDesignMd stores
 *  them first, scripts/migrate-r2-indexes.ts brings entries whose images are already there. */
export async function upsertDesignDoc(entry: DesignMdEntry): Promise<DesignMdEntry | null> {
  const row = rowOf(entry);
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(D).where(eq(D.webKey, row.webKey)).for("update");
    await tx.insert(D).values(row).onConflictDoUpdate({ target: D.webKey, set: row });
    return before ? entryOf(before) : null;
  });
}

export async function saveDesignMd(entry: DesignMdEntry, images: DesignImages): Promise<DesignMdEntry> {
  const key = keyFor(entry.url);
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

  // The images this generation replaced, once nothing points at them
  await dropReplaced(await upsertDesignDoc(entry), entry);
  return entry;
}

/**
 * Docs saved before the canvas existed have no page height and no smaller copies: makes them from the
 * full screenshot already stored. Safe to run twice (docs that have them are skipped). Returns how many changed.
 */
export async function backfillCanvasShots(log: (msg: string) => void = () => {}): Promise<number> {
  let done = 0;
  for (const row of await db.select().from(D)) {
    const entry = entryOf(row);
    if (!entry.screenshotUrl) continue;
    if (entry.shotH && entry.topUrl && entry.tileUrl && entry.thumbUrl) {
      // Cut before the colour existed: read it off the stored thumb
      if (entry.color) continue;
      const color = await colorOfStored(entry.thumbUrl);
      if (!color) continue;
      await db.update(D).set({ color }).where(eq(D.webKey, row.webKey));
      done++;
      log(`${entry.url}: ${color}`);
      continue;
    }
    const k = keyOf(entry.screenshotUrl);
    const file = k ? await getFile(k).catch(() => null) : null;
    if (!file) { log(`skip ${entry.url}: screenshot not found`); continue; }
    const shots = await canvasShots(keyFor(entry.url), file.body);
    if (!shots.shotH) { log(`skip ${entry.url}: could not resize`); continue; }
    await db.update(D).set({ ...shots, updatedAt: new Date() }).where(eq(D.webKey, row.webKey));
    await dropReplaced(entry, { ...entry, ...shots });
    done++;
    log(`${entry.url}: ${shots.shotH}px`);
  }
  return done;
}
