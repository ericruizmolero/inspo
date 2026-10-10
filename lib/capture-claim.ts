// Who is generating a DESIGN.md, capturing a page or running a project's pass right now, across instances. A claim
// is one row of capture_claim: whoever inserts it does the work, the others wait for the result and read it.
// A row, not a lock on the connection: behind Neon's pooler a session lock can outlive its session
// (lib/db/migrate.ts). A row older than the work's limit was left by a function that was cut off, and is taken.
import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "./db";

/** True when this caller now holds `key`: nobody had it, or whoever had it has been at it longer than `staleMs` */
export async function claim(key: string, staleMs: number): Promise<boolean> {
  const { rows } = await db.execute(sql`
    insert into capture_claim (key, claimed_at) values (${key}, now())
    on conflict (key) do update set claimed_at = now()
      where capture_claim.claimed_at < now() - make_interval(secs => ${staleMs / 1000}::float8)
    returning key`);
  return rows.length > 0;
}

export async function release(key: string): Promise<void> {
  await db.delete(schema.captureClaim).where(eq(schema.captureClaim.key, key));
}

/** Whether someone holds `key`, a claim older than `staleMs` aside */
async function held(key: string, staleMs: number): Promise<boolean> {
  const rows = await db.select({ key: schema.captureClaim.key }).from(schema.captureClaim)
    .where(and(eq(schema.captureClaim.key, key), gte(schema.captureClaim.claimedAt, sql`now() - make_interval(secs => ${staleMs / 1000}::float8)`))).limit(1);
  return rows.length > 0;
}

/**
 * Runs `work` once at a time for `key`, across instances. Whoever claims the key runs it; the others wait for the
 * claim to go and answer with `read`, what that run left. Null when the wait outlasts `waitMs`.
 */
export async function once<T>(key: string, limits: { staleMs: number; waitMs: number }, work: () => Promise<T>, read: () => Promise<T>): Promise<T | null> {
  if (await claim(key, limits.staleMs)) {
    try { return await work(); } finally { await release(key); }
  }
  const gone = await waitFor(async () => (await held(key, limits.staleMs) ? null : true), Date.now() + limits.waitMs);
  return gone ? read() : null;
}

/** Polls `read` until it returns a value, or until the time `until` (epoch ms) passes: then null */
export async function waitFor<T>(read: () => Promise<T | null>, until: number, everyMs = 1000): Promise<T | null> {
  for (;;) {
    const value = await read();
    if (value !== null) return value;
    const left = until - Date.now();
    if (left <= 0) return null;
    await new Promise((r) => setTimeout(r, Math.min(everyMs, left)));
  }
}
