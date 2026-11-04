import { afterEach, beforeEach, expect, test } from "vitest";
import { createExtKey } from "@/lib/ext-keys";
import { bearer, request } from "./isolation/probe";
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
const tool = async (name: string, args: Record<string, unknown>) => JSON.parse((await raw(name, args)).result.content[0].text);

test("an agent walks the setup by asking what comes next, and resumes where it stopped", async () => {
  const made = await tool("create_project", { name: "Acme" });
  expect(made.setup.next).toBe("source");

  const skipped = await tool("start_setup", { project: "Acme", skip: "source" });
  expect(skipped.next).toBe("questions");
  expect(skipped.ask[0]).toBe("goal");

  const read = await tool("answer_question", { project: "Acme", question: "goal", answer: "Book a demo", source: "read", from: "https://acme.test" });
  expect(read.setup.next).toBe("questions");
  expect(read.setup.confirm).toEqual(["goal"]);

  const confirmed = await tool("answer_question", { project: "Acme", question: "goal", answer: "Book a demo" });
  expect(confirmed.setup.next).toBe("references");
  expect(confirmed.setup.confirm).toEqual([]);

  const resumed = await tool("start_setup", { project: "Acme" });
  expect(resumed.next).toBe("references");

  const on = await tool("start_setup", { project: "Acme", skip: "references" });
  expect(on.next).toBe("criterio");
  expect(on.complete).toBe(false);

  const empty = await tool("run_pass", { project: "Acme" });
  expect(empty.written).toBe(false);
  expect(empty.status).toContain("nothing to read");
});

test("the file says when the setup is open", async () => {
  await tool("create_project", { name: "Acme" });
  expect((await raw("read_criterio", { project: "Acme", section: "guide" })).result.content[0].text).toContain("start_setup");
});

test("a required step cannot be skipped", async () => {
  await tool("create_project", { name: "Acme" });
  expect((await raw("start_setup", { project: "Acme", skip: "questions" })).result.isError).toBe(true);
});
