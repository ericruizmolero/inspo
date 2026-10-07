import { NextRequest } from "next/server";
import { resolveShare } from "@/lib/share";
import { getBrand } from "@/lib/brand-store";
import { pageFaces, verifyFontToken } from "@/lib/ref-fonts";
import { isPublicHttpUrl } from "@/lib/extract";
import { proxyFont } from "@/lib/font-proxy";

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
  return proxyFont(url, "public, max-age=604800, immutable");
}
