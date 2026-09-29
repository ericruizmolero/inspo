// Check of the database behaviour that a type error would not catch: rowCount, cascades,
// day grouping, file cleanup, bulk tagging and the heartbeat upsert.
// Not a test framework: assert. Runs against DATABASE_URL (local by default) and the storage
// lib/storage.ts picks (.data/files, or R2 when R2_* is set), and leaves nothing behind:
// everything hangs off a throwaway workspace that is deleted at the end.
//   npm run check:postgres
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { newId, setThumbnail, deleteItem, addItem, setTagsBulk } from "../lib/items";
import { touchSegment } from "../lib/activity";
import { createProject, deleteProject, fileItems, loadProjects } from "../lib/projects";
import { putFile, fileExists, getFile, keyOf } from "../lib/storage";
import { blobPrefix } from "../lib/thumbnails";
import { commentPrefix } from "../lib/comment-files";

const exists = (url: string) => fileExists(keyOf(url)!);
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

    // 4. Files: a replaced thumbnail is deleted unless another item still uses it,
    // and deleting an item deletes its thumbnail and its comment screenshots
    const tag = newId();
    const a = await addItem(orgId, { name: "A", web: "https://a.check.example", author: "check" });
    const b = await addItem(orgId, { name: "B", web: "https://b.check.example", author: "check" });
    assert.ok(a.id && b.id);
    const put = (prefix: string, name: string) => putFile(`${prefix}${tag}-${name}`, Buffer.from("x"), "image/png");
    const shared = await put(blobPrefix(orgId), "shared.png"), own = await put(blobPrefix(orgId), "own.png"), shot = await put(commentPrefix(orgId), "shot.png");
    assert.equal((await getFile(keyOf(shared)!))?.body.toString(), "x", "a stored file reads back");
    const ranged = await getFile(keyOf(shared)!, "bytes=0-0");
    assert.equal(ranged?.range, "bytes 0-0/1", "byte ranges work (video in Safari)");
    await setThumbnail(orgId, a.web, shared);
    await setThumbnail(orgId, b.web, shared);
    await setThumbnail(orgId, a.web, own);
    assert.ok(await exists(shared), "a thumbnail B still uses stays");
    await db.insert(schema.inspoComment).values({ id: newId(), organizationId: orgId, itemId: a.id, authorName: "check", body: "", attachments: [{ url: shot, w: 1, h: 1 }], createdAt: now });
    await deleteItem(orgId, a.id);
    assert.ok(!await exists(own), "the deleted item's thumbnail is gone");
    assert.ok(!await exists(shot), "the deleted item's comment screenshot is gone");
    await setThumbnail(orgId, b.web, null);
    assert.ok(!await exists(shared), "a thumbnail nobody uses is gone");

    // 5. Bulk tags: one statement, the right rows
    const c = await addItem(orgId, { name: "C", web: "https://c.check.example/", author: "check" });
    await setTagsBulk(orgId, { "https://b.check.example": { summary: "b" } as never, "https://C.check.example": { summary: "c" } as never });
    const tagged = await db.select({ web: schema.inspoItem.web, tags: schema.inspoItem.tagsJson }).from(schema.inspoItem).where(eq(schema.inspoItem.organizationId, orgId));
    assert.deepEqual(Object.fromEntries(tagged.map((t) => [t.web, (t.tags as { summary?: string } | null)?.summary])), { "https://b.check.example": "b", [c.web]: "c" });

    // 7. Projects: an item's links go when the item goes; deleting a project keeps its items
    const p1 = await createProject(orgId, "One", userId), p2 = await createProject(orgId, "Two", userId);
    const [x, y] = await Promise.all([
      addItem(orgId, { name: "X", web: "https://x.check.example", author: "check" }),
      addItem(orgId, { name: "Y", web: "https://y.check.example", author: "check" }),
    ]);
    await fileItems(orgId, p1.id, [x.id!, y.id!], userId);
    await fileItems(orgId, p2.id, [y.id!], userId);
    await fileItems(orgId, p1.id, [x.id!], userId); // twice is not an error
    await deleteItem(orgId, x.id!);
    const links = (await loadProjects(orgId)).links;
    assert.deepEqual(Object.keys(links), [y.id!], "a deleted item's links are gone");
    assert.deepEqual([...links[y.id!]].sort(), [p1.id, p2.id].sort());
    await deleteProject(orgId, p1.id);
    const after = await loadProjects(orgId);
    assert.deepEqual(after.links, { [y.id!]: [p2.id] }, "a deleted project's links are gone");
    const [yRow] = await db.select({ id: schema.inspoItem.id }).from(schema.inspoItem).where(eq(schema.inspoItem.id, y.id!));
    assert.ok(yRow, "the item itself stays");

    // 6. Heartbeat: creates, adds the gap, and refuses someone else's segment
    const seg = `chk${newId().slice(0, 12)}`;
    const beat = (uid: string) => touchSegment(uid, { segmentId: seg, visitId: seg, area: "library", path: "/", organizationId: orgId }, null);
    assert.deepEqual(await beat(userId), { ok: true });
    await db.update(schema.activitySegment).set({ lastSeenAt: new Date(Date.now() - 20_000) }).where(eq(schema.activitySegment.id, seg));
    assert.deepEqual(await beat(userId), { ok: true });
    const [s1] = await db.select({ seconds: schema.activitySegment.seconds }).from(schema.activitySegment).where(eq(schema.activitySegment.id, seg));
    assert.ok(s1.seconds >= 19 && s1.seconds <= 21, `20 s gap counted (${s1.seconds})`);
    const other = newId();
    await db.insert(schema.user).values({ id: other, name: "other", email: `check-${other}@example.invalid`, createdAt: now, updatedAt: now });
    assert.equal((await beat(other)).ok, false, "someone else's segment is refused");
    await db.delete(schema.user).where(eq(schema.user.id, other));

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
