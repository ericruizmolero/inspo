import { afterEach, beforeEach, expect, test } from "vitest";
import { db, schema } from "@/lib/db";
import { createExtKey } from "@/lib/ext-keys";
import { bearer, request } from "./isolation/probe";
import { cleanupTeam, seedTeam, type Team } from "./library/seed";

let team: Team, project: string, key: string;
beforeEach(async () => {
  team = await seedTeam();
  project = `${team.tag}-project`;
  const now = new Date();
  await db.insert(schema.project).values({ id: project, organizationId: team.ws.id, name: "Acme", createdBy: team.user.id, createdAt: now, updatedAt: now });
  ({ key } = await createExtKey(team.user.id, team.ws.id, "Chrome"));
});
afterEach(() => cleanupTeam(team));

const post = async (body: Record<string, unknown>) => {
  const { POST } = await import("@/app/api/ext/v1/comments/route");
  return POST(request("/api/ext/v1/comments", { method: "POST", headers: bearer(key), body }));
};
async function tool(name: string, args: Record<string, unknown>) {
  const { POST } = await import("@/app/mcp/route");
  const res = await POST(request("/mcp", { method: "POST", headers: bearer(key), body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } } }));
  return JSON.parse(((await res.json()) as { result: { content: { text: string }[] } }).result.content[0].text);
}

test("a comment from the page reaches the agent, and resolving it takes it off the list", async () => {
  const res = await post({ projectId: project, url: "http://localhost:3000/", selector: "section > h1", section: "The hero", text: "Book a call", viewport: "1440x900", comment: "The headline hides the offer" });
  expect(res.status).toBe(201);
  const { id } = await res.json();

  const open = await tool("list_comments", { project: "Acme" });
  expect(open.comments).toHaveLength(1);
  expect(open.comments[0]).toMatchObject({ id, said: "The headline hides the offer", url: "http://localhost:3000/", selector: "section > h1", section: "The hero", state: "open", via: "Extension" });

  expect((await tool("start_setup", { project: "Acme" })).waiting.open_comments).toBe(1);

  await tool("resolve_comment", { project: "Acme", id, change: "Headline names the offer" });
  expect((await tool("list_comments", { project: "Acme" })).comments).toEqual([]);
  expect((await tool("list_comments", { project: "Acme", all: true })).comments[0]).toMatchObject({ state: "resolved", resolution: "Headline names the offer" });
});

test("a comment with no address or no words is refused", async () => {
  expect((await post({ projectId: project, url: "file:///etc/passwd", selector: "h1", comment: "x" })).status).toBeGreaterThanOrEqual(400);
  expect((await post({ projectId: project, url: "https://a.test", selector: "h1", comment: "  " })).status).toBe(400);
});

test("page comments stay out of criterio.md", async () => {
  await post({ projectId: project, url: "https://a.test", selector: "h1", comment: "PRIVATE-NOTE" });
  const { POST } = await import("@/app/mcp/route");
  const res = await POST(request("/mcp", { method: "POST", headers: bearer(key), body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "read_criterio", arguments: { project: "Acme" } } } }));
  const file = JSON.stringify(await res.json());
  expect(file).toContain("criterio.md");
  expect(file).not.toContain("PRIVATE-NOTE");
});
