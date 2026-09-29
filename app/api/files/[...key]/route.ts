import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { ownsThumbnail } from "@/lib/items";
import { blobPrefix } from "@/lib/thumbnails";
import { commentPrefix } from "@/lib/comment-files";
import { DESIGN_MD_PREFIX, whyShotPrefix } from "@/lib/design-store";
import { getFile, fileUrl } from "@/lib/storage";

// Every stored file goes through here (lib/storage.ts): the bucket is private.
// The active workspace reads its thumbnails, comment screenshots and "why" captures;
// DESIGN.md images are screenshots of public sites, shared by everyone signed in.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/files/[...key]">) {
  const session = await requireCtx();
  if (isResponse(session)) return session;
  const { key: parts } = await ctx.params;
  if (parts.some((p) => !p || p === "." || p === "..")) return new Response("bad path", { status: 400 });
  const key = parts.join("/");

  const ws = session.workspace.id;
  const allowed = [blobPrefix(ws), commentPrefix(ws), whyShotPrefix(ws), DESIGN_MD_PREFIX].some((p) => key.startsWith(p))
    // A thumbnail stored under another prefix but set on one of this workspace's items
    || (await ownsThumbnail(ws, fileUrl(key)));
  if (!allowed) return new Response("forbidden", { status: 403 });

  try {
    const range = req.headers.get("range") ?? undefined;
    const file = await getFile(key, range);
    if (!file) return new Response("not found", { status: 404 });
    const headers: Record<string, string> = {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Accept-Ranges": "bytes",
      // Keys carry a timestamp: a changed file gets a new path, so a day of caching is safe
      "Cache-Control": "private, max-age=86400",
    };
    if (file.range) headers["Content-Range"] = file.range;
    return new Response(new Uint8Array(file.body), { status: file.range ? 206 : 200, headers });
  } catch (e) {
    console.error("files route:", e);
    return new Response("error", { status: 500 });
  }
}
