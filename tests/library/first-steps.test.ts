import { afterAll, beforeAll, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "@/lib/db";
import { firstSteps, hideFirstSteps, markExported } from "@/lib/first-steps";
import { TEMPLATE_AUTHOR } from "@/lib/sample-items";
import { addItems, cleanupTeam, seedTeam, type Team } from "./seed";

let team: Team;
beforeAll(async () => { team = await seedTeam(); });
afterAll(async () => { if (team) await cleanupTeam(team); await pool.end(); });

const steps = () => firstSteps(team.user.id, team.ws.id);
const file = (projectId: string, ids: string[]) => db.insert(schema.projectItem).values(ids.map((itemId) => ({ projectId, itemId, organizationId: team.ws.id, createdAt: new Date() })));

test("each step is read from rows the app already writes, and walking the path hides it for good", async () => {
  const now = new Date(), ws = team.ws.id, p = `${team.tag}-p`, tpl = `${team.tag}-tpl`;
  expect(await steps()).toEqual({ example: false, project: null, brief: false, refs: 0, system: false, out: false });

  // An example's board and its references are Criterio's: neither is the person's project
  await db.insert(schema.project).values({ id: tpl, organizationId: ws, name: "example", template: {}, createdAt: now, updatedAt: now });
  const samples = await addItems(team, 3, { from: 100, author: TEMPLATE_AUTHOR });
  await file(tpl, samples);
  await db.insert(schema.activitySegment).values({ id: `${team.tag}-seg`, userId: team.user.id, organizationId: ws, visitId: "v", area: "example", path: "/", startedAt: now, lastSeenAt: now });
  expect(await steps()).toMatchObject({ example: true, project: null });

  await db.insert(schema.project).values({ id: p, organizationId: ws, name: "p", brief: { about: "A bakery in Córdoba" }, createdAt: now, updatedAt: now });
  const mine = await addItems(team, 10);
  await file(p, [...mine.slice(0, 9), samples[0]]);
  expect(await steps()).toMatchObject({ project: p, brief: true, refs: 9, system: false });
  await file(p, mine.slice(9));
  expect((await steps())?.refs).toBe(10);

  // A run copied from an example is not a pass; one of the project's own is
  await db.insert(schema.projectSystem).values({ projectId: p, organizationId: ws, runJson: { model: "template" }, createdAt: now, updatedAt: now });
  expect((await steps())?.system).toBe(false);
  await db.update(schema.projectSystem).set({ runJson: { model: "some-model" } }).where(eq(schema.projectSystem.projectId, p));
  expect(await steps()).toMatchObject({ system: true, out: false });

  await markExported(ws, p);
  expect(await steps()).toBeNull();
  const [u] = await db.select({ at: schema.user.firstStepsDoneAt }).from(schema.user).where(eq(schema.user.id, team.user.id));
  expect(u.at).not.toBeNull();

  // Deleting the project afterwards does not bring the list back
  await db.delete(schema.project).where(eq(schema.project.id, p));
  expect(await steps()).toBeNull();
});

test("hiding the list is per person and kept", async () => {
  await db.update(schema.user).set({ firstStepsDoneAt: null }).where(eq(schema.user.id, team.user.id));
  expect(await steps()).not.toBeNull();
  await hideFirstSteps(team.user.id);
  expect(await steps()).toBeNull();
});
