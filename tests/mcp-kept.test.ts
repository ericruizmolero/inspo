// read_criterio opens with what the team kept (lib/mcp/pieces.ts keptReferences): the board's references, the ones
// that came through Polish first, each with what was said about it; then the file as it was. The system is the
// team's own view, so the references are what an agent starts from (Eric, 20-11).
import { afterEach, beforeEach, expect, test } from "vitest";
import { db, schema } from "@/lib/db";
import { createExtKey } from "@/lib/ext-keys";
import { bearer, request } from "./isolation/probe";
import { addComment, addItems, cleanupTeam, seedTeam, type Team } from "./library/seed";

let team: Team, key: string;
beforeEach(async () => {
  team = await seedTeam();
  ({ key } = await createExtKey(team.user.id, team.ws.id, "Claude"));
});
afterEach(() => cleanupTeam(team));

async function read(args: Record<string, unknown>) {
  const { POST } = await import("@/app/mcp/route");
  const res = await POST(request("/mcp", { method: "POST", headers: bearer(key), body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "read_criterio", arguments: args } } }));
  return ((await res.json()) as { result: { content: { type?: string; text?: string }[] } }).result.content;
}

test("the file opens, under its title, with the references kept in Polish and what was said about them", async () => {
  const now = new Date(), ws = team.ws.id, p = `${team.tag}-p`;
  await db.insert(schema.project).values({ id: p, organizationId: ws, name: "Kept", createdAt: now, updatedAt: now });
  expect((await read({ project: p, section: "guide" }))[0].text).not.toContain("## What the team kept");

  const ids = await addItems(team, 3);
  await db.insert(schema.projectItem).values(ids.map((itemId, i) => ({ projectId: p, itemId, organizationId: ws, createdAt: new Date(now.getTime() + i) })));
  // The third came through Polish and was kept; an open vote on the first settles nothing yet
  await db.insert(schema.polishVote).values([
    { projectId: p, itemId: ids[2], userId: team.user.id, organizationId: ws, vote: "keep", updatedAt: now, closedAt: now, closedBy: team.user.id },
    { projectId: p, itemId: ids[0], userId: team.user.id, organizationId: ws, vote: "keep", updatedAt: now },
  ]);
  await addComment(team, ids[2], "The serif headline is the point");

  const md = (await read({ project: p, section: "guide" }))[0].text!;
  expect(md.startsWith("# ")).toBe(true);
  const kept = md.indexOf("## What the team kept");
  expect(kept).toBeGreaterThan(0);
  // Before every section of the file itself
  expect(md.slice(0, kept)).not.toMatch(/^## /m);
  expect(md).toContain("3 on its board, 1 of them kept in Polish");
  const inPolish = md.indexOf("### Kept in Polish"), rest = md.indexOf("### On the board, not polished yet");
  expect(inPolish).toBeGreaterThan(kept);
  expect(rest).toBeGreaterThan(inPolish);
  // Its code is the board's own (the third saved), though it is read first
  expect(md.slice(inPolish, rest)).toContain("**R3**");
  expect(md.slice(inPolish, rest)).toContain("The serif headline is the point");
  expect(md.slice(rest)).toContain("**R1**");

  // One area alone is the cheap read: it comes as it was
  expect((await read({ project: p, section: "color" }))[0].text).not.toContain("## What the team kept");
  expect((await read({ project: p, section: "decisions" }))[0].text).toContain("## What the team kept");
});
