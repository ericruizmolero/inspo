import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { uploadMediaFile, MEDIA_TYPES, MAX_MEDIA_BYTES } from "@/lib/media";
import { getErrors } from "@/lib/i18n";

// Uploads an image that will be an inspo of its own: multipart { file } → { url }.
// The item is created afterwards with the addImage action, which checks the path is ours.
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const errors = await getErrors();
  try {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) return Response.json({ error: errors.missingFile }, { status: 400 });
    if (!MEDIA_TYPES.has(file.type)) return Response.json({ error: errors.imagesOnly }, { status: 415 });
    if (file.size > MAX_MEDIA_BYTES) return Response.json({ error: errors.mediaTooHeavy }, { status: 413 });
    return Response.json({ url: await uploadMediaFile(ctx.workspace.id, file) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Error uploading an image inspo:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
