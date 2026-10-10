import { afterAll, beforeAll, expect, test } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db, pool, schema } from "@/lib/db";
import { deleteItems } from "@/lib/items";
import { loadPage, PAGE, readStamp } from "@/lib/library";
import { applyPage, applyPulse, type Mirror } from "@/lib/library-mirror";
import { pulse } from "@/lib/pulse";
import { addComment, addItems, cleanupTeam, seedTeam, type Team } from "./seed";

let team: Team;
const HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000);
beforeAll(async () => { team = await seedTeam(); });
afterAll(async () => { if (team) await cleanupTeam(team); await pool.end(); });

const look = async () => { const head = await readStamp(team.ws.id); return { ...head, bell: "" }; };

test("nothing changed: the answer is the stamp and the time, and nothing else", async () => {
  await addItems(team, 3, { createdAt: HOUR_AGO });
  const ask = await look();
  const out = await pulse(team.user, team.ws, ask);
  expect(Object.keys(out).sort()).toEqual(["since", "stamp"]);
  expect(out.stamp).toBe(ask.stamp);
});

test("a changed item comes back in the page's shape, and an untouched one does not", async () => {
  const [a, b] = await addItems(team, 2, { from: 100, createdAt: HOUR_AGO });
  const ask = await look();
  await db.update(schema.inspoItem).set({ name: "renamed", thumbnailUrl: "/api/files/x.png", updatedAt: new Date() }).where(eq(schema.inspoItem.id, a));
  const out = await pulse(team.user, team.ws, ask);
  expect(out.changed?.items.map((i) => i.id)).toEqual([a]);
  expect(out.changed?.items[0].name).toBe("renamed");
  expect(out.changed?.thumbnailMap[out.changed.items[0].web]).toBe("/api/files/x.png");
  expect(out.changed?.items.some((i) => i.id === b)).toBe(false);
  expect(out.stamp).not.toBe(ask.stamp);
  expect(out.projects, "projects did not move").toBeUndefined();
});

test("a deleted item and a deleted comment come back as tombstones", async () => {
  const [a, b] = await addItems(team, 2, { from: 200, createdAt: HOUR_AGO });
  const c = await addComment(team, b, "about to go", HOUR_AGO);
  const ask = await look();
  await deleteItems(team.ws.id, [a]);
  await db.delete(schema.inspoComment).where(eq(schema.inspoComment.id, c));
  const out = await pulse(team.user, team.ws, ask);
  expect(out.gone?.items).toContain(a);
  expect(out.gone?.comments).toContain(c);
});

test("a new comment arrives, and a row inside the overlap merged twice gives the same state", async () => {
  const [a] = await addItems(team, 1, { from: 300, createdAt: HOUR_AGO });
  const page = await loadPage(team.ws.id, null);
  const start: Mirror = { ...page, comments: page.comments };
  const ask = await look();
  await db.update(schema.inspoItem).set({ note: "seen twice", updatedAt: new Date() }).where(eq(schema.inspoItem.id, a));
  const c = await addComment(team, a, "hello");
  const first = await pulse(team.user, team.ws, ask);
  expect(first.comments?.map((x) => x.id)).toContain(c);
  // The next look starts at the new cursor, still within OVERLAP_MS of both writes: the same rows come again
  const second = await pulse(team.user, team.ws, { stamp: ask.stamp, since: first.since, bell: "" });
  expect(second.changed?.items.map((i) => i.id)).toContain(a);
  expect(second.comments?.map((x) => x.id)).toContain(c);
  const once = applyPulse(start, first);
  const twice = applyPulse(once, second);
  expect(twice).toEqual(once);
  expect(twice.items, "the same objects come back").toBe(once.items);
  expect(twice.comments).toBe(once.comments);
  expect(once.items.filter((i) => i.id === a)).toHaveLength(1);
  expect(once.comments[a].map((x) => x.id)).toEqual([c]);
});

test("a look older than the tombstones are kept asks for a reload", async () => {
  const ask = await look();
  const out = await pulse(team.user, team.ws, { stamp: "old", since: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), bell: ask.bell });
  expect(out.reload).toBe(true);
});

test("a filing sends the links whole, and only them", async () => {
  const [a] = await addItems(team, 1, { from: 400, createdAt: HOUR_AGO });
  const now = new Date();
  await db.insert(schema.project).values({ id: `${team.tag}-p`, organizationId: team.ws.id, name: "p", createdBy: team.user.id, createdAt: HOUR_AGO, updatedAt: HOUR_AGO });
  const ask = await look();
  await db.insert(schema.projectItem).values({ projectId: `${team.tag}-p`, itemId: a, organizationId: team.ws.id, addedBy: team.user.id, createdAt: now });
  const out = await pulse(team.user, team.ws, ask);
  expect(out.links?.[a]).toEqual([`${team.tag}-p`]);
  expect(out.projects).toBeUndefined();
  expect(out.votes).toBeUndefined();
});

test("pages over many equal dates have no gap and no duplicate across the cursor", async () => {
  const other = await seedTeam();
  try {
    const sameDay = "2026-01-01";
    // Three instants, two of them shared by hundreds of rows: only the id tells them apart
    const at1 = new Date("2026-01-01T10:00:00.000Z"), at2 = new Date("2026-01-01T09:00:00.000Z");
    const ids = [
      ...(await addItems(other, 400, { date: sameDay, createdAt: at1 })),
      ...(await addItems(other, 350, { from: 400, date: sameDay, createdAt: at2 })),
      ...(await addItems(other, 10, { from: 750, date: "2025-12-31", createdAt: at1 })),
    ];
    const seen: string[] = [];
    let mirror: Mirror | null = null;
    let cursor: string | null = null, pages = 0;
    do {
      const page = await loadPage(other.ws.id, cursor);
      expect(page.items.length).toBeLessThanOrEqual(PAGE);
      seen.push(...page.items.map((i) => i.id!));
      mirror = mirror ? applyPage(mirror, page) : { ...page };
      cursor = page.cursor; pages++;
    } while (cursor);
    expect(pages).toBe(Math.ceil(ids.length / PAGE));
    expect(seen).toHaveLength(ids.length);
    expect(new Set(seen)).toEqual(new Set(ids));
    expect(mirror!.items.map((i) => i.id)).toEqual(seen);
    // Newest day first, and the older instant after the newer within it
    expect(seen.slice(-10).every((id) => Number(id.split("-").pop()) >= 750)).toBe(true);
    expect(seen.indexOf(ids[0])).toBeLessThan(seen.indexOf(ids[400]));
  } finally {
    await cleanupTeam(other);
  }
});

test("a template's own references stay out of the pages and the changes until a project holds them", async () => {
  const [t] = await addItems(team, 1, { from: 500, createdAt: HOUR_AGO, author: "Criterio" });
  const ask = await look();
  await db.update(schema.inspoItem).set({ updatedAt: new Date() }).where(inArray(schema.inspoItem.id, [t]));
  const out = await pulse(team.user, team.ws, ask);
  expect(out.changed?.items.some((i) => i.id === t) ?? false).toBe(false);
  const page = await loadPage(team.ws.id, null);
  expect(page.items.some((i) => i.id === t)).toBe(false);
});
