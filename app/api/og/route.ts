import { requireCtx, isResponse } from "@/lib/workspace";
import { isPublicHttpUrl, viaProxy } from "@/lib/extract";

const TTL = 60 * 60 * 24 * 30; // 30 days
const FETCH_TIMEOUT_MS = 6000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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

function fetchWithTimeout(url: string, opts: RequestInit & { next?: { revalidate: number } }) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

// Private: the route requires a session, so no shared CDN should cache it
const NO_CACHE = `private, max-age=${60 * 60 * 24 * 7}`;
const LONG_CACHE = `private, max-age=${TTL}`;

// A site without og:image is normal, not an error: respond 204 (no body)
// so the browser does not fill the console with "Failed to load resource" and the card
// falls back to the screenshot. The reason goes in a header for debugging.
const none = (reason: string, cache = "private, max-age=900") =>
  new Response(null, { status: 204, headers: { "X-Og": reason, "Cache-Control": cache } });

export async function GET(req: Request) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !isPublicHttpUrl(url)) return new Response("bad url", { status: 400 });

  try {
    const proxyRes = await fetchWithTimeout(viaProxy(url) ?? url, { next: { revalidate: TTL } });
    if (!proxyRes.ok) return none("proxy-error");

    const html = await proxyRes.text();
    const imageUrl = extractOgImage(html, url);

    if (!imageUrl) return none("no-image", NO_CACHE);
    if (!isPublicHttpUrl(imageUrl)) return none("private-image", NO_CACHE);

    const imgRes = await fetchWithTimeout(imageUrl, { next: { revalidate: TTL } });
    if (!imgRes.ok) return none("image-fetch-failed");
    const contentType = imgRes.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return none("not-an-image", NO_CACHE);

    const blob = await imgRes.arrayBuffer();
    if (blob.byteLength > MAX_IMAGE_BYTES) return none("too-big", NO_CACHE);

    return new Response(blob, {
      headers: { "Content-Type": contentType, "Cache-Control": LONG_CACHE },
    });
  } catch (e) {
    return none((e as Error).name === "AbortError" ? "timeout" : "error");
  }
}
