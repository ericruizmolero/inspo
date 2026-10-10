// Every site on the board is drawn from a full-page screenshot taken once and stored: the DESIGN.md
// capture when the site has one, otherwise a capture of its own (scripts/capture-pages.ts, and on add).
// The board never renders a site, it only loads images: the top of the page, cut at PAGE_MAX_RATIO,
// at three widths. The panel shows the whole page.
import "server-only";
import { eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { putFile, getFile, deleteFiles, keyOf, signedFileUrl } from "./storage";
import { normalizeWebUrl, webKeyOf } from "./url";
import { PAGE_MAX_RATIO } from "./board";
import type { PageShot } from "@/types/inspo";

/** The page's most common colour, as #rrggbb: what the board paints before the image arrives */
export async function colorOf(image: Buffer): Promise<string> {
  const sharp = (await import("sharp")).default;
  const { r, g, b } = (await sharp(image).stats()).dominant;
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/** The colour of a stored board copy (its thumb), or undefined when it can't be read */
export async function colorOfStored(url: string | undefined): Promise<string | undefined> {
  const k = url ? keyOf(url) : null;
  const f = k ? await getFile(k).catch(() => null) : null;
  return f ? colorOf(f.body).catch(() => undefined) : undefined;
}

/** The three board copies of a page, cut at PAGE_MAX_RATIO. `prefix` is a storage key without extension. */
export async function makeCanvasCopies(prefix: string, full: Buffer): Promise<Omit<PageShot, "shotUrl">> {
  const sharp = (await import("sharp")).default;
  const { width = 1440, height = 900 } = await sharp(full).metadata();
  const top = Math.min(height, Math.round(width * PAGE_MAX_RATIO));
  const cut = () => sharp(full).extract({ left: 0, top: 0, width, height: top });
  const [topJ, tileJ, thumbJ] = await Promise.all([
    cut().jpeg({ quality: 72, mozjpeg: true }).toBuffer(),
    cut().resize({ width: 720 }).jpeg({ quality: 70, mozjpeg: true }).toBuffer(),
    cut().resize({ width: 288 }).jpeg({ quality: 62, mozjpeg: true }).toBuffer(),
  ]);
  const t = Date.now();
  const [topUrl, tileUrl, thumbUrl] = await Promise.all([
    putFile(`${prefix}-top-${t}.jpg`, topJ, "image/jpeg"),
    putFile(`${prefix}-tile-${t}.jpg`, tileJ, "image/jpeg"),
    putFile(`${prefix}-thumb-${t}.jpg`, thumbJ, "image/jpeg"),
  ]);
  return { topUrl, tileUrl, thumbUrl, shotH: Math.round((height * 1440) / width), color: await colorOf(thumbJ).catch(() => undefined) };
}

/** The addresses asked for, by the web key they share: a site typed two ways is read once and answered for both */
export function byWebKey(webs: Iterable<string>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const web of webs) {
    const key = webKeyOf(web);
    out.set(key, [...(out.get(key) ?? []), web]);
  }
  return out;
}

// ─── Captures of sites without a DESIGN.md ──────────────────────────────────
// One row of page_shot per site, keyed by webKeyOf(url) and shared across workspaces like the DESIGN.md
// ones; its files under inspo/pages/<key>-*.jpg.
export const PAGES_PREFIX = "inspo/pages/";
const S = schema.pageShot;
const D = schema.designDoc;

const shotOf = (r: Pick<typeof S.$inferSelect, "shotUrl" | "topUrl" | "tileUrl" | "thumbUrl" | "shotH" | "color">): PageShot =>
  ({ shotUrl: r.shotUrl, topUrl: r.topUrl, tileUrl: r.tileUrl, thumbUrl: r.thumbUrl, shotH: r.shotH, ...(r.color ? { color: r.color } : {}) });

/** The capture of a site with no DESIGN.md, or null */
export async function getPageShot(url: string): Promise<PageShot | null> {
  const [row] = await db.select().from(S).where(eq(S.webKey, webKeyOf(url))).limit(1);
  return row ? shotOf(row) : null;
}

/** Stores a full-page capture and its board copies as the site's row, and drops the files of the one it replaces */
export async function savePageShot(url: string, key: string, full: Buffer): Promise<PageShot> {
  const t = Date.now();
  const shotUrl = await putFile(`${PAGES_PREFIX}${key}-${t}.jpg`, full, "image/jpeg");
  const copies = await makeCanvasCopies(`${PAGES_PREFIX}${key}`, full);
  const shot: PageShot = { shotUrl, ...copies };
  const row: typeof S.$inferInsert = { webKey: webKeyOf(url), url: normalizeWebUrl(url) ?? url, ...shot, color: shot.color ?? null, updatedAt: new Date() };
  // The row changes hands under a lock: two captures of one site each delete only the files their own write replaced
  const before = await db.transaction(async (tx) => {
    const [b] = await tx.select().from(S).where(eq(S.webKey, row.webKey)).for("update");
    await tx.insert(S).values(row).onConflictDoUpdate({ target: S.webKey, set: row });
    return b ?? null;
  });
  if (before) {
    const now = new Set([shot.shotUrl, shot.topUrl, shot.tileUrl, shot.thumbUrl]);
    await deleteFiles([before.shotUrl, before.topUrl, before.tileUrl, before.thumbUrl]
      .filter((u) => !now.has(u)).map(keyOf).filter((k): k is string => !!k && k.startsWith(PAGES_PREFIX)));
  }
  return shot;
}

/** Captures made before the colour existed get it from their stored thumb. Returns how many changed. */
export async function addMissingColors(log: (m: string) => void = () => {}): Promise<number> {
  let n = 0;
  for (const row of await db.select().from(S).where(isNull(S.color))) {
    const color = await colorOfStored(row.thumbUrl);
    if (!color) continue;
    await db.update(S).set({ color }).where(eq(S.webKey, row.webKey));
    n++;
    log(`${row.url}: ${color}`);
  }
  return n;
}

/** The page of each of these sites, by the address the caller gave: the DESIGN.md capture first, then a capture
 *  of its own. Sites with neither are left out. */
export async function pageShotsFor(webs: Iterable<string>): Promise<Record<string, PageShot>> {
  const asked = byWebKey(webs);
  if (!asked.size) return {};
  const keys = [...asked.keys()];
  const [pages, docs] = await Promise.all([
    db.select().from(S).where(inArray(S.webKey, keys)),
    db.select({ webKey: D.webKey, shotUrl: D.screenshotUrl, topUrl: D.topUrl, tileUrl: D.tileUrl, thumbUrl: D.thumbUrl, shotH: D.shotH, color: D.color }).from(D).where(inArray(D.webKey, keys)),
  ]);
  const out: Record<string, PageShot> = {};
  for (const p of pages) for (const web of asked.get(p.webKey)!) out[web] = shotOf(p);
  for (const d of docs) {
    if (!(d.shotUrl && d.topUrl && d.tileUrl && d.thumbUrl && d.shotH)) continue;
    for (const web of asked.get(d.webKey)!) out[web] = shotOf({ ...d, shotUrl: d.shotUrl, topUrl: d.topUrl, tileUrl: d.tileUrl, thumbUrl: d.thumbUrl, shotH: d.shotH });
  }
  return out;
}

/**
 * The board copies as signed R2 links, so the browser loads them straight from the bucket, all at once,
 * instead of one round trip through the app per image. A link lives an hour or more; `signed` keeps the
 * app paths, which the card falls back to if a tab outlives the link. On disk nothing changes.
 */
export async function signCanvasCopies(shots: Record<string, PageShot>): Promise<Record<string, PageShot>> {
  const sign = async (u: string) => { const k = keyOf(u); return (k && (await signedFileUrl(k).catch(() => null))?.url) || u; };
  const out: Record<string, PageShot> = {};
  await Promise.all(Object.entries(shots).map(async ([web, s]) => {
    const [topUrl, tileUrl, thumbUrl] = await Promise.all([sign(s.topUrl), sign(s.tileUrl), sign(s.thumbUrl)]);
    out[web] = { ...s, topUrl, tileUrl, thumbUrl, ...(topUrl !== s.topUrl ? { paths: { topUrl: s.topUrl, tileUrl: s.tileUrl, thumbUrl: s.thumbUrl } } : {}) };
  }));
  return out;
}
