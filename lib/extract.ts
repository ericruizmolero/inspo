// Extracts text and structural signals from a URL to hand to Jev
// (which only understands text). Uses the same proxy as /api/og.

import "server-only";

// External proxy to read sites that block data center IPs. WEB_PROXY_URL="" turns it off.
const DEFAULT_PROXY = "https://web-proxy-git-main-ericruizmoleros-projects.vercel.app/api/proxy";
export const PROXY = process.env.WEB_PROXY_URL ?? DEFAULT_PROXY;
export const viaProxy = (url: string) => (PROXY ? `${PROXY}?url=${encodeURIComponent(url)}` : null);

// ponytail: only checks the hostname (localhost, private IPs, .local/.internal). It doesn't resolve DNS,
// so a domain pointing to 10.x or a redirect to an internal IP gets through. If needed,
// resolve with dns.lookup and check the IP before fetching.
const PRIVATE_HOST = /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd][0-9a-f]{2}:|\[?fe80:)|\.(local|internal|localhost)$/i;

/** Is it an http(s) URL pointing to the internet and not the internal network? */
export function isPublicHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return /^https?:$/.test(u.protocol) && !PRIVATE_HOST.test(u.hostname) && !/^\d+$/.test(u.hostname);
  } catch {
    return false;
  }
}
const TIMEOUT_MS = 8000;

export interface SiteText {
  title: string;
  description: string;
  siteName: string;
  lang: string;
  headings: string[];
  textSample: string;
  signals: {
    themeColor: string | null;
    fonts: string[];
    colors: string[];
    hasCanvas: boolean;
    hasVideo: boolean;
    imageCount: number;
    platform: string | null;
  };
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
const clean = (s: string) => decode(s).replace(/\s+/g, " ").trim();

function meta(html: string, attr: "property" | "name", key: string): string {
  const a = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, "i");
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`, "i");
  return clean(html.match(a)?.[1] ?? html.match(b)?.[1] ?? "");
}

function uniq(arr: string[], max: number) {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))].slice(0, max);
}

export function parseSiteText(html: string): SiteText {
  const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || meta(html, "property", "og:title");
  const description = meta(html, "name", "description") || meta(html, "property", "og:description") || meta(html, "name", "twitter:description");
  const siteName = meta(html, "property", "og:site_name");
  const lang = html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1] ?? "";

  const headings = uniq(
    [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => clean(m[1].replace(/<[^>]+>/g, " "))),
    12
  ).filter((h) => h.length > 1 && h.length < 160);

  const body = html.match(/<body[\s\S]*$/i)?.[0] ?? html;
  const textSample = clean(
    body
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).slice(0, 1500);

  const fonts = uniq(
    [...html.matchAll(/font-family\s*:\s*([^;}"']+)/gi)]
      .map((m) => m[1].split(",")[0].replace(/["']/g, "").trim())
      .filter((f) => !/^(inherit|initial|var\(|sans-serif|serif|monospace|system-ui)/i.test(f)),
    8
  );
  const googleFonts = [...html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/gi)]
    .flatMap((m) => decodeURIComponent(m[1]).split("|").map((f) => f.split(":")[0].replace(/\+/g, " ")));

  const colors = uniq([...html.matchAll(/(?:background(?:-color)?|color)\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]+\))/gi)].map((m) => m[1].toLowerCase()), 10);

  const platform =
    /webflow/i.test(html) ? "webflow" :
    /framer\.com|framerusercontent/i.test(html) ? "framer" :
    /__next|_next\//i.test(html) ? "next.js" :
    /__nuxt/i.test(html) ? "nuxt" :
    /wp-content/i.test(html) ? "wordpress" :
    /cdn\.shopify/i.test(html) ? "shopify" :
    /squarespace/i.test(html) ? "squarespace" :
    /cargo\.site|cargocollective/i.test(html) ? "cargo" :
    /youtube\.com|ytimg/i.test(html) ? "youtube" :
    /vimeo/i.test(html) ? "vimeo" : null;

  return {
    title, description, siteName, lang, headings, textSample,
    signals: {
      themeColor: meta(html, "name", "theme-color") || null,
      fonts: uniq([...fonts, ...googleFonts], 8),
      colors,
      hasCanvas: /<canvas|three\.js|three\.module|webgl/i.test(html),
      hasVideo: /<video|player\.vimeo|youtube\.com\/embed/i.test(html),
      imageCount: (html.match(/<img\b/gi) ?? []).length,
      platform,
    },
  };
}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

async function fetchHtml(url: string, headers?: Record<string, string>): Promise<string | null> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store", headers, redirect: "follow" });
    if (!res.ok) return null;
    const html = await res.text();
    return html && html.length >= 200 ? html : null;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

/** fetchSiteText with a time cap: getting the site name must not hold up adding an item. */
export function siteTextWithin(url: string, ms = 5000): Promise<SiteText | null> {
  return Promise.race([
    fetchSiteText(url).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), ms)),
  ]);
}

/** Proxy first (avoids blocks on Vercel IPs); if it fails, direct fetch with a browser UA. */
export async function fetchSiteText(url: string): Promise<SiteText | null> {
  if (!isPublicHttpUrl(url)) return null;
  const proxied = viaProxy(url);
  const html =
    (proxied ? await fetchHtml(proxied) : null) ??
    (await fetchHtml(url, { "User-Agent": UA, Accept: "text/html,*/*" }));
  return html ? parseSiteText(html) : null;
}
