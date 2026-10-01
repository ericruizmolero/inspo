// Applies pending migrations (./drizzle) when a server instance starts (instrumentation.ts).
// Only the app runs this. Scripts and background jobs import lib/db and never migrate.
// Several instances can start at once (Vercel cold starts, a deploy): a Postgres advisory
// lock makes them take turns, and the ones that come after find nothing pending.
//
// The lock belongs to a session, so it runs on a connection of its own, never the pool's.
// Behind Neon's pooler (PgBouncer, transaction mode) a session lock can land on a server
// connection nobody unlocks, and every later instance would wait on it for good: with
// DATABASE_URL_UNPOOLED set (Neon's direct host), migrations go there instead.
import path from "path";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { databaseUrl } from "./url";

// Any fixed number works, it only has to be the same in every instance
const LOCK_ID = 7_342_019;

export async function runMigrations(): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || databaseUrl() });
  await client.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
    try {
      await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
    } finally {
      await client.query("select pg_advisory_unlock($1)", [LOCK_ID]);
    }
  } finally {
    await client.end();
  }
}
