// Applies pending migrations (./drizzle) when a server instance starts (instrumentation.ts).
// Only the app runs this. Scripts and background jobs import lib/db and never migrate.
// Several instances can start at once (Vercel cold starts, a deploy): a Postgres advisory
// lock makes them take turns, and the ones that come after find nothing pending.
import path from "path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

// Any fixed number works, it only has to be the same in every instance
const LOCK_ID = 7_342_019;

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
    try {
      await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    } finally {
      await client.query("select pg_advisory_unlock($1)", [LOCK_ID]);
    }
  } finally {
    client.release();
  }
}
