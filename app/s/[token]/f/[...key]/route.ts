import { resolveShare } from "@/lib/share";
import { shareMayServe } from "@/lib/share-view";
import { loadShareBoard } from "@/lib/share-board";
import { openFile, signedFileUrl, isSafeKey } from "@/lib/storage";

// GET → a stored file the link's board shows: its references' pictures and the public captures. The link shares the
// board only (Eric, 06-11), so the brand's files are not served.
// Nothing else of the workspace: a key the view does not name is refused.
export async function GET(req: Request, ctx: RouteContext<"/s/[token]/f/[...key]">) {
  const { token, key: parts } = await ctx.params;
  // Checked after the join: a segment can hold an encoded slash ("..%2F..")
  const key = parts.join("/");
  if (!isSafeKey(key)) return new Response("bad path", { status: 400 });
  const share = await resolveShare(token);
  if (!share) return new Response("not found", { status: 404 });
  let ok = shareMayServe(share.organizationId, share.projectId, key);
  if (!ok) {
    const board = await loadShareBoard(share, `/s/${token}`);
    ok = !!board?.keys.has(key);
  }
  if (!ok) return new Response("forbidden", { status: 403 });
  const signed = await signedFileUrl(key);
  if (signed) return new Response(null, { status: 302, headers: { Location: signed.url, "Cache-Control": `private, max-age=${signed.maxAge}`, "Referrer-Policy": "no-referrer" } });
  const file = await openFile(key, req.headers.get("range") ?? undefined);
  if (!file) return new Response("not found", { status: 404 });
  const headers: Record<string, string> = { "Content-Type": file.contentType, "Content-Length": String(file.size), "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600", "X-Robots-Tag": "noindex" };
  if (file.range) headers["Content-Range"] = file.range;
  if (file.contentType === "image/svg+xml") headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  return new Response(file.stream, { status: file.range ? 206 : 200, headers });
}
