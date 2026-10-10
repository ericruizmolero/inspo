import * as Sentry from "@sentry/nextjs";
import { REPORT_DSN, reportOptions } from "./lib/error-reports";

export async function register() {
  if (REPORT_DSN) Sentry.init(reportOptions);
  // In development, brings the local database schema up to date when `next dev` starts.
  // Deploys migrate in the build instead (scripts/migrate.ts), where a failure stops the deploy:
  // here a failure is only logged, and the server would go on with the old schema.
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "development") return;
  const { runMigrations } = await import("./lib/db/migrate");
  await runMigrations();
}

// An error thrown while rendering or in a route handler, on the server
export const onRequestError = Sentry.captureRequestError;
