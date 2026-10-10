import { NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { sendDigests } from "@/lib/notify";
import { log, pruneFailures, recordFailure } from "@/lib/log";
import { sweep } from "@/lib/job-run";

export const maxDuration = 300;

// The morning run, 04:00 UTC by Vercel Cron (vercel.json). The team digests (lib/notify.ts), which should land
// before people start; and the jobs' sweep (lib/job-run.ts), which starts its own five-minute chain again if it
// ever stopped. The sweep only sends jobs: each runs in its own function, not in these five minutes.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const digests = await sendDigests().catch((err) => { void recordFailure("job", "digest", err); return null; });
  const jobs = await sweep().catch((err) => { log.error("cron.sweep_failed", { err }); return { error: err instanceof Error ? err.message : String(err) }; });
  const pruned = await pruneFailures().catch((err) => { log.error("cron.prune_failures", { err }); return null; });
  // BetterStack's heartbeat: a morning with no ping, or a failed one, alerts. That is how a dead cron shows
  const beat = process.env.BETTERSTACK_HEARTBEAT_URL;
  if (beat) await fetch(digests && !("error" in jobs) ? beat : `${beat}/fail`, { method: "POST" }).catch(() => {});
  return Response.json({ pruned, digests: digests && { teams: digests.teams, sent: digests.sent, paused: digests.paused, skipped: digests.skipped, spaced: digests.spaced }, jobs });
}
