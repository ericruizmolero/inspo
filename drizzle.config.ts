import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./lib/db/url";

// drizzle-kit only generates migrations (npm run db:generate). Deploys apply them in the build
// (scripts/migrate.ts), and `next dev` applies them to the local database (instrumentation.ts).
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl() },
});
