import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { uploadThumbnail } from "@/lib/thumbnails";
import { setThumbnail, loadWorkspaceData } from "@/lib/items";
import { getErrors } from "@/lib/i18n";

export const runtime = "nodejs";

// GET → mapa web → miniatura del workspace
export async function GET() {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const { thumbnailMap } = await loadWorkspaceData(ctx.workspace.id);
  return Response.json(thumbnailMap);
}

// POST (multipart file + webUrl) → sube imagen y la asigna al item
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const webUrl = formData.get("webUrl") as string | null;
    if (!file || !webUrl) return Response.json({ error: (await getErrors()).missingFileOrWebUrl }, { status: 400 });

    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const url = await uploadThumbnail(ctx.workspace.id, safeFilename, file);
    const ok = await setThumbnail(ctx.workspace.id, webUrl, url);
    if (!ok) return Response.json({ error: (await getErrors()).urlNotInWorkspace }, { status: 404 });
    return Response.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error subiendo thumbnail:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

// DELETE ?webUrl= → quita la miniatura manual
export async function DELETE(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const webUrl = req.nextUrl.searchParams.get("webUrl");
  if (!webUrl) return Response.json({ error: (await getErrors()).missingWebUrl }, { status: 400 });
  await setThumbnail(ctx.workspace.id, webUrl, null);
  return Response.json({ ok: true });
}
