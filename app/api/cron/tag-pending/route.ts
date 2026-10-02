import { NextRequest } from "next/server";
import { taggerEnabled } from "@/lib/tagger";
import { PER_WORKSPACE, RUN_BUDGET_MS, runNextJob, workspacesWithJobs } from "@/lib/tag-jobs";
import { embedPending } from "@/lib/embed";
import { assertSeatsOk } from "@/lib/quota";
import type { PlanKey } from "@/lib/plans";

export const maxDuration = 300;

/** Jobs at once in one run. Each workspace still runs at most PER_WORKSPACE (lib/tag-jobs.ts). */
const CONCURRENCY = 8;
/** Workspaces looked at per run, enough to keep the slots full */
const WORKSPACES = 100;

// The tagging worker, run every minute by Vercel Cron (vercel.json). Every add starts its own job; this takes
// what is left: imports bigger than a workspace's share, failures with tries left, runs lost with their
// server, and every item again after a new taxonomy. It shares the slots between workspaces in turn, so a
// workspace with 10,000 items to tag doesn't hold up one with 3, and stops taking jobs at the run's budget.
// With nothing to do it costs one query.
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!taggerEnabled()) return Response.json({ skipped: "OPENROUTER_API_KEY not configured" });
  const deadline = Date.now() + RUN_BUDGET_MS;

  // A workspace over its seats gets no AI until it fixes it, as in the app
  const found = await workspacesWithJobs(WORKSPACES);
  const open = (await Promise.all(found.map(async (w) =>
    (await assertSeatsOk({ id: w.organizationId, plan: w.plan as PlanKey }).then(() => true, () => false)) ? w.organizationId : null)))
    .filter((id): id is string => !!id);

  // The workspaces in turn. One with nothing left leaves the turn. A slot that finds every workspace
  // full stops: the slots already running those workspaces carry on with them.
  const turn = [...open];
  let next = 0, done = 0, failed = 0, throttled = false;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, turn.length * PER_WORKSPACE) }, async () => {
    let busyInARow = 0;
    while (!throttled && turn.length && busyInARow < turn.length && Date.now() < deadline) {
      const org = turn[next++ % turn.length];
      const r = await runNextJob(org);
      // The provider asks to slow down: the whole run stops taking jobs, the next minute tries again
      if (r === "throttled") { throttled = true; break; }
      if (r === "busy") { busyInARow++; continue; }
      busyInARow = 0;
      if (r === "none") { const i = turn.indexOf(org); if (i >= 0) turn.splice(i, 1); }
      else if (r === "done") done++; else failed++;
    }
  }));
  // Vectors left to make (new tags whose embed failed, edits, the first fill): one batched call each 64
  const embedded = Date.now() < deadline ? await embedPending(200).catch((e) => { console.warn("embed:", e instanceof Error ? e.message : e); return 0; }) : 0;
  return Response.json({ workspaces: open.length, done, failed, throttled, embedded, ms: RUN_BUDGET_MS - (deadline - Date.now()) });
}
