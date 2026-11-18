// bring_context (lib/mcp/context.ts): an agent leaves everything it knows on a project in one call, and it goes in at
// once, with no yes asked in the app (lib/suggestions.ts takeIn). The same call again adds nothing twice; what was
// dismissed before stays out.
import { afterEach, beforeEach, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createExtKey } from "@/lib/ext-keys";
import { answerKey, listSuggestions, outlineKey } from "@/lib/suggestions";
import { loadBoard } from "@/lib/system/board";
import { bearer, request, withKeys } from "./isolation/probe";
import { cleanupTeam, seedTeam, type Team } from "./library/seed";

let team: Team, key: string;
beforeEach(async () => {
  team = await seedTeam();
  ({ key } = await createExtKey(team.user.id, team.ws.id, "Claude"));
});
afterEach(() => cleanupTeam(team));

async function raw(name: string, args: Record<string, unknown>) {
  const { POST } = await import("@/app/mcp/route");
  const res = await POST(request("/mcp", { method: "POST", headers: bearer(key), body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } } }));
  return (await res.json()) as { result: { isError?: boolean; content: { text: string }[] } };
}
const tool = async (name: string, args: Record<string, unknown>) => {
  const r = await raw(name, args);
  if (r.result.isError) throw new Error(r.result.content[0].text);
  return JSON.parse(r.result.content[0].text);
};
const site = (n: string) => `https://${team.tag}-${n}.example.com`;
const filed = async (projectId: string) => db.select({ itemId: schema.projectItem.itemId, role: schema.projectItem.role }).from(schema.projectItem).where(eq(schema.projectItem.projectId, projectId));

const dump = () => ({
  project: "Deneb", create: true, origin: "Prospecting chat in Claude, 9 Nov 2026",
  brief: "# Deneb\n\nSurgical navigation. The angle: show the robot working, not the brochure.",
  research: [{ title: "Market", text: "Three rivals own the category.", sources: [{ url: "https://press.example.com/a", took: "the figure" }] }],
  references: [
    { url: site("home"), role: "current-site", note: "Their site now" },
    { url: site("mako"), role: "competitor", note: "The one to stand apart from", areas: ["layout"] },
  ],
  answers: [
    { question: "goal", answer: "Book a demo" },
    { question: "audience", answer: "Spine surgeons", source: "read", from: site("home") },
  ],
  outline: { name: "Home", goal: "Book a demo", sections: [{ kind: "hero", job: "Shows the robot at work", refs: [site("mako")] }] },
  directions: [{ name: "Clinical", change: "Dense layout, data first", refs: [site("mako")] }],
  proposals: [{ area: "voice", decision: "Plain and clinical. No hype." }],
});

test("one call makes the project and everything goes in: references on the board, the agent's answers, the plan", async () => {
  const out = await withKeys(() => tool("bring_context", dump()));
  expect(out.brought.references).toMatchObject({ added: 4, updated: 0, failed: 0 });
  expect(out.brought.answers.saved).toBe(2);
  expect(out.brought.outline).toEqual({ name: "Home", directions: 1 });
  expect(out.brought.proposals).toBe(1);
  expect(out.proposals_waiting).toBe(1);

  // Filed with their role and the client's site; nothing waits for a yes
  const rows = await filed(out.id);
  expect(rows.map((r) => r.role).sort()).toEqual(["brief", "competitor", "current-site", "research"]);
  expect((await listSuggestions(team.ws.id)).filter((s) => s.projectId === out.id)).toEqual([]);
  const [p] = await db.select({ brief: schema.project.brief }).from(schema.project).where(eq(schema.project.id, out.id));
  const brief = p.brief as { clientItemId?: string; answers?: Record<string, { source?: string }> };
  expect(brief.clientItemId).toBe(rows.find((r) => r.role === "current-site")?.itemId);

  // The agent's own answer is the project's; what it read from the site still waits for the person's word
  expect(brief.answers?.goal.source).toBeUndefined();
  expect(out.setup.confirm).toEqual(["audience"]);
  expect(out.setup.ask).not.toContain("goal");
  const file = (await raw("read_criterio", { project: out.id })).result.content[0].text;
  expect(file).not.toContain("Draft by an agent, not accepted yet");
  expect(file).not.toContain("## Brought by an agent, waiting for the team");
  expect(file).toContain("**Clinical:** Dense layout, data first");
  // The pass reads a competitor as contrast, with no taste counted from it
  const board = await loadBoard(team.ws.id, out.id);
  const rival = board.refs.find((r) => String((r.ref as { role?: string }).role ?? "").startsWith("competitor"));
  expect(rival?.signals).toEqual({});
});

test("the same call again adds nothing twice, and updates what it brought", async () => {
  const first = await withKeys(() => tool("bring_context", dump()));
  const again = dump();
  again.references[1].note = "Stand apart: no white-coat stock photos";
  const second = await withKeys(() => tool("bring_context", { ...again, project: first.id }));
  expect(second.id).toBe(first.id);
  expect(second.brought.references).toMatchObject({ added: 0, updated: 4 });
  expect(await filed(first.id)).toHaveLength(4);
  const S = schema.projectSuggestion;
  const kept = await db.select({ note: S.note, state: S.state, role: S.role }).from(S).where(eq(S.projectId, first.id));
  expect(kept.map((r) => r.state)).toEqual(["accepted", "accepted", "accepted", "accepted"]);
  expect(kept.find((r) => r.role === "competitor")?.note).toBe("Stand apart: no white-coat stock photos");
  const outlines = (await db.select({ o: schema.projectSystem.outlines }).from(schema.projectSystem).where(eq(schema.projectSystem.projectId, first.id)))[0].o as unknown[];
  expect(outlines).toHaveLength(1);
});

test("one taken off the board goes back on when it is brought again", async () => {
  const out = await withKeys(() => tool("bring_context", dump()));
  const rival = (await filed(out.id)).find((r) => r.role === "competitor")!;
  await db.delete(schema.projectItem).where(and(eq(schema.projectItem.projectId, out.id), eq(schema.projectItem.itemId, rival.itemId)));
  await withKeys(() => tool("bring_context", { ...dump(), project: out.id }));
  expect((await filed(out.id)).map((r) => r.role).sort()).toEqual(["brief", "competitor", "current-site", "research"]);
});

test("what the team dismissed before is not brought back", async () => {
  const made = await tool("create_project", { name: "Deneb" });
  const S = schema.projectSuggestion, now = new Date();
  const row = (kind: string, key: string) => ({ id: `${team.tag}-${key}`, organizationId: team.ws.id, projectId: made.id, kind, key, state: "dismissed", createdAt: now, updatedAt: now });
  await db.insert(S).values([row("answer", answerKey("goal", "Book a demo")), row("outline", outlineKey("Home"))]);
  const out = await withKeys(() => tool("bring_context", { ...dump(), project: made.id }));
  expect(out.brought.answers).toEqual({ saved: 1, dismissed_before: 1 });
  expect(out.brought.outline).toEqual({ dismissed_before: true });
});

test("add_reference with suggested goes on the board too, and an agent's answer is the project's", async () => {
  const made = await tool("create_project", { name: "Acme" });
  const plain = await withKeys(() => tool("add_reference", { project: made.id, url: site("asked"), note: "asked for" }));
  expect(plain.already_in_library).toBeUndefined();
  expect((await filed(made.id)).map((r) => r.itemId)).toEqual([plain.id]);
  const brought = await withKeys(() => tool("add_reference", { project: made.id, url: site("brought"), suggested: true, role: "inspiration" }));
  expect(brought.brought).toBe("added");
  expect((await filed(made.id)).find((r) => r.itemId === brought.id)?.role).toBe("inspiration");
  const answer = await tool("answer_question", { project: made.id, question: "goal", answer: "Sign up", source: "agent" });
  expect(answer.setup.confirm).toEqual([]);
});
