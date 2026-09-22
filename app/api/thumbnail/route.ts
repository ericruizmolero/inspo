import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { uploadThumbnail } from "@/lib/thumbnails";
import { setThumbnail, hasItem } from "@/lib/items";
import { ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/comment-files";
import { getErrors } from "@/lib/i18n";

export const runtime = "nodejs";

// POST (multipart file + webUrl) → sube imagen y la asigna al item
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const webUrl = formData.get("webUrl") as string | null;
    if (!file || !webUrl) return Response.json({ error: (await getErrors()).missingFileOrWebUrl }, { status: 400 });
    if (!ATTACHMENT_TYPES.has(file.type)) return Response.json({ error: (await getErrors()).imagesOnly }, { status: 415 });
    if (file.size > MAX_ATTACHMENT_BYTES) return Response.json({ error: (await getErrors()).imageTooHeavy }, { status: 413 });
    // Antes de subir: si la web no es del workspace no queda un blob huérfano
    if (!(await hasItem(ctx.workspace.id, webUrl))) return Response.json({ error: (await getErrors()).urlNotInWorkspace }, { status: 404 });

    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const url = await uploadThumbnail(ctx.workspace.id, safeFilename, file);
    await setThumbnail(ctx.workspace.id, webUrl, url);
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
