import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { fileExists, fileUrl } from "@/lib/storage";
import { ensureScreenStudio, screenStudioKey, SCREEN_STUDIO_FILES, type ScreenStudioFile } from "@/lib/screen-studio";

export const maxDuration = 60;

// GET /api/screen-studio/<id>/video.mp4 | poster.jpg → our copy of a Screen Studio share's video or frame,
// made the first time it is asked for (lib/screen-studio.ts). The bytes come from /api/files, ranges included.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/screen-studio/[id]/[file]">) {
  const session = await requireCtx();
  if (isResponse(session)) return session;
  const { id, file } = await ctx.params;
  if (!/^[\w-]{4,40}$/.test(id) || !(file in SCREEN_STUDIO_FILES)) return new Response("bad path", { status: 400 });
  const key = screenStudioKey(id, file as ScreenStudioFile);
  if (!(await fileExists(key))) {
    await ensureScreenStudio(id);
    if (!(await fileExists(key))) return new Response("not found", { status: 404 });
  }
  // The copy never changes: the redirect can be kept a day
  return new Response(null, { status: 302, headers: { Location: new URL(fileUrl(key), req.url).toString(), "Cache-Control": "private, max-age=86400" } });
}
