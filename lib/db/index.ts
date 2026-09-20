// Conexión a la base de datos. Local: fichero SQLite en .data/inspo.db.
// Producción: Turso (libsql) con DATABASE_URL + DATABASE_AUTH_TOKEN.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL || "file:.data/inspo.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient(url.startsWith("file:") ? { url } : { url, authToken });
// SQLite no aplica claves foráneas (ON DELETE CASCADE) si no se activa por conexión
if (url.startsWith("file:")) client.execute("PRAGMA foreign_keys = ON").catch(() => {});

export const db = drizzle(client, { schema });
export { schema };
export type Db = typeof db;
