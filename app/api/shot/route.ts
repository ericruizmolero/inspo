import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { findByWeb } from "@/lib/items";
import { getOrCaptureShot } from "@/lib/screenshot";

export const maxDuration = 90; // Chromium cold start + 20 s load + capture

const TTL = 60 * 60 * 24 * 30; // 30 days

// We only capture URLs in the user's workspace, so the
// endpoint cannot be used as a free screenshot service.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new Response("missing url", { status: 400 });
  try { new URL(url); } catch { return new Response("bad url", { status: 400 }); }

  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  if (!(await findByWeb(ctx.workspace.id, url))) return new Response("url not in workspace", { status: 403 });

  try {
    const jpeg = await getOrCaptureShot(url);
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": `private, max-age=${TTL}, stale-while-revalidate=${TTL}`,
      },
    });
  } catch (err) {
    console.error("shot error:", url, err instanceof Error ? err.message : err);
    // A failure is remembered for a while so Chromium is not relaunched on every load, but not so
    // long that a server fix takes an hour to show. Respond 204 and
    // not 502 so the browser does not print it as a console error: the card already
    // shows the site name when there is no image.
    return new Response(null, { status: 204, headers: { "X-Shot": "capture-failed", "Cache-Control": "private, max-age=900" } });
  }
}
