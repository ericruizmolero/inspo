import { NextRequest } from "next/server";
import { verifyLiveToken, isPublicHttpUrl, prepareLiveHtml, rewriteCss, MEDIA_EXT, isMediaType, LIVE_MAX_BYTES, LIVE_ROOT, LIVE_DOC, LIVE_UA, showNextSeg } from "@/lib/live-html";

// /api/live/a/<token>/<host>/<path>: the site's document and assets, served to the frame with
// CORS headers. The token proves a member opened this host today (lib/live-html.ts). HTML and
// CSS are rewritten so everything of the site keeps coming through here; pictures, video and
// audio redirect to the site, which needs no CORS and costs us nothing.
const FETCH_TIMEOUT_MS = 12000;

export async function GET(req: NextRequest, { params }: { params: Promise<{ p: string[] }> }) {
  const { p } = await params;
  const [token, host, ...rest] = p;
  if (!token || !host || !verifyLiveToken(token, host)) return new Response("forbidden", { status: 403 });

  if (rest[rest.length - 1] === LIVE_DOC) rest[rest.length - 1] = "";
  const path = showNextSeg(rest.map((seg) => { try { return encodeURIComponent(decodeURIComponent(seg)); } catch { return seg; } }).join("/"));
  const target = `https://${host}/${path}${req.nextUrl.search}`;
  if (!isPublicHttpUrl(target)) return new Response("invalid url", { status: 400 });
  const root = `${LIVE_ROOT}/${token}/${host}`;
  const cors = { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600, s-maxage=86400" };

  // Media never passes through us
  if (MEDIA_EXT.test(new URL(target).pathname)) return Response.redirect(target, 302);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: {
        "User-Agent": LIVE_UA,
        Accept: req.headers.get("accept") ?? "*/*",
        "Accept-Language": "en-US,en;q=0.8",
        Referer: `https://${host}/`,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return new Response("unreachable", { status: 502, headers: cors });
  }

  const type = upstream.headers.get("content-type") ?? "application/octet-stream";
  if (isMediaType(type)) { await upstream.body?.cancel(); return Response.redirect(upstream.url || target, 302); }
  const length = Number(upstream.headers.get("content-length") ?? 0);
  if (length > LIVE_MAX_BYTES) { await upstream.body?.cancel(); return new Response("too large", { status: 413, headers: cors }); }

  const headers: Record<string, string> = { ...cors, "Content-Type": type };
  const finalUrl = upstream.url || target;

  if (/text\/html/i.test(type)) {
    const html = await upstream.text();
    // The document is fetched once per opening; never keep a version of it around
    return new Response(prepareLiveHtml(html, finalUrl, root), { status: upstream.status, headers: { ...headers, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }
  if (/text\/css/i.test(type)) {
    const css = await upstream.text();
    return new Response(rewriteCss(css, finalUrl, root), { status: upstream.status, headers });
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
