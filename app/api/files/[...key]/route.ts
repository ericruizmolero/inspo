import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { ownsThumbnail } from "@/lib/items";
import { blobPrefix } from "@/lib/thumbnails";
import { commentPrefix } from "@/lib/comment-files";
import { DESIGN_MD_PREFIX, whyShotPrefix } from "@/lib/design-store";
import { mediaPrefix } from "@/lib/media";
import { POSTS_PREFIX } from "@/lib/posts";
import { openFile, fileUrl } from "@/lib/storage";

// Every stored file goes through here (lib/storage.ts): the bucket is private.
// The active workspace reads its thumbnails, uploaded images, comment screenshots and "why" captures;
// DESIGN.md images and saved posts from X are public content, shared by everyone signed in.
// Streamed, and in ranges when asked (seeking a video, and Safari always): a post's video can be 60 MB.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/files/[...key]">) {
  const session = await requireCtx();
  if (isResponse(session)) return session;
  const { key: parts } = await ctx.params;
  if (parts.some((p) => !p || p === "." || p === "..")) return new Response("bad path", { status: 400 });
  const key = parts.join("/");

  const ws = session.workspace.id;
  const allowed = [blobPrefix(ws), mediaPrefix(ws), commentPrefix(ws), whyShotPrefix(ws), DESIGN_MD_PREFIX, POSTS_PREFIX].some((p) => key.startsWith(p))
    // A thumbnail stored under another prefix but set on one of this workspace's items
    || (await ownsThumbnail(ws, fileUrl(key)));
  if (!allowed) return new Response("forbidden", { status: 403 });

  try {
    const range = req.headers.get("range") ?? undefined;
    const file = await openFile(key, range);
    if (!file) return new Response("not found", { status: 404 });
    const headers: Record<string, string> = {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Accept-Ranges": "bytes",
      // Keys carry a timestamp: a changed file gets a new path, so a day of caching is safe
      "Cache-Control": "private, max-age=86400",
    };
    if (file.range) headers["Content-Range"] = file.range;
    return new Response(file.stream, { status: file.range ? 206 : 200, headers });
  } catch (e) {
    console.error("files route:", e);
    return new Response("error", { status: 500 });
  }
}
