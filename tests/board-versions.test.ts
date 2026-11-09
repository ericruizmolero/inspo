import { afterEach, beforeEach, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { fileItems, unfileItems } from "@/lib/projects";
import { listBoardVersions, restoreBoardVersion } from "@/lib/board-versions";
import { addItems, cleanupTeam, seedTeam, type Team } from "./library/seed";

let team: Team, project: string, ids: string[];
beforeEach(async () => {
  team = await seedTeam();
  project = `${team.tag}-project`;
  const now = new Date();
  await db.insert(schema.project).values({ id: project, organizationId: team.ws.id, name: "Acme", createdBy: team.user.id, createdAt: now, updatedAt: now });
  await addItems(team, 4);
  ids = [0, 1, 2, 3].map((i) => `${team.tag}-${i}`);
});
afterEach(() => cleanupTeam(team));

const onBoard = async () => (await db.select({ id: schema.projectItem.itemId }).from(schema.projectItem).where(eq(schema.projectItem.projectId, project))).map((r) => r.id).sort();

test("changes by the same person a moment apart are one version, measured against the one before", async () => {
  await fileItems(team.ws.id, project, [ids[0]], team.user.id);
  await fileItems(team.ws.id, project, [ids[1]], team.user.id);
  const rows = await listBoardVersions(team.ws.id, project);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ n: 1, count: 2, byName: team.user.name, via: "app" });
  expect(rows[0].added.sort()).toEqual([ids[0], ids[1]].sort());
});

test("the first change keeps the board as it was before it, and another door is another version", async () => {
  const now = new Date();
  // On the board before versions existed: filed straight in the table
  await db.insert(schema.projectItem).values([ids[0], ids[1]].map((itemId) => ({ projectId: project, itemId, organizationId: team.ws.id, addedBy: team.user.id, createdAt: now })));
  await unfileItems(team.ws.id, project, [ids[1]], { userId: team.user.id });
  await fileItems(team.ws.id, project, [ids[2]], team.user.id);
  let rows = await listBoardVersions(team.ws.id, project);
  expect(rows.map((r) => r.n)).toEqual([2, 1]);
  expect(rows[1]).toMatchObject({ via: "start", byName: null, count: 2 });
  expect(rows[0]).toMatchObject({ count: 2, removed: [ids[1]], added: [ids[2]] });

  // Back to the start: what came after leaves the board, what left comes back, and that is a version too
  const back = await restoreBoardVersion(team.ws.id, project, 1, { id: team.user.id, name: team.user.name });
  expect(back.missing).toBe(0);
  expect(await onBoard()).toEqual([ids[0], ids[1]].sort());
  rows = await listBoardVersions(team.ws.id, project);
  expect(rows[0]).toMatchObject({ n: 3, via: "restore:1", added: [ids[1]], removed: [ids[2]] });
});

test("a reference deleted from the library since cannot come back, and is counted", async () => {
  await fileItems(team.ws.id, project, [ids[0], ids[3]], team.user.id);
  await db.update(schema.boardVersion).set({ createdAt: new Date(Date.now() - 3_600_000) }).where(eq(schema.boardVersion.projectId, project));
  await unfileItems(team.ws.id, project, [ids[0], ids[3]], { userId: team.user.id });
  await db.delete(schema.inspoItem).where(eq(schema.inspoItem.id, ids[3]));
  const back = await restoreBoardVersion(team.ws.id, project, 1, { id: team.user.id, name: team.user.name });
  expect(back).toEqual({ itemIds: [ids[0]], missing: 1 });
  expect(await onBoard()).toEqual([ids[0]]);
});
