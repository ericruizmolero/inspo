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

test("a pick closes the direction, a built outline closes the landing, and the plan is in the file", async () => {
  await tool("create_project", { name: "Acme" });
  await tool("start_setup", { project: "Acme", skip: "source" });
  await tool("start_setup", { project: "Acme", skip: "references" });
  await tool("answer_question", { project: "Acme", question: "goal", answer: "Book a demo" });

  const pick = await tool("record_learning", { project: "Acme", note: "Version B: the headline names the problem. A hid the action.", section: "hero", pick: true });
  expect(pick.setup.steps.find((s: { key: string }) => s.key === "direction").state).toBe("done");

  const sections = [{ kind: "hero", job: "Says the problem and asks for the demo", cta: "Book a demo" }, { kind: "testimonials", job: "Removes the doubt that it works", proof: "Three named clients" }];
  const first = await tool("set_outline", { project: "Acme", name: "Home", goal: "Book a demo", sections });
  expect(first.setup.steps.find((s: { key: string }) => s.key === "landing").state).toBe("open");
  await tool("set_outline", { project: "Acme", name: "Campaign", goal: "Join the list", sections: [sections[0]] });
  const done = await tool("set_outline", { project: "Acme", name: "home", goal: "Book a demo", sections, built: { url: "https://acme.test" } });
  expect(done.setup.steps.find((s: { key: string }) => s.key === "landing").state).toBe("done");

  const file = (await raw("read_criterio", { project: "Acme", section: "guide" })).result.content[0].text;
  expect(file).toContain("Book a demo");
  expect(file).toContain("Join the list");
  expect(file.match(/### home/gi)?.length, "the same name replaces, whatever the case").toBe(1);
  expect(file).toContain("**testimonials:** Removes the doubt that it works");
});

test("a new file carries the copy add-on, written from the person's answers and corrections", async () => {
  await tool("create_project", { name: "Acme" });
  await tool("answer_question", { project: "Acme", question: "audience", answer: "Heads of finance at mid-size firms" });
  await tool("answer_question", { project: "Acme", question: "proof", answer: "Forty clients in Spain" });
  await tool("record_learning", { project: "Acme", note: "Prices always with VAT", area: "voice", section: "pricing" });
  const file = (await raw("read_criterio", { project: "Acme" })).result.content[0].text;
  expect(file).toContain("Heads of finance at mid-size firms");
  expect(file).toContain("Forty clients in Spain");
  expect(file).toContain("(pricing) Prices always with VAT");
  expect(file).toContain("[proof needed: what]");
  expect(file).toContain("portability test");
});

test("setup starts with the drawing and hands over the repo's line", async () => {
  const first = await tool("start_setup", {});
  expect(first.tino.drawing).toContain("████████");
  await tool("create_project", { name: "Acme" });
  const known = await tool("start_setup", { project: "Acme" });
  expect(known.repo_line.line).toBe("criterio project: Acme");
  expect(known.tino.drawing, "a project that already exists gets him too").toContain("████████");
});

test("the setup is one prompt away, in the person's language", async () => {
  const { promptGet } = await import("@/lib/mcp/prompts");
  expect(promptGet("setup_project", {}, "es")!.messages[0].content.text).toContain("start_setup");
  expect(promptGet("setup_project", {}, "en")!.messages[0].content.text).toContain("start_setup");
});

test("start_setup points to Tino's page, and only his ears move", async () => {
  const { POST } = await import("@/app/mcp/route");
  const rpc = async (method: string, params: Record<string, unknown>) => (await (await POST(request("/mcp", { method: "POST", headers: bearer(key), body: { jsonrpc: "2.0", id: 1, method, params } }))).json()) as { result: Record<string, never> };
  const { result: tools } = await rpc("tools/list", {});
  const start = (tools.tools as unknown as { name: string; _meta?: { ui?: { resourceUri?: string } } }[]).find((t) => t.name === "start_setup")!;
  expect(start._meta?.ui?.resourceUri).toBe("ui://criterio/tino.html");
  const { result: read } = await rpc("resources/read", { uri: "ui://criterio/tino.html" });
  const [content] = read.contents as unknown as { mimeType: string; text: string }[];
  expect(content.mimeType).toBe("text/html;profile=mcp-app");
  expect(content.text.match(/class="ear"/g)).toHaveLength(2);
  expect(content.text).toContain("prefers-reduced-motion");
  expect(content.text).not.toMatch(/\.visor\{[^}]*animation/);
});

test("a section kind outside the vocabulary is refused", async () => {
  await tool("create_project", { name: "Acme" });
  expect((await raw("set_outline", { project: "Acme", name: "Home", goal: "x", sections: [{ kind: "banner", job: "x" }] })).result.isError).toBe(true);
});

test("the file says when the setup is open", async () => {
  await tool("create_project", { name: "Acme" });
  expect((await raw("read_criterio", { project: "Acme", section: "guide" })).result.content[0].text).toContain("start_setup");
});

test("a required step cannot be skipped", async () => {
  await tool("create_project", { name: "Acme" });
  expect((await raw("start_setup", { project: "Acme", skip: "questions" })).result.isError).toBe(true);
});
