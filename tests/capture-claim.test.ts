import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, expect, test } from "vitest";
import { db, schema } from "@/lib/db";
import { claim, once, release, waitFor } from "@/lib/capture-claim";

const key = `test:${randomBytes(4).toString("hex")}`;

afterAll(() => release(key));

test("one claim at a time: the second caller is refused until the first releases", async () => {
  expect(await claim(key, 60_000), "the first caller holds it").toBe(true);
  expect(await claim(key, 60_000), "the second is refused").toBe(false);
  await release(key);
  expect(await claim(key, 60_000), "released, it can be taken again").toBe(true);
});

test("a claim older than the work's limit is taken over", async () => {
  await db.update(schema.captureClaim).set({ claimedAt: sql`now() - interval '2 minutes'` }).where(eq(schema.captureClaim.key, key));
  expect(await claim(key, 5 * 60_000), "a two minute old claim is still live at a five minute limit").toBe(false);
  expect(await claim(key, 60_000), "and lost at a one minute limit").toBe(true);
});

test("waitFor answers with the first value read, or null once the time passes", async () => {
  let reads = 0;
  const value = await waitFor(async () => (++reads >= 3 ? "ready" : null), Date.now() + 5_000, 10);
  expect(value).toBe("ready");
  expect(reads).toBe(3);
  expect(await waitFor(async () => null, Date.now() + 50, 10), "nothing arrived in time").toBeNull();
});

test("once: a caller that finds the key held waits for it and reads, or gives up with null", async () => {
  await release(key);
  const limits = { staleMs: 60_000, waitMs: 2_000 };
  let runs = 0;
  const work = async () => { runs++; await new Promise((r) => setTimeout(r, 200)); return "ran"; };
  const both = await Promise.all([once(key, limits, work, async () => "read"), once(key, limits, work, async () => "read")]);
  expect(both.sort(), "one runs, the other reads what it left").toEqual(["ran", "read"]);
  expect(runs).toBe(1);
  expect(await claim(key, 60_000), "the runner released it").toBe(true);
  expect(await once(key, { staleMs: 60_000, waitMs: 50 }, work, async () => "read"), "held past the wait").toBeNull();
  expect(runs, "a caller that gave up never ran").toBe(1);
});
