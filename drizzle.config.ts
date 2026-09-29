import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./lib/db/url";

// drizzle-kit only generates migrations (npm run db:generate). The app applies them
// when it starts (instrumentation.ts), never a build step or a script.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl() },
});
