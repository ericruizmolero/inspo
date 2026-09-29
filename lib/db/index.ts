// Database connection: Postgres with DATABASE_URL.
// Local: the DBngin server, database "criterio" (LOCAL_DATABASE_URL below).
// Production and staging: DATABASE_URL in Vercel.
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

// One pool per server instance. In development Next reloads modules, so it lives on globalThis
// or every edit would open new connections until Postgres refuses them.
const g = globalThis as { __criterioPool?: Pool };
const pool = g.__criterioPool ?? new Pool({ connectionString: databaseUrl(), max: process.env.VERCEL ? 3 : 10 });
if (process.env.NODE_ENV !== "production") g.__criterioPool = pool;

export const db = drizzle(pool, { schema });
export { schema, pool };
export type Db = typeof db;
