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
import { openFile, getFile, fileUrl, signedFileUrl, isSafeKey, ensureCardCopy } from "@/lib/storage";
import { originalOfCard } from "@/lib/board";
import { fileTokenValid } from "@/lib/file-links";
import { imagePdf, wantsPdf } from "@/lib/image-pdf";
import { brandPrefix } from "@/lib/brand-files";
import { log } from "@/lib/log";

// Every stored file goes through here (lib/storage.ts): the bucket is private.
// A workspace's thumbnails, uploaded images, copied videos, comment screenshots and "why" captures are read by
// its members, whichever workspace the session has active: a switch (components/LibraryHost.tsx) shows the new
// library before the server has heard of it, and its images were asked for in that gap and refused.
// DESIGN.md images, saved posts from X and Screen Studio videos are public content, shared by everyone signed in.
// A link signed for one key (lib/file-links.ts) reads that key with no session: criterio.md read from outside the app.
// With R2 the answer is a redirect to a signed R2 URL: the bytes, ranges included, come from R2,
// so a 60 MB video never runs through a function. On disk (development) the file is streamed here.
// A link out of the app may be fetched by anyone (robots.txt lets fetchers in), but is never listed by a search engine
const OUTSIDE_HEADERS = { "Cache-Control": "public, max-age=86400", Vary: "User-Agent", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(req: NextRequest, ctx: RouteContext<"/api/files/[...key]">) {
  const { key: parts } = await ctx.params;
  // Checked after the join: a segment can hold an encoded slash ("..%2F..")
  let key = parts.join("/");
  if (!isSafeKey(key)) return new Response("bad path", { status: 400 });
  // A card copy (lib/board.ts) is seen by whoever may see its original
  const original = originalOfCard(key);

  // A link signed for this key (lib/file-links.ts) was handed to someone outside the app: it needs no session
  const outside = fileTokenValid(key, req.nextUrl.searchParams.get("t"));
  if (!outside) {
    const session = await requireCtx();
    if (isResponse(session)) return session;
    // The active workspace first: it answers nearly every request without looking further
    const mine = [session.workspace, ...session.workspaces.filter((w) => w.id !== session.workspace.id)].map((w) => w.id);
    const ownPrefixes = (ws: string) => [blobPrefix(ws), mediaPrefix(ws), brandPrefix(ws), videoPrefix(ws), textPrefix(ws), commentPrefix(ws), whyShotPrefix(ws)];
    const allowed = [DESIGN_MD_PREFIX, POSTS_PREFIX, PAGES_PREFIX, SCREEN_STUDIO_PREFIX].some((p) => key.startsWith(p))
      || mine.some((ws) => ownPrefixes(ws).some((p) => (original ?? key).startsWith(p)))
      // A thumbnail stored under another prefix but set on an item of one of their workspaces
      || (await ownsAnyThumbnail(mine, fileUrl(original ?? key)));
    if (!allowed) return new Response("forbidden", { status: 403 });
  }

  // Made the first time it is asked for. A picture that can't be resized is served as it is
  if (original && !(await ensureCardCopy(key).catch((err) => { log.warn("files.card_copy_failed", { ref: key, err }); return false; }))) key = original;

  try {
    // Outside the app the bytes come from here: a fetcher does not follow a redirect to another host, and an
    // allowlist then needs only this one. Anthropic's fetcher reads no image, so it gets the picture as a PDF
    // (lib/image-pdf.ts). Neither is cached by Vercel: the same address answers two ways, by who asks.
    if (outside && wantsPdf(req.headers.get("user-agent"))) {
      const f = await getFile(key);
      if (!f) return new Response("not found", { status: 404 });
      if (f.contentType.startsWith("image/")) {
        const pdf = await imagePdf(f.body);
        return new Response(new Uint8Array(pdf), { headers: { ...OUTSIDE_HEADERS, "Content-Type": "application/pdf", "Content-Length": String(pdf.length) } });
      }
    }
    const signed = outside ? null : await signedFileUrl(key);
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
      ...(outside ? OUTSIDE_HEADERS : { "Cache-Control": "private, max-age=86400" }),
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
