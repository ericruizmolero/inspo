// Runs once per server instance, before it takes requests: brings the database schema up to date.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runMigrations } = await import("./lib/db/migrate");
  await runMigrations();
}
