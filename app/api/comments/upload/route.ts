import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { uploadCommentFile, deleteCommentFiles, ownsCommentFile, ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/comment-files";

export const runtime = "nodejs";

// POST multipart { file } → { url }. Una captura por petición: el navegador ya la ha reducido
// (lib/image-client.ts) y así cada subida se queda por debajo del tope de body de Vercel.
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Falta el fichero" }, { status: 400 });
    if (!ATTACHMENT_TYPES.has(file.type)) return Response.json({ error: "Solo imágenes (PNG, JPG, WebP o GIF)" }, { status: 415 });
    if (file.size > MAX_ATTACHMENT_BYTES) return Response.json({ error: "La imagen pesa demasiado (máx. 4 MB)" }, { status: 413 });
    const url = await uploadCommentFile(ctx.workspace.id, file);
    return Response.json({ url }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Error subiendo adjunto de comentario:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

// DELETE ?url=… → quita una captura que se subió y luego se descartó antes de enviar
export async function DELETE(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !ownsCommentFile(ctx.workspace.id, url)) return Response.json({ error: "Esa imagen no es de este workspace" }, { status: 403 });
  await deleteCommentFiles(ctx.workspace.id, [url]);
  return Response.json({ ok: true });
}
