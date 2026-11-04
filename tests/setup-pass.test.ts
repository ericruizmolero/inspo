import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createExtKey } from "@/lib/ext-keys";
import { SYSTEM_AREAS } from "@/types/system";
import { bearer, request } from "./isolation/probe";
import { cleanupTeam, seedTeam, type Team } from "./library/seed";

const asked: string[] = [];
vi.mock("@/lib/llm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/llm")>()),
  llmEnabled: () => true,
  llm: async (i: { text: string; model: string }) => {
    asked.push(i.text);
    return { text: JSON.stringify({ summary: "A studio that books demos.", areas: SYSTEM_AREAS.map((area) => ({ area, decision: "", why: "", confidence: 0, evidence: [], signals: [] })) }), model: i.model, usage: { input: 1, output: 1 }, costUsd: 0, ms: 1, provider: null, requestId: null, fallbackFrom: null, prompt: null };
  },
}));
vi.mock("@/lib/brand", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/brand")>()), runBrand: async () => {} }));

let team: Team, key: string;
beforeEach(async () => {
  asked.length = 0;
  team = await seedTeam();
  ({ key } = await createExtKey(team.user.id, team.ws.id, "Claude"));
});
afterEach(() => cleanupTeam(team));

async function tool(name: string, args: Record<string, unknown>) {
  const { POST } = await import("@/app/mcp/route");
  const res = await POST(request("/mcp", { method: "POST", headers: bearer(key), body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } } }));
  const body = (await res.json()) as { result: { content: { text: string }[] } };
  return JSON.parse(body.result.content[0].text);
}

test("skipping the brand and the references does not stop the setup: the answers write the file", async () => {
  await tool("create_project", { name: "Acme" });
  await tool("start_setup", { project: "Acme", skip: "source" });
  await tool("answer_question", { project: "Acme", question: "goal", answer: "Book a demo" });
  await tool("start_setup", { project: "Acme", skip: "references" });
  const pass = await tool("run_pass", { project: "Acme" });
  expect(pass.written).toBe(true);
  expect(pass.setup.complete).toBe(true);
  expect(pass.setup.next).toBe("direction");
  expect(asked[0]).toContain("Book a demo");
  expect(asked[0]).toContain("Invent no taste");
});

test("with nothing at all there is nothing to write, and the agent is told what to do", async () => {
  await tool("create_project", { name: "Empty" });
  const pass = await tool("run_pass", { project: "Empty" });
  expect(pass.written).toBe(false);
  expect(pass.status).toContain("Ask the person");
});

test("the setup talks as Tino, and tools never reach the person", async () => {
  const start = await tool("start_setup", {});
  expect(start.tino.voice).toContain("you are Tino");
  expect(start.tino.voice).toContain("Never mention tools");
});
