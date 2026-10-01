// In development, brings the local database schema up to date when `next dev` starts.
// Deploys migrate in the build instead (scripts/migrate.ts), where a failure stops the deploy:
// here a failure is only logged, and the server would go on with the old schema.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "development") return;
  const { runMigrations } = await import("./lib/db/migrate");
  await runMigrations();
}
