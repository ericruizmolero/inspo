import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { uploadCommentFile, deleteCommentFiles, ownsCommentFile, ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/comment-files";
import { getErrors } from "@/lib/i18n";


// POST multipart { file } → { url }. One screenshot per request: the browser has already shrunk it
// (lib/image-client.ts) so each upload stays under Vercel's body limit.
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return Response.json({ error: (await getErrors()).missingFile }, { status: 400 });
    if (!ATTACHMENT_TYPES.has(file.type)) return Response.json({ error: (await getErrors()).imagesOnly }, { status: 415 });
    if (file.size > MAX_ATTACHMENT_BYTES) return Response.json({ error: (await getErrors()).imageTooHeavy }, { status: 413 });
    const url = await uploadCommentFile(ctx.workspace.id, file);
    return Response.json({ url }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Error uploading comment attachment:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

// DELETE ?url=… → removes a screenshot that was uploaded and then discarded before sending
export async function DELETE(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !ownsCommentFile(ctx.workspace.id, url)) return Response.json({ error: (await getErrors()).imageNotHere }, { status: 403 });
  await deleteCommentFiles(ctx.workspace.id, [url]);
  return Response.json({ ok: true });
}
