import "server-only";
import { isPublicHttpUrl, viaProxy } from "./extract";
import { safeFetch } from "./safe-fetch";

// A site's og:image as an image response: what the board shows for a site with no stored picture. Shared by the
// app's route (app/api/og, with a session) and a share link's (app/s/[token]/og, for the board it shows).
const TTL = 60 * 60 * 24 * 30; // 30 days
const FETCH_TIMEOUT_MS = 6000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const RASTER = /^image\/(png|jpeg|jpg|webp|gif|avif)\s*(;|$)/i;

function extractOgImage(html: string, baseUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) {
      try { return new URL(m[1], baseUrl).href; } catch { continue; }
    }
  }
  return null;
}

// No Next data cache here (safeFetch is undici's fetch): the browser keeps the answer for TTL (LONG_CACHE)
function fetchWithTimeout(url: string) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  return safeFetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(id));
}

// Private: no shared CDN should cache it
const NO_CACHE = `private, max-age=${60 * 60 * 24 * 7}`;
const LONG_CACHE = `private, max-age=${TTL}`;

// A site without og:image is normal, not an error: respond 204 (no body)
// so the browser does not fill the console with "Failed to load resource" and the card
// falls back to the screenshot. The reason goes in a header for debugging.
const none = (reason: string, cache = "private, max-age=900") =>
  new Response(null, { status: 204, headers: { "X-Og": reason, "Cache-Control": cache } });

/** The og:image of `url` (already checked public), or 204 with the reason in X-Og */
export async function ogImage(url: string): Promise<Response> {
  try {
    const proxyRes = await fetchWithTimeout(viaProxy(url) ?? url);
    if (!proxyRes.ok) return none("proxy-error");

    const html = await proxyRes.text();
    const imageUrl = extractOgImage(html, url);

    if (!imageUrl) return none("no-image", NO_CACHE);
    if (!isPublicHttpUrl(imageUrl)) return none("private-image", NO_CACHE);

    const imgRes = await fetchWithTimeout(imageUrl);
    if (!imgRes.ok) return none("image-fetch-failed");
    const contentType = imgRes.headers.get("content-type") ?? "";
    // Raster only: an SVG served from our origin is a page, and its scripts would run as criterio.design
    if (!RASTER.test(contentType)) return none("not-an-image", NO_CACHE);

    const blob = await imgRes.arrayBuffer();
    if (blob.byteLength > MAX_IMAGE_BYTES) return none("too-big", NO_CACHE);

    return new Response(blob, {
      headers: { "Content-Type": contentType, "Cache-Control": LONG_CACHE, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" },
    });
  } catch (e) {
    return none((e as Error).name === "AbortError" ? "timeout" : "error");
  }
}
