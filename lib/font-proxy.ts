import "server-only";
import { BROWSER_UA } from "@/lib/extract";
import { safeFetch } from "@/lib/safe-fetch";

const MAX_BYTES = 4 * 1024 * 1024;
const FONT_TYPE = /^(font\/|application\/(x-)?font|application\/vnd\.ms-fontobject|application\/octet-stream|binary\/octet-stream)/i;
const FONT_EXT = /\.(woff2|woff|otf|ttf)$/i;

/**
 * Fetches a font from a third-party site and answers it from our origin. Whatever the site says, the answer is
 * a font or plain bytes, never something a browser would render: an HTML or SVG page served here would run as
 * criterio.design. The caller has already checked the URL (token, public host).
 */
export async function proxyFont(url: string, cacheControl: string): Promise<Response> {
  let upstream: Response;
  try {
    const u = new URL(url);
    upstream = await safeFetch(url, { headers: { "User-Agent": BROWSER_UA, Accept: "*/*", Referer: `${u.origin}/`, Origin: u.origin }, signal: AbortSignal.timeout(10000) });
  } catch {
    return new Response("unreachable", { status: 502 });
  }
  const type = upstream.headers.get("content-type") ?? "application/octet-stream";
  const ext = new URL(url).pathname.match(FONT_EXT)?.[1].toLowerCase();
  if (!upstream.ok || (!FONT_TYPE.test(type) && !ext) || Number(upstream.headers.get("content-length") ?? 0) > MAX_BYTES) {
    await upstream.body?.cancel();
    return new Response("not a font", { status: upstream.ok ? 415 : 502 });
  }
  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return new Response("too large", { status: 413 });
  const served = /^font\/[\w.+-]+$/i.test(type.split(";")[0].trim()) ? type.split(";")[0].trim() : ext ? `font/${ext}` : "application/octet-stream";
  return new Response(body, {
    headers: {
      "Content-Type": served,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
