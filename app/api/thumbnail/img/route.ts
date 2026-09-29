import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { ownsThumbnail } from "@/lib/items";
import { blobPrefix } from "@/lib/thumbnails";
import { DESIGN_MD_PREFIX, whyShotPrefix } from "@/lib/design-store";
import { commentPrefix } from "@/lib/comment-files";
import { mediaPrefix } from "@/lib/media";
import { POSTS_PREFIX } from "@/lib/posts";
import { isBlobUrl, isBlobUrlUnder } from "@/lib/blob-url";


// Private blob proxy: thumbnails, uploaded images and comment screenshots of the active workspace, and the
// DESIGN.md covers and saved posts from X (public content, shared across workspaces; the index is already filtered by items).
// Videos are asked for in ranges (seeking, and Safari always): the Range header goes through to Blob and back.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) return new Response("missing url", { status: 400 });

  // The token only travels to Vercel Blob hosts
  if (!isBlobUrl(blobUrl)) return new Response("forbidden", { status: 403 });
  const inLibrary = [blobPrefix(ctx.workspace.id), mediaPrefix(ctx.workspace.id), commentPrefix(ctx.workspace.id), DESIGN_MD_PREFIX, POSTS_PREFIX, whyShotPrefix(ctx.workspace.id)]
    .some((prefix) => isBlobUrlUnder(blobUrl, prefix));
  if (!inLibrary && !(await ownsThumbnail(ctx.workspace.id, blobUrl))) {
    return new Response("forbidden", { status: 403 });
  }

  try {
    const range = req.headers.get("range");
    const res = await fetch(blobUrl, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`, ...(range ? { Range: range } : {}) } });
    if (!res.ok || !res.body) return new Response("blob fetch failed", { status: res.status === 416 ? 416 : 502 });
    const headers = new Headers({
      "Content-Type": res.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "private, max-age=86400",
      "Accept-Ranges": "bytes",
    });
    for (const h of ["content-length", "content-range"]) { const v = res.headers.get(h); if (v) headers.set(h, v); }
    // Streamed, not buffered: an uploaded GIF can weigh up to 20 MB, a post's video 60 MB
    return new Response(res.body, { status: res.status, headers });
  } catch (e) {
    console.error("thumbnail img proxy error:", e);
    return new Response("error", { status: 500 });
  }
}
