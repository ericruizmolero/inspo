// bring_context (lib/mcp/context.ts): an agent leaves everything it knows on a project in one call, as suggestions
// the team answers in the app (lib/suggestions.ts). The same call again adds nothing twice; what was dismissed stays out.
import { afterEach, beforeEach, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createExtKey } from "@/lib/ext-keys";
import { acceptSuggestions, dismissSuggestions, listSuggestions } from "@/lib/suggestions";
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
const who = () => ({ id: team.user.id, name: team.user.name, email: team.user.email });
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

test("one call makes the project and leaves everything as suggestions: nothing on the board, nothing a rule", async () => {
  const out = await withKeys(() => tool("bring_context", dump()));
  expect(out.brought.references).toMatchObject({ suggested: 4, updated: 0, failed: 0 });
  expect(out.brought.answers.saved).toBe(2);
  expect(out.brought.outline).toMatchObject({ name: "Home", state: "draft", directions: 1 });
  expect(out.brought.proposals).toBe(1);

  // Nothing is filed: the pass and criterio.md read an empty board
  expect(await filed(out.id)).toEqual([]);
  expect((await loadBoard(team.ws.id, out.id)).refs).toEqual([]);
  const waiting = (await listSuggestions(team.ws.id)).filter((s) => s.projectId === out.id);
  expect(waiting.map((s) => s.role).sort()).toEqual(["brief", "competitor", "current-site", "research"]);
  expect(waiting.every((s) => s.origin === "Prospecting chat in Claude, 9 Nov 2026" && s.via === "Claude")).toBe(true);

  // The agent's answers wait to be confirmed and are not asked again; the plan reads as a draft
  expect(out.setup.confirm.sort()).toEqual(["audience", "goal"]);
  expect(out.setup.ask).not.toContain("goal");
  expect(out.setup.do).toContain("4 references an agent brought wait");
  const file = (await raw("read_criterio", { project: out.id })).result.content[0].text;
  expect(file).toContain("Draft by an agent, not accepted yet");
  expect(file).toContain("**Clinical:** Dense layout, data first");
  expect(file).toContain("## Brought by an agent, waiting for the team");
  expect(file).toContain("The angle: show the robot working");
});

test("the same call again adds nothing twice, and updates what waits", async () => {
  const first = await withKeys(() => tool("bring_context", dump()));
  const again = dump();
  again.references[1].note = "Stand apart: no white-coat stock photos";
  const second = await withKeys(() => tool("bring_context", { ...again, project: first.id }));
  expect(second.id).toBe(first.id);
  expect(second.brought.references).toMatchObject({ suggested: 0, updated: 4 });
  const waiting = (await listSuggestions(team.ws.id)).filter((s) => s.projectId === first.id);
  expect(waiting).toHaveLength(4);
  expect(waiting.find((s) => s.role === "competitor")?.note).toBe("Stand apart: no white-coat stock photos");
  const outlines = (await db.select({ o: schema.projectSystem.outlines }).from(schema.projectSystem).where(eq(schema.projectSystem.projectId, first.id)))[0].o as unknown[];
  expect(outlines).toHaveLength(1);
});

test("accepting files the references with their role and the client's site; the answers become the person's", async () => {
  const out = await withKeys(() => tool("bring_context", dump()));
  const took = await acceptSuggestions(team.ws.id, out.id, { all: true }, who());
  expect(took).toEqual({ refs: 4, answers: 2, outlines: 1 });
  const rows = await filed(out.id);
  expect(rows.map((r) => r.role).sort()).toEqual(["brief", "competitor", "current-site", "research"]);
  expect((await listSuggestions(team.ws.id)).filter((s) => s.projectId === out.id)).toEqual([]);
  const [p] = await db.select({ brief: schema.project.brief }).from(schema.project).where(eq(schema.project.id, out.id));
  const brief = p.brief as { clientItemId?: string; answers?: Record<string, { source?: string }> };
  expect(brief.clientItemId).toBe(rows.find((r) => r.role === "current-site")?.itemId);
  expect(Object.values(brief.answers ?? {}).every((a) => !a.source)).toBe(true);
  // The pass reads a competitor as contrast, with no taste counted from it
  const board = await loadBoard(team.ws.id, out.id);
  const rival = board.refs.find((r) => String((r.ref as { role?: string }).role ?? "").startsWith("competitor"));
  expect(rival?.signals).toEqual({});
  const start = await tool("start_setup", { project: out.id });
  expect(start.confirm).toEqual([]);
});

test("what the team dismissed leaves the library and is not brought back", async () => {
  const out = await withKeys(() => tool("bring_context", dump()));
  await dismissSuggestions(team.ws.id, out.id, { all: true }, who());
  const left = await db.select({ id: schema.inspoItem.id }).from(schema.inspoItem).where(and(eq(schema.inspoItem.organizationId, team.ws.id)));
  expect(left).toEqual([]);
  const again = await withKeys(() => tool("bring_context", { ...dump(), project: out.id }));
  expect(again.brought.references).toMatchObject({ suggested: 0, dismissed: 4 });
  expect(again.brought.answers).toEqual({ saved: 0, dismissed_before: 2 });
  expect(again.brought.outline).toEqual({ dismissed_before: true });
});

test("add_reference keeps its old answer, and with suggested the reference waits", async () => {
  const made = await tool("create_project", { name: "Acme" });
  const plain = await withKeys(() => tool("add_reference", { project: made.id, url: site("asked"), note: "asked for" }));
  expect(plain.already_in_library).toBeUndefined();
  expect((await filed(made.id)).map((r) => r.itemId)).toEqual([plain.id]);
  const brought = await withKeys(() => tool("add_reference", { project: made.id, url: site("brought"), suggested: true, role: "inspiration" }));
  expect(brought.brought).toBe("suggested");
  expect(await filed(made.id)).toHaveLength(1);
  const answer = await tool("answer_question", { project: made.id, question: "goal", answer: "Sign up", source: "agent" });
  expect(answer.setup.confirm).toEqual(["goal"]);
});
