import { NextRequest } from "next/server";
import { resolveShare } from "@/lib/share";
import { getBrand } from "@/lib/brand-store";
import { pageFaces, verifyFontToken } from "@/lib/ref-fonts";
import { isPublicHttpUrl, BROWSER_UA } from "@/lib/extract";
import { safeFetch } from "@/lib/safe-fetch";

const MAX_BYTES = 4 * 1024 * 1024;
const FONT_EXT = /\.(woff2|woff|otf|ttf)$/i;

// GET ?u=<font url>&t=<token> → a font file of the brand, from the site of the brand's own face. The link must be live,
// the token proves the URL came out of a site's CSS, and the URL must be one the brand's face is served in: a link
// does not proxy any other font.
export async function GET(req: NextRequest, ctx: RouteContext<"/s/[token]/font">) {
  const { token } = await ctx.params;
  const share = await resolveShare(token);
  if (!share) return new Response("not found", { status: 404 });
  const url = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!url || !t || !verifyFontToken(t, url) || !isPublicHttpUrl(url)) return new Response("forbidden", { status: 403 });
  const brand = await getBrand(share.organizationId, share.projectId);
  const webs = [...new Set(brand.typography.faces.filter((f) => f.source === "site" && f.siteWeb).map((f) => f.siteWeb!))];
  const served = (await Promise.all(webs.map((w) => pageFaces(w).catch(() => [])))).flat();
  if (!served.some((f) => f.src.includes(encodeURIComponent(url)))) return new Response("forbidden", { status: 403 });
  let upstream: Response;
  try {
    const u = new URL(url);
    upstream = await safeFetch(url, { headers: { "User-Agent": BROWSER_UA, Accept: "*/*", Referer: `${u.origin}/`, Origin: u.origin }, signal: AbortSignal.timeout(10000) });
  } catch { return new Response("unreachable", { status: 502 }); }
  if (!upstream.ok || Number(upstream.headers.get("content-length") ?? 0) > MAX_BYTES) { await upstream.body?.cancel(); return new Response("unavailable", { status: 502 }); }
  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return new Response("too large", { status: 413 });
  const ext = new URL(url).pathname.match(FONT_EXT)?.[1].toLowerCase();
  return new Response(body, { headers: { "Content-Type": ext ? `font/${ext}` : upstream.headers.get("content-type") ?? "application/octet-stream", "Cache-Control": "public, max-age=604800, immutable" } });
}
