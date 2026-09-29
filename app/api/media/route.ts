import { NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireCtx, isResponse } from "@/lib/workspace";
import { uploadMediaFile, mediaPrefix, MEDIA_TYPES, MAX_MEDIA_BYTES, MAX_SERVER_UPLOAD_BYTES } from "@/lib/media";
import { getErrors } from "@/lib/i18n";

// Uploads an image that will be an inspo of its own. Two ways in, same result (a URL):
// - multipart { file } → { url }: files up to 4 MB come through here (Vercel cuts bodies at 4.5 MB).
// - JSON from @vercel/blob/client: heavier files (long GIFs) go straight from the browser to Blob;
//   here we only sign the token, and only for this workspace's media folder.
// The item is created afterwards with the addImage action, which checks the URL is ours.
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const errors = await getErrors();

  if (req.headers.get("content-type")?.includes("application/json")) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: errors.mediaTooHeavy }, { status: 413 });
    try {
      const body = (await req.json()) as HandleUploadBody;
      const res = await handleUpload({
        body, request: req,
        onBeforeGenerateToken: async (pathname) => {
          if (!pathname.startsWith(mediaPrefix(ctx.workspace.id)) || pathname.includes("..")) throw new Error(errors.imageNotHere);
          return { allowedContentTypes: [...MEDIA_TYPES], maximumSizeInBytes: MAX_MEDIA_BYTES, addRandomSuffix: true };
        },
      });
      return Response.json(res);
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
    }
  }

  try {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) return Response.json({ error: errors.missingFile }, { status: 400 });
    if (!MEDIA_TYPES.has(file.type)) return Response.json({ error: errors.imagesOnly }, { status: 415 });
    if (file.size > MAX_SERVER_UPLOAD_BYTES) return Response.json({ error: errors.mediaTooHeavy }, { status: 413 });
    return Response.json({ url: await uploadMediaFile(ctx.workspace.id, file) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Error uploading an image inspo:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
