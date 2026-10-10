import { afterAll, beforeAll, expect, test } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { db, pool, schema } from "@/lib/db";
import { deleteItems } from "@/lib/items";
import { pruneTombstones } from "@/lib/pulse";
import { addComment, addItems, cleanupTeam, seedTeam, type Team } from "./seed";

let team: Team;
beforeAll(async () => { team = await seedTeam(); });
afterAll(async () => { if (team) await cleanupTeam(team); await pool.end(); });

const T = schema.libraryTombstone;
const stones = async () => (await db.select({ kind: T.kind, id: T.id }).from(T).where(eq(T.organizationId, team.ws.id))).sort((a, b) => a.id.localeCompare(b.id));

test("deleting an item leaves a tombstone for it and for each comment its cascade took", async () => {
  const [a, b] = await addItems(team, 2);
  const c = await addComment(team, a, "on a");
  await addComment(team, b, "on b");
  await deleteItems(team.ws.id, [a]);
  expect(await stones()).toEqual([{ kind: "item", id: a }, { kind: "comment", id: c }].sort((x, y) => x.id.localeCompare(y.id)));
});

test("a comment deleted on its own leaves one, and a raw delete does too", async () => {
  const [item] = await addItems(team, 1, { from: 10 });
  const c = await addComment(team, item, "gone soon");
  await db.delete(schema.inspoComment).where(eq(schema.inspoComment.id, c));
  expect((await stones()).some((s) => s.kind === "comment" && s.id === c)).toBe(true);
});

test("the cron prunes tombstones older than a week and keeps the recent ones", async () => {
  await db.insert(T).values({ organizationId: team.ws.id, kind: "item", id: `${team.tag}-old`, deletedAt: sql`now() - interval '8 days'` });
  expect(await pruneTombstones()).toBeGreaterThanOrEqual(1);
  const left = await db.select({ id: T.id }).from(T).where(and(eq(T.organizationId, team.ws.id), eq(T.id, `${team.tag}-old`)));
  expect(left).toEqual([]);
  expect((await stones()).length).toBeGreaterThan(0);
});
