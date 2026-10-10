// Our own limits, in the same table as Better Auth's (rateLimit in lib/db/schema.ts): every instance counts
// together. Our keys start with "app:", so they never meet Better Auth's ip|path ones.
import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { newId } from "@/lib/workspace-core";

/**
 * Counts one more use of `key` and says whether it is still inside `max` uses per `windowMs`.
 * Fixed window: it starts with the first use and resets once it is over. One statement, so two requests
 * at the same moment cannot both read the old count.
 */
export async function allow(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const k = `app:${key}`;
  const { rows } = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limit (id, key, count, last_request) VALUES (${newId()}, ${k}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit.last_request <= ${now - windowMs} THEN 1 ELSE rate_limit.count + 1 END,
      last_request = CASE WHEN rate_limit.last_request <= ${now - windowMs} THEN ${now} ELSE rate_limit.last_request END
    RETURNING count`);
  return Number(rows[0]?.count ?? 1) <= max;
}

/** Deletes the counters whose window ended over a day ago, ours and Better Auth's: the longest window is an hour,
 *  so none of them still counts. The morning cron runs it; without it the table keeps one row per key ever seen. */
export async function pruneRateLimits(): Promise<number> {
  const { rowCount } = await db.execute(sql`DELETE FROM rate_limit WHERE last_request < ${Date.now() - 24 * 60 * 60 * 1000}`);
  return rowCount ?? 0;
}
