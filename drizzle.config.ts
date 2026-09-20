import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL || "file:.data/inspo.db";

export default defineConfig({
  dialect: url.startsWith("file:") ? "sqlite" : "turso",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: url.startsWith("file:")
    ? { url }
    : { url, authToken: process.env.DATABASE_AUTH_TOKEN },
});
