import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { ownsAnyThumbnail } from "@/lib/items";
import { blobPrefix } from "@/lib/thumbnails";
import { commentPrefix } from "@/lib/comment-files";
import { DESIGN_MD_PREFIX, whyShotPrefix } from "@/lib/design-store";
import { mediaPrefix, videoPrefix } from "@/lib/media";
import { textPrefix } from "@/lib/text-refs";
import { POSTS_PREFIX } from "@/lib/posts";
import { PAGES_PREFIX } from "@/lib/page-shots";
import { SCREEN_STUDIO_PREFIX } from "@/lib/screen-studio";
import { openFile, fileUrl, signedFileUrl, isSafeKey } from "@/lib/storage";
import { brandPrefix } from "@/lib/brand-files";
import { log } from "@/lib/log";

// Every stored file goes through here (lib/storage.ts): the bucket is private.
// A workspace's thumbnails, uploaded images, copied videos, comment screenshots and "why" captures are read by
// its members, whichever workspace the session has active: a switch (components/LibraryHost.tsx) shows the new
// library before the server has heard of it, and its images were asked for in that gap and refused.
// DESIGN.md images, saved posts from X and Screen Studio videos are public content, shared by everyone signed in.
// With R2 the answer is a redirect to a signed R2 URL: the bytes, ranges included, come from R2,
// so a 60 MB video never runs through a function. On disk (development) the file is streamed here.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/files/[...key]">) {
  const session = await requireCtx();
  if (isResponse(session)) return session;
  const { key: parts } = await ctx.params;
  // Checked after the join: a segment can hold an encoded slash ("..%2F..")
  const key = parts.join("/");
  if (!isSafeKey(key)) return new Response("bad path", { status: 400 });

  // The active workspace first: it answers nearly every request without looking further
  const mine = [session.workspace, ...session.workspaces.filter((w) => w.id !== session.workspace.id)].map((w) => w.id);
  const ownPrefixes = (ws: string) => [blobPrefix(ws), mediaPrefix(ws), brandPrefix(ws), videoPrefix(ws), textPrefix(ws), commentPrefix(ws), whyShotPrefix(ws)];
  const allowed = [DESIGN_MD_PREFIX, POSTS_PREFIX, PAGES_PREFIX, SCREEN_STUDIO_PREFIX].some((p) => key.startsWith(p))
    || mine.some((ws) => ownPrefixes(ws).some((p) => key.startsWith(p)))
    // A thumbnail stored under another prefix but set on an item of one of their workspaces
    || (await ownsAnyThumbnail(mine, fileUrl(key)));
  if (!allowed) return new Response("forbidden", { status: 403 });

  try {
    const signed = await signedFileUrl(key);
    if (signed) {
      // The redirect is cached as long as the URL it points to stays valid (lib/storage.ts)
      return new Response(null, { status: 302, headers: { Location: signed.url, "Cache-Control": `private, max-age=${signed.maxAge}` } });
    }
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
    // An SVG opened on its own runs as a page: nothing in it may run
    if (file.contentType === "image/svg+xml") headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
    return new Response(file.stream, { status: file.range ? 206 : 200, headers });
  } catch (e) {
    log.error("files.not_served", { err: e });
    return new Response("error", { status: 500 });
  }
}
