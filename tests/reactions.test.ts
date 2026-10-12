// Emoji reactions on a comment (lib/reactions.ts, toggleReaction in lib/comments.ts): one press gives, the next takes
// away, people reacting at the same moment all count, and only the listed emoji are taken.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "@/lib/db";
import { toggleReaction } from "@/lib/comments";
import { groupReactions, toggleIn } from "@/lib/reactions";
import { cleanup, seed, type Fixture } from "./isolation/fixture";

let fx: Fixture;
beforeAll(async () => { fx = await seed(); });
afterAll(async () => {
  if (fx) await cleanup(fx.tag);
  await pool.end();
});

const row = async (id: string) => (await db.select().from(schema.inspoComment).where(eq(schema.inspoComment.id, id)))[0];

describe("reactions", () => {
  test("a press gives, the next takes away, and the pulse sees the change", async () => {
    const { owner, team, comment } = fx.a;
    const me = { id: owner.id, name: owner.name };
    const given = await toggleReaction(team, comment, me, "👍");
    expect(given.reactions).toEqual([{ emoji: "👍", people: [me] }]);
    expect((await row(comment)).editedAt, "edited_at moves so the pulse carries it").not.toBeNull();
    const taken = await toggleReaction(team, comment, me, "👍");
    expect(taken.reactions ?? []).toEqual([]);
    expect((await row(comment)).reactions).toEqual([]);
  });

  test("twenty people reacting at once all count", async () => {
    const { team, reply } = fx.a;
    const people = Array.from({ length: 20 }, (_, i) => ({ id: `${fx.a.prefix}-p${i}`, name: `P${i}` }));
    await Promise.all(people.map((p) => toggleReaction(team, reply, p, "🔥")));
    const r = await row(reply);
    expect(r.reactions).toHaveLength(20);
    expect(new Set(r.reactions.map((x) => x.u)).size).toBe(20);
  });

  test("only the listed emoji, and only in its own workspace", async () => {
    const me = { id: fx.a.owner.id, name: fx.a.owner.name };
    await expect(toggleReaction(fx.a.team, fx.a.comment, me, "💩")).rejects.toMatchObject({ status: 400 });
    await expect(toggleReaction(fx.a.team, fx.a.comment, me, "<b>")).rejects.toMatchObject({ status: 400 });
    await expect(toggleReaction(fx.b.team, fx.a.comment, me, "👍")).rejects.toMatchObject({ status: 404 });
  });

  test("grouping keeps the order each emoji was first given, and the tab's toggle mirrors the server's", () => {
    const g = groupReactions([{ e: "🔥", u: "a", n: "A" }, { e: "👍", u: "b", n: "B" }, { e: "🔥", u: "b", n: "B" }]);
    expect(g.map((x) => [x.emoji, x.people.length])).toEqual([["🔥", 2], ["👍", 1]]);
    const off = toggleIn(g, "👍", { id: "b", name: "B" });
    expect(off.map((x) => x.emoji)).toEqual(["🔥"]);
    expect(toggleIn(off, "🔥", { id: "c", name: "C" })[0].people).toHaveLength(3);
  });
});
