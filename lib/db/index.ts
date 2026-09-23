// Database connection. Local: SQLite file at .data/inspo.db.
// Production: Turso (libsql) with DATABASE_URL + DATABASE_AUTH_TOKEN.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL || "file:.data/inspo.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient(url.startsWith("file:") ? { url } : { url, authToken });
// SQLite does not enforce foreign keys (ON DELETE CASCADE) unless enabled per connection
if (url.startsWith("file:")) client.execute("PRAGMA foreign_keys = ON").catch(() => {});

export const db = drizzle(client, { schema });
export { schema };
export type Db = typeof db;
