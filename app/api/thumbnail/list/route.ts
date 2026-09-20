import { requireCtx, isResponse } from "@/lib/workspace";
import { listThumbnailLibrary } from "@/lib/thumbnails";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    return Response.json({ urls: await listThumbnailLibrary(ctx.workspace.id) });
  } catch (e) {
    return Response.json({ urls: [], error: String(e) }, { status: 500 });
  }
}
