import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { verifyFontToken } from "@/lib/ref-fonts";
import { isPublicHttpUrl, BROWSER_UA } from "@/lib/extract";
import { safeFetch } from "@/lib/safe-fetch";

const MAX_BYTES = 4 * 1024 * 1024;
const FONT_TYPE = /^(font\/|application\/(x-)?font|application\/vnd\.ms-fontobject|application\/octet-stream|binary\/octet-stream)/i;
const FONT_EXT = /\.(woff2|woff|otf|ttf)$/i;

// GET ?u=<font url>&t=<token> → the font file of a reference, from our origin. Sites serve their fonts
// without CORS headers, so the tester cannot load them from where they live. The token proves the URL
// came out of a reference's CSS (lib/ref-fonts.ts); the session, that a member is asking.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const url = req.nextUrl.searchParams.get("u") ?? "";
  const token = req.nextUrl.searchParams.get("t") ?? "";
  if (!url || !token || !verifyFontToken(token, url) || !isPublicHttpUrl(url)) return new Response("forbidden", { status: 403 });
  let upstream: Response;
  try {
    const u = new URL(url);
    upstream = await safeFetch(url, { headers: { "User-Agent": BROWSER_UA, Accept: "*/*", Referer: `${u.origin}/`, Origin: u.origin }, signal: AbortSignal.timeout(10000) });
  } catch {
    return new Response("unreachable", { status: 502 });
  }
  const type = upstream.headers.get("content-type") ?? "application/octet-stream";
  const isFont = FONT_TYPE.test(type) || FONT_EXT.test(new URL(url).pathname);
  if (!upstream.ok || !isFont || Number(upstream.headers.get("content-length") ?? 0) > MAX_BYTES) {
    await upstream.body?.cancel();
    return new Response("not a font", { status: upstream.ok ? 415 : 502 });
  }
  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return new Response("too large", { status: 413 });
  const ext = new URL(url).pathname.match(FONT_EXT)?.[1].toLowerCase();
  return new Response(body, { headers: { "Content-Type": /^font\//i.test(type) ? type : ext ? `font/${ext}` : type, "Cache-Control": "private, max-age=604800, immutable" } });
}
