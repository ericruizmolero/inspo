import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { findByWeb } from "@/lib/items";
import { normalizeWebUrl } from "@/lib/url";
import { isPublicHttpUrl, liveToken, livePath, LIVE_UA } from "@/lib/live-html";

// Opens the live view of a saved site: checks the site answers with a page, and hands the
// frame the path to load it from (see lib/live-html.ts). Only sites in the workspace's
// library: this is a window onto what was saved, not an open proxy.
const FETCH_TIMEOUT_MS = 8000;

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
      headers: { "User-Agent": LIVE_UA, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 3600 },
    });
  } catch {
    return new Response("site unreachable", { status: 502 });
  }
  if (!upstream.ok) return new Response("site answered " + upstream.status, { status: 502 });
  if (!(upstream.headers.get("content-type") ?? "").includes("text/html")) return new Response("not a page", { status: 415 });
  await upstream.body?.cancel();

  // Where the site landed after redirects is what the frame loads (www, trailing slash, locale)
  const final = new URL(upstream.url || url);
  return Response.json({ src: livePath(liveToken(final.host), final) }, { headers: { "Cache-Control": "no-store" } });
}
