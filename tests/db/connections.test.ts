import { afterEach, expect, test, vi } from "vitest";
import { like, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { databaseUrl } from "@/lib/db/url";
import { pruneRateLimits } from "@/lib/rate-limit";
import { newId } from "@/lib/workspace-core";

afterEach(() => { vi.unstubAllEnvs(); });

const DIRECT = "postgresql://u:p@ep-quiet-sky-a1b2c3.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const POOLED = "postgresql://u:p@ep-quiet-sky-a1b2c3-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

test("production refuses Neon's direct host and takes the pooled one", () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("DATABASE_URL", DIRECT);
  expect(() => databaseUrl()).toThrow(/-pooler/);
  vi.stubEnv("DATABASE_URL", POOLED);
  expect(databaseUrl()).toBe(POOLED);
});

test("a preview may use the direct host", () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("DATABASE_URL", DIRECT);
  expect(databaseUrl()).toBe(DIRECT);
});

test("the cron deletes the counters a day old and keeps the live ones", async () => {
  const tag = `app:test-${newId()}`;
  const day = 24 * 60 * 60 * 1000;
  await db.insert(schema.rateLimit).values([
    { id: newId(), key: `${tag}-old`, count: 3, lastRequest: Date.now() - day - 60_000 },
    { id: newId(), key: `${tag}-live`, count: 3, lastRequest: Date.now() - 60 * 60 * 1000 },
  ]);
  try {
    expect(await pruneRateLimits()).toBeGreaterThanOrEqual(1);
    const left = await db.select({ key: schema.rateLimit.key }).from(schema.rateLimit).where(like(schema.rateLimit.key, `${tag}-%`));
    expect(left.map((r) => r.key)).toEqual([`${tag}-live`]);
  } finally {
    await db.execute(sql`delete from rate_limit where key like ${`${tag}-%`}`);
  }
});
