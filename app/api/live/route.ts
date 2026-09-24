import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { findByWeb } from "@/lib/items";
import { normalizeWebUrl } from "@/lib/url";
import { isPublicHttpUrl, prepareLiveHtml, LIVE_MAX_BYTES } from "@/lib/live-html";

// The live view of a saved site: its HTML, fetched here (the site's own headers would forbid a
// frame; we never send them on) and returned ready for a sandboxed srcdoc iframe. Only for
// sites in the workspace's library, so this is a window onto what was saved and not an open proxy.
const FETCH_TIMEOUT_MS = 8000;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;

  const raw = req.nextUrl.searchParams.get("url");
  const url = raw ? normalizeWebUrl(raw) : null;
  if (!url || !isPublicHttpUrl(url)) return new Response("invalid url", { status: 400 });
  if (!(await findByWeb(ctx.workspace.id, url))) return new Response("not in library", { status: 403 });

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      // One fetch an hour per site is plenty: the frame is a view, not a monitor
      next: { revalidate: 3600 },
    });
  } catch {
    return new Response("site unreachable", { status: 502 });
  }
  if (!upstream.ok) return new Response("site answered " + upstream.status, { status: 502 });
  const type = upstream.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return new Response("not a page", { status: 415 });
  const length = Number(upstream.headers.get("content-length") ?? 0);
  if (length > LIVE_MAX_BYTES) return new Response("page too large", { status: 413 });

  const html = await upstream.text();
  if (html.length > LIVE_MAX_BYTES) return new Response("page too large", { status: 413 });

  return new Response(prepareLiveHtml(html, upstream.url || url), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Read by fetch() and put in a srcdoc, never navigated to: no need to be framable itself
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
