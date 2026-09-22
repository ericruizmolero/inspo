import { requireCtx, isResponse } from "@/lib/workspace";
import { isPublicHttpUrl, viaProxy } from "@/lib/extract";

const TTL = 60 * 60 * 24 * 30; // 30 días
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

// Privada: la ruta pide sesión, así que ninguna CDN compartida debe guardarla
const NO_CACHE = `private, max-age=${60 * 60 * 24 * 7}`;
const LONG_CACHE = `private, max-age=${TTL}`;

// Que una web no tenga og:image es lo normal, no un error: se responde 204 (sin cuerpo)
// para que el navegador no llene la consola de "Failed to load resource" y la tarjeta
// pase a la captura. El motivo va en una cabecera por si hay que depurar.
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
