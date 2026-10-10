import { NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { sendDigests } from "@/lib/notify";
import { GET as tagPending } from "../tag-pending/route";

export const maxDuration = 300;

// The morning run, 04:00 UTC by Vercel Cron (vercel.json): Hobby allows two crons a day, so the two morning jobs
// share one. First the team digests (lib/notify.ts), which are quick and should land before people start; then
// the tagging worker (tag-pending/route.ts), which takes what is left of the five minutes.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const digests = await sendDigests().catch((e) => { console.error("digest:", e instanceof Error ? e.message : e); return null; });
  const tagging = await tagPending(req).then((r) => r.json()).catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
  // BetterStack's heartbeat: a morning with no ping, or a failed one, alerts. That is how a dead cron shows
  const beat = process.env.BETTERSTACK_HEARTBEAT_URL;
  if (beat) await fetch(digests && !("error" in tagging) ? beat : `${beat}/fail`, { method: "POST" }).catch(() => {});
  return Response.json({ digests: digests && { teams: digests.teams, sent: digests.sent, paused: digests.paused, skipped: digests.skipped, spaced: digests.spaced }, tagging });
}
