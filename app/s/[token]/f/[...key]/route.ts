import { resolveShare } from "@/lib/share";
import { loadShareView, shareMayServe } from "@/lib/share-view";
import { getLocale } from "@/lib/i18n";
import { openFile, signedFileUrl } from "@/lib/storage";

// GET → a stored file the link's page shows: the brand's own files, its references' pictures, the public captures.
// Nothing else of the workspace: a key the view does not name is refused.
export async function GET(req: Request, ctx: RouteContext<"/s/[token]/f/[...key]">) {
  const { token, key: parts } = await ctx.params;
  if (parts.some((p) => !p || p === "." || p === "..")) return new Response("bad path", { status: 400 });
  const key = parts.join("/");
  const share = await resolveShare(token);
  if (!share) return new Response("not found", { status: 404 });
  let ok = shareMayServe(share.organizationId, share.projectId, key);
  if (!ok) {
    const view = await loadShareView(share.organizationId, share.projectId, share.mode, await getLocale(), `/s/${token}`, "");
    ok = !!view?.keys.has(key);
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
