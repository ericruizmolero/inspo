import { requireCtx, isResponse } from "@/lib/workspace";
import { isPublicHttpUrl } from "@/lib/extract";
import { ogImage } from "@/lib/og-image";

export async function GET(req: Request) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !isPublicHttpUrl(url)) return new Response("bad url", { status: 400 });
  return ogImage(url);
}
