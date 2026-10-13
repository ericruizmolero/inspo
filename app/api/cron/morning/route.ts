import { NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { digestTime } from "@/lib/notify";
import { log, pruneFailures } from "@/lib/log";
import { sweep } from "@/lib/job-run";
import { enqueue } from "@/lib/jobs";
import { pruneRateLimits } from "@/lib/rate-limit";
import { pruneTombstones } from "@/lib/pulse";

export const maxDuration = 300;

// The morning run, 04:00 UTC by Vercel Cron (vercel.json; Hobby fires it somewhere in that hour). It puts the
// morning's emails on the queue until 08:30 in Spain (digestTime in lib/notify.ts): the team digests and the day-3
// nudge to new accounts whose projects are still empty (lib/first-use-mail.ts), run by the "mail" job
// (lib/job-run.ts). Then the jobs' sweep, which starts its own five-minute chain again if it ever stopped. The
// sweep only sends jobs: each runs in its own function, not in these five minutes.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const at = digestTime();
  // One message a day, however many times the cron is called
  await enqueue({ kind: "mail" }, { delaySeconds: Math.max(0, Math.ceil((at.getTime() - Date.now()) / 1000)), idempotencyKey: `mail:${at.toISOString()}` });
  const jobs = await sweep().catch((err) => { log.error("cron.sweep_failed", { err }); return { error: err instanceof Error ? err.message : String(err) }; });
  const pruned = await pruneFailures().catch((err) => { log.error("cron.prune_failures", { err }); return null; });
  const limits = await pruneRateLimits().catch((err) => { log.error("cron.prune_rate_limits", { err }); return null; });
  const tombstones = await pruneTombstones().catch((err) => { log.error("cron.prune_tombstones", { err }); return null; });
  // BetterStack's heartbeat: a morning with no ping, or a failed one, alerts. That is how a dead cron shows
  const beat = process.env.BETTERSTACK_HEARTBEAT_URL;
  if (beat) await fetch(!("error" in jobs) ? beat : `${beat}/fail`, { method: "POST" }).catch(() => {});
  return Response.json({ pruned, limits, tombstones, mail: at.toISOString(), jobs });
}
