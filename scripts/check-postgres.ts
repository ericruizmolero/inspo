// Check of the three places the Postgres move could break without a type error.
// Not a test framework: assert. Runs against DATABASE_URL (local by default) and
// leaves nothing behind: everything hangs off a throwaway workspace that is deleted at the end.
//   npm run check:postgres
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { newId, setThumbnail, deleteItem, addItem } from "../lib/items";
import { dayOf, daySlots, startOfTodayMs, tzOffsetSeconds } from "../lib/days";

async function main() {
  const now = new Date();
  const orgId = newId(), userId = newId();
  await db.insert(schema.user).values({ id: userId, name: "check", email: `check-${userId}@example.invalid`, createdAt: now, updatedAt: now });
  await db.insert(schema.organization).values({ id: orgId, name: "check", slug: `check-${orgId}`, createdAt: now, kind: "team" });
  try {
    // 1. setThumbnail reports success from rowCount
    const item = await addItem(orgId, { name: "Check", web: "https://check.example", author: "check", createdBy: userId });
    assert.ok(item.id);
    assert.equal(await setThumbnail(orgId, item.web, "/thumbs/check.png"), true, "setThumbnail on an existing item");
    assert.equal(await setThumbnail(orgId, "https://missing.example", "/x.png"), false, "setThumbnail on a missing item");

    // 2. Deleting an item takes its comments with it (ON DELETE CASCADE, no code doing it)
    await db.insert(schema.inspoComment).values({ id: newId(), organizationId: orgId, itemId: item.id, authorId: userId, authorName: "check", body: "hi", createdAt: now });
    assert.equal(await deleteItem(orgId, item.id), true);
    assert.equal(await deleteItem(orgId, item.id), false, "second delete finds nothing");
    const [left] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.inspoComment).where(eq(schema.inspoComment.organizationId, orgId));
    assert.equal(left.n, 0, "comments cascade with the item");

    // 3. Day grouping in Madrid: 23:30 and 00:30 local fall on different days, and match daySlots
    const off = tzOffsetSeconds();
    const today = startOfTodayMs(off);
    const at = (ms: number) => new Date(ms);
    for (const t of [today - 30 * 60000, today + 30 * 60000, today + 60 * 60000]) {
      await db.insert(schema.aiUsage).values({ id: newId(), organizationId: orgId, action: "explain", model: "check", createdAt: at(t) });
    }
    const U = schema.aiUsage, day = dayOf(U.createdAt, off);
    const rows = await db.select({ day, n: sql<number>`count(*)::int` }).from(U).where(eq(U.organizationId, orgId)).groupBy(day).orderBy(day);
    const slots = daySlots(2, off);
    assert.deepEqual(rows.map((r) => [Number(r.day), r.n]), [[slots[0].day, 1], [slots[1].day, 2]], "yesterday 1, today 2");
  } finally {
    // Also checks the cascade from a workspace: this removes the usage rows
    await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
    await db.delete(schema.user).where(eq(schema.user.id, userId));
  }
  const [orphans] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.aiUsage).where(eq(schema.aiUsage.organizationId, orgId));
  assert.equal(orphans.n, 0, "workspace delete cascades");
  console.log("check:postgres ok");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
