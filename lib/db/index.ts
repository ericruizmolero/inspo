// Database connection: Postgres with DATABASE_URL.
// Local: the DBngin server, database "criterio" (LOCAL_DATABASE_URL below).
// Production and staging: DATABASE_URL in Vercel.
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

// One pool per server instance. In development Next reloads modules, so it lives on globalThis
// or every edit would open new connections until Postgres refuses them.
// On Vercel the connections go to Neon's pooler (lib/db/url.ts), which holds a server connection only while a
// query runs: 10 per instance let loadLibrary's queries run side by side instead of queueing. An idle one closes
// after 5 s, and attachDatabasePool keeps a suspended Fluid instance alive until it has.
const g = globalThis as { __criterioPool?: Pool };
const pool = g.__criterioPool ?? new Pool({ connectionString: databaseUrl(), max: 10, idleTimeoutMillis: 5_000, connectionTimeoutMillis: 10_000 });
if (process.env.NODE_ENV !== "production") g.__criterioPool = pool;
if (process.env.VERCEL) attachDatabasePool(pool);

export const db = drizzle(pool, { schema });
export { schema, pool };
export type Db = typeof db;
