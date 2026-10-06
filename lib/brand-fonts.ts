// Where a brand's typeface can be loaded from, so the presentation sets its specimens in the real face: the
// client's own site (its @font-face rules), Google Fonts, Fontshare, or nowhere (a fallback stack stands in, and
// the presentation says so). Plain fetches, no browser; each answer is kept for a day.
import "server-only";
import { pageFaces } from "./ref-fonts";
import { familyBase, familyKey } from "./font-names";
import type { FontSource } from "@/types/brand";
import { safeFetch } from "./safe-fetch";

export interface ResolvedFace { family: string; source: FontSource; slug?: string; siteWeb?: string; weights: number[] }

const DAY = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; v: Promise<unknown> }>();
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DAY) return hit.v as Promise<T>;
  const v = fn().catch((e) => { cache.delete(key); throw e; });
  cache.set(key, { at: Date.now(), v });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return v;
}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const ALL = [100, 200, 300, 400, 500, 600, 700, 800, 900];

async function css(url: string): Promise<string | null> {
  try {
    const res = await safeFetch(url, { headers: { "User-Agent": UA, Accept: "text/css,*/*" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) { await res.body?.cancel(); return null; }
    return await res.text();
  } catch { return null; }
}

/** The weights a stylesheet declares, a variable range spread to its hundreds */
function weightsIn(text: string): number[] {
  const out = new Set<number>();
  for (const m of text.matchAll(/font-weight:\s*(\d{3})(?:\s+(\d{3}))?/g)) {
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    for (const w of ALL) if (w >= a && w <= b) out.add(w);
  }
  return [...out].sort((x, y) => x - y);
}

export const fontshareSlug = (family: string) => familyBase(family).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Google Fonts: a variable range first (it answers 400 for a static family), then the family at its default */
function google(family: string): Promise<number[] | null> {
  const name = encodeURIComponent(familyBase(family)).replace(/%20/g, "+");
  return cached(`g|${familyKey(family)}`, async () => {
    const range = await css(`https://fonts.googleapis.com/css2?family=${name}:wght@100..900&display=swap`);
    if (range) { const w = weightsIn(range); if (w.length) return w; }
    const plain = await css(`https://fonts.googleapis.com/css2?family=${name}&display=swap`);
    return plain && /@font-face/.test(plain) ? [400] : null;
  });
}

/** Fontshare answers a one-byte sheet for a family it does not have, and only the weights a family has */
function fontshare(family: string): Promise<number[] | null> {
  const slug = fontshareSlug(family);
  if (!slug) return Promise.resolve(null);
  return cached(`f|${slug}`, async () => {
    const text = await css(`https://api.fontshare.com/v2/css?f[]=${slug}@${ALL.join(",")}&display=swap`);
    if (!text || !/@font-face/.test(text)) return null;
    const w = weightsIn(text);
    return w.length ? w : null;
  });
}

/**
 * Where a family can be loaded from. The client's site first (it is the brand's own licence), then the free
 * catalogues; `wanted` are the weights the brand uses, kept to the ones the source has when it says.
 */
export async function resolveFace(family: string, wanted: number[], clientWeb?: string | null): Promise<ResolvedFace> {
  const name = familyBase(family) || family;
  const keep = (have: number[] | null) => {
    const w = wanted.filter((x) => !have || have.includes(x));
    return (w.length ? w : have?.slice(0, 4) ?? wanted).sort((a, b) => a - b);
  };
  if (clientWeb) {
    const faces = await pageFaces(clientWeb).catch(() => []);
    const own = faces.filter((f) => familyKey(f.family) === familyKey(name));
    if (own.length) {
      const have = [...new Set(own.flatMap((f) => { const [a, b] = f.weight.split(/\s+/).map(Number); return ALL.filter((w) => w >= a && w <= (b || a)); }))];
      return { family: name, source: "site", siteWeb: clientWeb, weights: keep(have.length ? have : null) };
    }
  }
  const g = await google(name);
  if (g) return { family: name, source: "google", weights: keep(g) };
  const f = await fontshare(name);
  if (f) return { family: name, source: "fontshare", slug: fontshareSlug(name), weights: keep(f) };
  return { family: name, source: "system", weights: wanted.length ? wanted : [400] };
}

/** The files of every face a site serves, by face id, each as the path that proxies it (lib/ref-fonts.ts) */
export async function siteFacesOf(brand: { typography: { faces: { id: string; family: string; source: FontSource; siteWeb?: string }[] } }, path?: (src: string) => string): Promise<Record<string, { weight: string; style: string; src: string; unicodeRange?: string }[]>> {
  const out: Record<string, { weight: string; style: string; src: string; unicodeRange?: string }[]> = {};
  await Promise.all(brand.typography.faces.filter((f) => f.source === "site" && f.siteWeb).map(async (f) => {
    const faces = await pageFaces(f.siteWeb!).catch(() => []);
    out[f.id] = faces.filter((x) => familyKey(x.family) === familyKey(f.family)).slice(0, 12)
      .map((x) => ({ weight: x.weight, style: x.style, src: path ? path(x.src) : x.src, ...(x.unicodeRange ? { unicodeRange: x.unicodeRange } : {}) }));
  }));
  return out;
}
