// The open board's one request (POST /api/pulse): what changed in its workspace since it last looked, and whether
// the bell has news. Deleted rows come from library_tombstone, which triggers fill on every delete.
import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";

/** How long a deleted row is remembered. A board whose last look is older reloads its library */
export const TOMBSTONE_DAYS = 7;

/** The morning cron's cleanup */
export async function pruneTombstones(): Promise<number> {
  const { rowCount } = await db.execute(sql`delete from library_tombstone where deleted_at < now() - make_interval(days => ${TOMBSTONE_DAYS})`);
  return rowCount ?? 0;
}
