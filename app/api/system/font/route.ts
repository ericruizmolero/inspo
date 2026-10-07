import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { verifyFontToken } from "@/lib/ref-fonts";
import { isPublicHttpUrl } from "@/lib/extract";
import { proxyFont } from "@/lib/font-proxy";

// GET ?u=<font url>&t=<token> → the font file of a reference, from our origin. Sites serve their fonts
// without CORS headers, so the tester cannot load them from where they live. The token proves the URL
// came out of a reference's CSS (lib/ref-fonts.ts); the session, that a member is asking.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const url = req.nextUrl.searchParams.get("u") ?? "";
  const token = req.nextUrl.searchParams.get("t") ?? "";
  if (!url || !token || !verifyFontToken(token, url) || !isPublicHttpUrl(url)) return new Response("forbidden", { status: 403 });
  return proxyFont(url, "private, max-age=604800, immutable");
}
