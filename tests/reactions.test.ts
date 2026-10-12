// Emoji reactions on a comment (lib/reactions.ts, toggleReaction in lib/comments.ts): one each, another emoji replaces
// yours and the same one takes it away, people reacting at the same moment all count, and only the listed emoji are taken.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "@/lib/db";
import { toggleNoteReaction, toggleReaction } from "@/lib/comments";
import { groupReactions, toggleIn } from "@/lib/reactions";
import { latestTeamEvent, teamActivity, teamEvents } from "@/lib/notify";
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
    const swapped = await toggleReaction(team, comment, me, "🔥");
    expect(swapped.reactions, "one each: another emoji replaces yours").toEqual([{ emoji: "🔥", people: [me] }]);
    const taken = await toggleReaction(team, comment, me, "🔥");
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

  test("the note a reference was saved with takes reactions too, one each per note, and the pulse sees the reference", async () => {
    const { owner, team, item } = fx.a;
    const me = { id: owner.id, name: owner.name };
    const itemRow = async () => (await db.select().from(schema.inspoItem).where(eq(schema.inspoItem.id, item)))[0];
    const was = (await itemRow()).updatedAt;
    expect(await toggleNoteReaction(team, item, "note", me, "👍")).toEqual([{ emoji: "👍", people: [me] }]);
    expect((await itemRow()).updatedAt.getTime(), "updated_at moves so the pulse carries it").toBeGreaterThan(was.getTime());
    expect(await toggleNoteReaction(team, item, "subNote", me, "🔥"), "the sub-note is apart").toEqual([{ emoji: "🔥", people: [me] }]);
    expect(await toggleNoteReaction(team, item, "note", me, "❤️"), "another emoji replaces yours").toEqual([{ emoji: "❤️", people: [me] }]);
    expect(await toggleNoteReaction(team, item, "note", me, "❤️"), "the same one takes it away").toEqual([]);
    expect((await itemRow()).noteReactions, "the sub-note's stays").toMatchObject([{ e: "🔥", u: me.id, n: me.name, f: "subNote" }]);
    await expect(toggleNoteReaction(team, item, "title", me, "👍")).rejects.toMatchObject({ status: 400 });
    await expect(toggleNoteReaction(fx.b.team, item, "note", me, "👍")).rejects.toMatchObject({ status: 404 });
  });

  test("the bell of whoever wrote it hears of someone else's emoji, and nobody else's does", async () => {
    const { owner, team, comment, item } = fx.a;
    const other = { id: fx.b.owner.id, name: "Otra" };
    const before = await latestTeamEvent(team, owner.id);
    await toggleReaction(team, comment, other, "🎉");
    await toggleNoteReaction(team, item, "note", other, "👀");
    await toggleReaction(team, comment, { id: owner.id, name: owner.name }, "👍");
    const bell = await teamActivity(team, owner.id, "es");
    // The account's name now, not the one stored with the reaction
    const who = fx.b.owner.name;
    const mine = bell.lines.filter((l) => l.text.startsWith(`${who} reaccionó`) && /👀|🎉/.test(l.text));
    expect(mine.map((l) => l.text).sort()).toEqual([`${who} reaccionó 👀 a lo que dijiste en ${fx.a.secret} ${item}`, `${who} reaccionó 🎉 a lo que dijiste en ${fx.a.secret} ${item}`].sort());
    expect(mine.every((l) => l.path === `/i/${item}`), "each line opens the reference").toBe(true);
    expect(await latestTeamEvent(team, owner.id) > before, "the board's pulse sees news for the bell").toBe(true);
    expect((await teamEvents(team, new Date(0))).some((e) => e.kind === "reaction"), "never in the shared list, so never in the digest").toBe(false);
    await toggleReaction(team, comment, other, "🎉");
    expect((await teamActivity(team, owner.id, "es")).lines.filter((l) => l.text.includes("🎉")), "taken away, gone from the bell").toEqual([]);
  });

  test("grouping keeps the order each emoji was first given, and the tab's toggle mirrors the server's", () => {
    const g = groupReactions([{ e: "🔥", u: "a", n: "A" }, { e: "👍", u: "b", n: "B" }, { e: "🔥", u: "b", n: "B" }]);
    expect(g.map((x) => [x.emoji, x.people.length])).toEqual([["🔥", 2], ["👍", 1]]);
    const off = toggleIn(g, "👍", { id: "b", name: "B" });
    expect(off.map((x) => [x.emoji, x.people.length]), "pressing yours again takes away all of yours").toEqual([["🔥", 1]]);
    const swap = toggleIn([{ emoji: "👍", people: [{ id: "a", name: "A" }] }], "🔥", { id: "a", name: "A" });
    expect(swap.map((x) => x.emoji), "another emoji replaces yours").toEqual(["🔥"]);
    expect(toggleIn(off, "🔥", { id: "c", name: "C" })[0].people).toHaveLength(2);
  });
});
