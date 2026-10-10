// The typefaces a reference really serves. A sheet knows the names of the families; the files are in the
// page's own CSS, as @font-face rules. They are read here with plain fetches (no browser), so the type
// tester can set a specimen in the real face instead of a fallback. The files travel through
// /api/system/font: a site's fonts rarely carry CORS headers, and ours is the origin that asks.
import { createHmac, timingSafeEqual } from "crypto";
import { isPublicHttpUrl, BROWSER_UA } from "./extract";
import { familyBase, familyKey, NOT_TYPE } from "./font-names";
import { safeFetch } from "./safe-fetch";

export interface RefFace {
  /** The family as the site names it ("__Inter_1a2b3c", "PP Neue Montreal") */
  family: string;
  /** A weight or a range of a variable font: "400", "100 900" */
  weight: string;
  style: string;
  /** Path on our origin that serves the file */
  src: string;
  unicodeRange?: string;
  /** Where the file was found: the site itself, or Google Fonts by the family's name */
  from: "site" | "google";
}

const HTML_MAX = 3 * 1024 * 1024;
const CSS_MAX = 3 * 1024 * 1024;
const MAX_SHEETS = 16;
const MAX_FACES = 90;
const TTL_MS = 6 * 60 * 60 * 1000;

// ─── Token ───────────────────────────────────────────────────────────────────
// The font route fetches a URL it is handed: the signature proves this server found that URL in a
// reference's CSS, so the route is not a proxy for anything else.

function secret(): string {
  const s = process.env.LIVE_SECRET || process.env.BETTER_AUTH_SECRET;
  // A known fallback would let anyone sign a URL: production has no fallback
  if (!s && process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is not set");
  return s || "dev-font-secret";
}
const sign = (url: string) => createHmac("sha256", secret()).update(`font|${url}`).digest("hex").slice(0, 24);
export function fontPath(url: string): string {
  return `/api/system/font?u=${encodeURIComponent(url)}&t=${sign(url)}`;
}
export function verifyFontToken(token: string, url: string): boolean {
  const want = sign(url);
  return want.length === token.length && timingSafeEqual(Buffer.from(want), Buffer.from(token));
}

// ─── Reading the CSS ─────────────────────────────────────────────────────────

async function fetchText(url: string, referer: string, max: number, timeoutMs: number, accept: string): Promise<{ text: string; url: string } | null> {
  if (!isPublicHttpUrl(url)) return null;
  try {
    const res = await safeFetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: accept, "Accept-Language": "en-US,en;q=0.8", Referer: referer },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) { await res.body?.cancel(); return null; }
    if (Number(res.headers.get("content-length") ?? 0) > max) { await res.body?.cancel(); return null; }
    const text = await res.text();
    return text.length > max ? null : { text, url: res.url || url };
  } catch {
    return null;
  }
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(1).find((x) => x !== undefined) ?? null;
const resolve = (href: string, base: string) => { try { return new URL(href.replace(/&amp;/g, "&"), base).href; } catch { return null; } };

/** True when a unicode-range covers basic Latin: the other subsets of a family are never fetched */
function coversLatin(range: string | undefined): boolean {
  if (!range) return true;
  return range.split(",").some((seg) => {
    const m = seg.trim().match(/^U\+([0-9a-f?]+)(?:-([0-9a-f]+))?$/i);
    if (!m) return false;
    const lo = parseInt(m[1].replace(/\?/g, "0"), 16), hi = parseInt(m[2] ?? m[1].replace(/\?/g, "f"), 16);
    return lo <= 0x41 && hi >= 0x41;
  });
}

const FORMAT_RANK = ["woff2", "woff", "opentype", "otf", "truetype", "ttf"];
function bestSrc(src: string, base: string): string | null {
  const found: { url: string; rank: number }[] = [];
  for (const [, raw, hint] of src.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)(?:\s*format\(\s*["']?([\w-]+))?/gi)) {
    if (/^data:/i.test(raw)) continue;
    const kind = (hint ?? raw.split(/[?#]/)[0].match(/\.(woff2|woff|otf|ttf)$/i)?.[1] ?? "").toLowerCase().replace(/-variations$/, "");
    const rank = FORMAT_RANK.indexOf(kind);
    if (rank < 0) continue;
    const url = resolve(raw, base);
    if (url && isPublicHttpUrl(url)) found.push({ url, rank });
  }
  return found.sort((a, b) => a.rank - b.rank)[0]?.url ?? null;
}

function facesOf(css: string, base: string, from: RefFace["from"]): RefFace[] {
  const out: RefFace[] = [];
  for (const block of css.match(/@font-face\s*\{[^}]*\}/gi) ?? []) {
    const prop = (name: string) => block.match(new RegExp(`(?:^|[;{\\s])${name}\\s*:\\s*([^;}]+)`, "i"))?.[1].trim();
    const family = prop("font-family")?.replace(/^["']|["']$/g, "").trim();
    const at = block.search(/(?:^|[;{\s])src\s*:/i);
    if (!family || at < 0 || NOT_TYPE.test(family)) continue;
    const unicodeRange = prop("unicode-range");
    if (!coversLatin(unicodeRange)) continue;
    const url = bestSrc(block.slice(at), base);
    if (!url) continue;
    const weight = (prop("font-weight") ?? "400").replace(/normal/i, "400").replace(/bold/i, "700");
    const style = /italic|oblique/i.test(prop("font-style") ?? "") ? "italic" : "normal";
    if (out.some((f) => f.family === family && f.weight === weight && f.style === style)) continue;
    out.push({ family, weight, style, src: fontPath(url), unicodeRange, from });
  }
  return out;
}

async function readPage(web: string): Promise<RefFace[]> {
  const page = await fetchText(web, web, HTML_MAX, 9000, "text/html,application/xhtml+xml");
  if (!page) return [];
  const html = page.text;
  const faces: RefFace[] = [];
  for (const [, css] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) faces.push(...facesOf(css, page.url, "site"));
  const sheets = new Set<string>();
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attr(tag, "rel")?.toLowerCase() ?? "";
    const href = attr(tag, "href");
    if (!href || !(rel.includes("stylesheet") || (rel.includes("preload") && attr(tag, "as")?.toLowerCase() === "style"))) continue;
    const url = resolve(href, page.url);
    if (url) sheets.add(url);
  }
  // One level of @import: where a theme keeps its fonts
  const read = async (url: string, depth: number): Promise<void> => {
    const css = await fetchText(url, page.url, CSS_MAX, 7000, "text/css,*/*;q=0.1");
    if (!css) return;
    faces.push(...facesOf(css.text, css.url, "site"));
    if (depth > 0) return;
    const imports = [...css.text.matchAll(/@import\s+(?:url\(\s*)?["']?([^"');\s]+)/gi)].map((m) => resolve(m[1], css.url)).filter((x): x is string => !!x).slice(0, 4);
    await Promise.all(imports.map((u) => read(u, depth + 1)));
  };
  await Promise.all([...sheets].slice(0, MAX_SHEETS).map((u) => read(u, 0)));
  const seen = new Set<string>();
  return faces.filter((f) => { const k = `${f.family}|${f.weight}|${f.style}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, MAX_FACES);
}

/** A family the site does not serve as a file may be a Google font: its name is enough to ask */
async function readGoogle(family: string): Promise<RefFace[]> {
  const url = `https://fonts.googleapis.com/css?family=${encodeURIComponent(family).replace(/%20/g, "+")}:100,200,300,400,500,600,700,800,900`;
  const css = await fetchText(url, "https://fonts.google.com/", CSS_MAX, 6000, "text/css,*/*;q=0.1");
  return css ? facesOf(css.text, css.url, "google") : [];
}

// ─── Cache ───────────────────────────────────────────────────────────────────
// A site's fonts do not change between two openings of a project: one read per instance and a few hours

const cache = new Map<string, { at: number; faces: Promise<RefFace[]> }>();
function cached(key: string, read: () => Promise<RefFace[]>): Promise<RefFace[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.faces;
  const faces = read().catch(() => [] as RefFace[]);
  cache.set(key, { at: Date.now(), faces });
  if (cache.size > 400) cache.delete(cache.keys().next().value!);
  return faces;
}

/** Every face the page of a reference declares */
export function pageFaces(web: string): Promise<RefFace[]> {
  return cached(`page|${web}`, () => readPage(web));
}

/** The faces of a reference, plus Google's for the families its sheet names and its CSS does not serve */
export async function refFaces(web: string, sheetFamilies: string[]): Promise<RefFace[]> {
  const site = await pageFaces(web);
  const keys = new Set(site.map((f) => familyKey(f.family)));
  const missing = sheetFamilies.map(familyBase).filter((name, i, all) => name && !keys.has(familyKey(name)) && all.indexOf(name) === i);
  const google = await Promise.all(missing.slice(0, 4).map((name) => cached(`google|${familyKey(name)}`, () => readGoogle(name))));
  return [...site, ...google.flat()];
}
