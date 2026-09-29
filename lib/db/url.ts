// Which database to connect to. Shared by the app, drizzle.config.ts and the scripts.
export const LOCAL_DATABASE_URL = "postgres://postgres@127.0.0.1:5432/criterio";

const isPostgres = (u: string) => /^postgres(ql)?:\/\//.test(u);

/**
 * DATABASE_URL when it is a Postgres URL. Outside production, anything else (unset, or a
 * leftover non-Postgres value) falls back to the local database.
 */
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (isPostgres(url)) return url;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("DATABASE_URL must be a postgres:// URL");
  }
  if (url) console.warn(`DATABASE_URL is not a Postgres URL (${url.split(":")[0]}:…), using ${LOCAL_DATABASE_URL}`);
  return LOCAL_DATABASE_URL;
}
