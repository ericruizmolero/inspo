import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { findByWeb } from "@/lib/items";
import { getOrCaptureShot, getStoredShot, hasStoredShot, shotKey } from "@/lib/screenshot";
import { enqueue, onVercel } from "@/lib/jobs";
import { allow } from "@/lib/rate-limit";
import { log } from "@/lib/log";

export const maxDuration = 90;

/** How long the answer waits for the capture's job (Chromium cold start + 20 s load + capture) */
const WAIT_MS = 75_000;
const POLL_MS = 2_500;
/** One capture of a site per this long, whoever asks: a site that failed is not tried on every card load */
const ONCE_PER_S = 15 * 60;

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
    // On Vercel the capture runs in its own job (lib/jobs.ts), never in this function: this one only waits for the file
    let jpeg = await getStoredShot(url);
    if (!jpeg) {
      // Captures per workspace: each one is a browser
      if (!(await allow(`shot:${ctx.workspace.id}`, 60, 10 * 60 * 1000))) throw new Error("capture limit");
      // Off Vercel there is no queue: a job would only start once this answers, so the capture runs here
      if (!onVercel()) jpeg = await getOrCaptureShot(url);
      else {
        await enqueue({ kind: "shot", url }, { idempotencyKey: `shot:${Math.floor(Date.now() / 1000 / ONCE_PER_S)}:${shotKey(url)}` });
        let stored = false;
        for (const end = Date.now() + WAIT_MS; !stored && Date.now() < end;) {
          await new Promise((r) => setTimeout(r, POLL_MS));
          stored = await hasStoredShot(url);
        }
        jpeg = stored ? await getStoredShot(url) : null;
      }
      if (!jpeg) throw new Error("no capture in time");
    }
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": `private, max-age=${TTL}, stale-while-revalidate=${TTL}`,
      },
    });
  } catch (err) {
    log.warn("shot.not_served", { ref: url, err });
    // A failure is remembered for a while so Chromium is not relaunched on every load, but not so
    // long that a server fix takes an hour to show. Respond 204 and
    // not 502 so the browser does not print it as a console error: the card already
    // shows the site name when there is no image.
    return new Response(null, { status: 204, headers: { "X-Shot": "capture-failed", "Cache-Control": "private, max-age=900" } });
  }
}
