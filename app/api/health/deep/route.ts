// What the app depends on, for BetterStack: the database, R2, and that the tagging jobs keep moving.
// 503 when one fails, so the monitor alerts. Public (proxy.ts), and it says only ok and timings.
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { fileExists } from "@/lib/storage";
import { MAX_ATTEMPTS } from "@/lib/tag-jobs";

const T = schema.inspoItem;

/** The worker takes whatever is left once a day (cron morning, 04:00 UTC). Work waiting longer than a day and a bit,
 *  with no job started in that time, means jobs stopped running while every page still loads. A workspace over its
 *  seats keeps its jobs waiting on purpose, so waiting alone is not enough. The cron itself has its own heartbeat
 *  (cron/morning). Shorten it when the worker runs more often (#110). */
const JOBS_STALE_HOURS = 26;

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
    timed(async () => {
      const hoursSince = (at: unknown) => sql<number | null>`extract(epoch from now() - ${at}) / 3600`;
      const [[waiting], [started]] = await Promise.all([
        db.select({ hours: hoursSince(sql`min(coalesce(${T.tagStartedAt}, ${T.createdAt}))`) }).from(T)
          .where(sql`${T.tagStatus} in ('pending', 'running') or (${T.tagStatus} = 'failed' and ${T.tagAttempts} < ${MAX_ATTEMPTS})`),
        db.select({ hours: hoursSince(sql`max(${T.tagStartedAt})`) }).from(T),
      ]);
      const round = (h: number | null) => h == null ? null : Math.round(Number(h) * 10) / 10;
      const oldestWaitingHours = round(waiting.hours), lastStartedHours = round(started.hours);
      const stalled = (oldestWaitingHours ?? 0) > JOBS_STALE_HOURS && (lastStartedHours ?? Infinity) > JOBS_STALE_HOURS;
      return { ok: !stalled, oldestWaitingHours, lastStartedHours };
    }),
  ]);
  const ok = database.ok && storage.ok && jobs.ok;
  return Response.json({ ok, checks: { database, storage, jobs } }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
