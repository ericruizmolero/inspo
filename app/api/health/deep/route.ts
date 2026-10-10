// What the app depends on, for BetterStack: the database, R2, and that the tagging jobs keep moving.
// 503 when one fails, so the monitor alerts. Public (proxy.ts), and it says only ok, timings and job counts.
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { fileExists } from "@/lib/storage";
import { jobStats } from "@/lib/tag-jobs";

/** A check's own `ok` wins over the default one: a query that answers can still find a problem */
async function timed(check: () => Promise<Record<string, unknown> | void>) {
  const start = Date.now();
  try {
    const found = await check();
    return { ok: true, ms: Date.now() - start, ...found };
  } catch (e) {
    return { ok: false, ms: Date.now() - start, error: e instanceof Error ? e.name : "error" };
  }
}

export async function GET() {
  const [database, storage, jobs] = await Promise.all([
    timed(async () => { await db.execute(sql`select 1`); }),
    // A key that never exists: the answer is "no", and any other answer means R2 is unreachable
    timed(async () => { await fileExists("health/probe"); }),
    // Stalled: a workspace that may run jobs has one waiting over 15 minutes and started none in that time
    // (lib/tag-jobs.ts). A long import moving through its line is not stalled. The rest is to read.
    timed(async () => { const stats = await jobStats(); return { ok: stats.stalled === 0, ...stats }; }),
  ]);
  const ok = database.ok && storage.ok && jobs.ok;
  return Response.json({ ok, checks: { database, storage, jobs } }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
