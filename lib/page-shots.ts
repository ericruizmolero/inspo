// Every site on the board is drawn from a full-page screenshot taken once and stored: the DESIGN.md
// capture when the site has one, otherwise a capture of its own (scripts/capture-pages.ts, and on add).
// The board never renders a site, it only loads images: the top of the page, cut at PAGE_MAX_RATIO,
// at three widths. The panel shows the whole page.
import "server-only";
import { putFile, getFile, getJson, putJson, deleteFiles, keyOf, signedFileUrl } from "./storage";
import { normalizeWebUrl } from "./url";
import { webSet } from "./items";
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

// ─── Captures of sites without a DESIGN.md ──────────────────────────────────
// inspo/pages/<key>-*.jpg and one index, shared across workspaces like the DESIGN.md ones.
export const PAGES_PREFIX = "inspo/pages/";
const INDEX_KEY = "inspo/page-shots-index.json";
type PageIndex = Record<string, PageShot>;

// Read on every library load: kept in memory for a short while, and replaced by what this process writes
const FRESH_MS = 20_000;
let cached: { at: number; index: Promise<PageIndex> } | null = null;
export function getPageIndex(): Promise<PageIndex> {
  if (cached && Date.now() - cached.at < FRESH_MS) return cached.index;
  const index = getJson<PageIndex>(INDEX_KEY).then((v) => v ?? {}, () => ({}));
  cached = { at: Date.now(), index };
  return index;
}

// Captures finish one after another in this process: the index is read and written in turn
let writing: Promise<unknown> = Promise.resolve();

/** Stores a full-page capture and its board copies, and lists it in the index */
export async function savePageShot(url: string, key: string, full: Buffer): Promise<PageShot> {
  const t = Date.now();
  const shotUrl = await putFile(`${PAGES_PREFIX}${key}-${t}.jpg`, full, "image/jpeg");
  const copies = await makeCanvasCopies(`${PAGES_PREFIX}${key}`, full);
  const shot: PageShot = { shotUrl, ...copies };
  const norm = normalizeWebUrl(url) ?? url;
  const job = writing.then(async () => {
    cached = null; // read it fresh: another process may have written since
    const index = { ...(await getPageIndex()) };
    const before = index[norm];
    index[norm] = shot;
    await putJson(INDEX_KEY, index);
    cached = { at: Date.now(), index: Promise.resolve(index) };
    if (before) {
      await deleteFiles([before.shotUrl, before.topUrl, before.tileUrl, before.thumbUrl]
        .map((u) => (u ? keyOf(u) : null)).filter((k): k is string => !!k && k.startsWith(PAGES_PREFIX)));
    }
  });
  writing = job.catch(() => {}); // only the order: the caller awaits the job and gets its error
  await job;
  return shot;
}

/** Index entries made before the colour existed get it from their stored thumb. Returns how many changed. */
export async function addMissingColors(log: (m: string) => void = () => {}): Promise<number> {
  cached = null;
  const index = { ...(await getPageIndex()) };
  let n = 0;
  for (const [url, s] of Object.entries(index)) {
    if (s.color) continue;
    const color = await colorOfStored(s.thumbUrl);
    if (!color) continue;
    s.color = color; n++;
    log(`${url}: ${color}`);
  }
  if (n) { await putJson(INDEX_KEY, index); cached = { at: Date.now(), index: Promise.resolve(index) }; }
  return n;
}

/** The page of each of this workspace's sites: the DESIGN.md capture first, then a capture of its own.
 *  `webs`: the workspace's addresses when the caller already has them (saves a query). */
export async function pageShotsFor(organizationId: string, designIndex: Record<string, Partial<PageShot>>, pageIndex?: PageIndex, webs?: Set<string>): Promise<Record<string, PageShot>> {
  const [pages, mine] = await Promise.all([pageIndex ?? getPageIndex(), webs ?? webSet(organizationId)]);
  const out: Record<string, PageShot> = {};
  for (const web of mine) {
    const norm = normalizeWebUrl(web) ?? web;
    const d = designIndex[norm];
    const shot = d?.topUrl && d.tileUrl && d.thumbUrl && d.shotUrl && d.shotH ? (d as PageShot) : pages[norm];
    if (shot) out[web] = shot;
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
