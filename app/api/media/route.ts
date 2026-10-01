import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { uploadMediaFile, newMediaKey, MEDIA_TYPES, MAX_MEDIA_BYTES } from "@/lib/media";
import { uploadUrl, fileUrl } from "@/lib/storage";
import { getErrors } from "@/lib/i18n";

// Uploads an image that will be an inspo of its own. Two ways in (lib/media-client.ts):
// - JSON { type, size } → { url, put }: the browser PUTs the file to `put`, straight to R2.
//   A function takes at most 4.5 MB on Vercel, and these images go up to 20 MB.
//   `put` is null when files are on disk (development): then it posts the file here instead.
// - multipart { file } → { url }: the file comes through the app.
// The item is created afterwards with the addImage action, which checks the path is ours and the file is there.
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const errors = await getErrors();
  try {
    if (req.headers.get("content-type")?.startsWith("application/json")) {
      const { type, size } = (await req.json().catch(() => ({}))) as { type?: string; size?: number };
      if (!type || !MEDIA_TYPES.has(type)) return Response.json({ error: errors.imagesOnly }, { status: 415 });
      if (!Number.isInteger(size) || size! <= 0) return Response.json({ error: errors.missingFile }, { status: 400 });
      if (size! > MAX_MEDIA_BYTES) return Response.json({ error: errors.mediaTooHeavy }, { status: 413 });
      const key = newMediaKey(ctx.workspace.id, type);
      const put = await uploadUrl(key, type, size!);
      return Response.json({ url: fileUrl(key), put }, { status: 201 });
    }

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
