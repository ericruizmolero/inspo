import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { setThumbnail } from "@/lib/items";
import { listThumbnailLibrary } from "@/lib/thumbnails";
import { getErrors } from "@/lib/i18n";


// POST { webUrl, blobUrl } → asigna una imagen ya subida (de la biblioteca del workspace)
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    const { webUrl, blobUrl } = (await req.json()) as { webUrl?: string; blobUrl?: string };
    if (!webUrl || !blobUrl) return Response.json({ error: (await getErrors()).missingWebUrlOrBlobUrl }, { status: 400 });

    const library = await listThumbnailLibrary(ctx.workspace.id);
    if (!library.includes(blobUrl)) return Response.json({ error: (await getErrors()).imageNotHere }, { status: 403 });

    const ok = await setThumbnail(ctx.workspace.id, webUrl, blobUrl);
    if (!ok) return Response.json({ error: (await getErrors()).urlNotInWorkspace }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
