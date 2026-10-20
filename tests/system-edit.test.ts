// "Tell Tino what to change" (lib/system/edit.ts): a change in words comes back as the areas it touches, each with
// Tino's reason, and nothing is written into an area. The model is the edge: it answers a fixed set of edits, and
// records what it was asked so the test can see the instruction and the file reached it.
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import type { LlmInput } from "@/lib/llm";

const model = vi.hoisted(() => ({ text: "", edits: [] as unknown[] }));
vi.mock("@/lib/llm", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  llmEnabled: () => true,
  llm: async (i: LlmInput) => {
    if (!i.prompt?.startsWith("edit@")) throw new Error(`model called for ${i.prompt}`);
    model.text = String(i.text);
    return { text: JSON.stringify({ edits: model.edits }), model: i.model, provider: null, id: null, usage: { input: 1, output: 1, cacheRead: 0, reasoning: 0 }, costUsd: 0, ms: 1, fallbackFrom: null, prompt: i.prompt };
  },
}));

const { pool } = await import("@/lib/db");
const { editFile } = await import("@/lib/system/edit");
const { decideArea, getSystem } = await import("@/lib/system/areas");
const { cleanup, seed } = await import("./isolation/fixture");

let fx: Awaited<ReturnType<typeof seed>>;
beforeAll(async () => {
  fx = await seed();
  await decideArea(fx.a.team, fx.a.project, "typography", { decision: "Text in Geist 400." }, { id: fx.a.owner.id, name: fx.a.owner.name });
});
afterAll(async () => {
  if (fx) await cleanup(fx.tag);
  await pool.end();
});

const ask = (instruction: string, organizationId = fx.a.team) =>
  editFile({ organizationId, projectId: fx.a.project, instruction, usage: { organizationId: fx.a.team, userId: fx.a.owner.id }, locale: "en", origin: "http://127.0.0.1" });

test("the areas the change touches come back rewritten with Tino's reason, once each, and no area is written", async () => {
  model.edits = [
    { area: "typography", decision: "  Text in Geist 500,\n no bold in running text. ", why: "Set by the team.", never: ["- Bold in body copy", "", "* Weights under 400"], reason: "You set text to 500.\nThis file still says 400." },
    { area: "typography", decision: "A second take on the same area", why: "", never: [], reason: "Again." },
    { area: "color", decision: "", why: "", never: [], reason: "Nothing to say." },
  ];
  const out = await ask("text at 500, no bold");
  expect(out).toEqual([{ area: "typography", decision: "Text in Geist 500,\nno bold in running text.", why: "Set by the team.", never: "Bold in body copy\nWeights under 400", reason: "You set text to 500. This file still says 400." }]);
  expect(model.text, "the model reads the instruction").toContain('"text at 500, no bold"');
  expect(model.text, "and the areas as written").toContain("Text in Geist 400.");
  expect(model.text, "and the file").toContain("criterio.md");
  const area = (await getSystem(fx.a.team, fx.a.project)).areas.find((a) => a.area === "typography");
  expect(area?.decision, "nothing is written: it waits as a proposal").toBe("Text in Geist 400.");
});

test("a change the file already follows proposes nothing", async () => {
  model.edits = [{ area: "typography", decision: "Text in Geist 400.", why: "", never: [], reason: "Same as now." }];
  expect(await ask("text in Geist 400")).toEqual([]);
});

test("no instruction is a bad request, and another workspace's project is not found", async () => {
  await expect(ask("   ")).rejects.toMatchObject({ status: 400 });
  await expect(ask("text at 500", fx.b.team)).rejects.toMatchObject({ status: 404 });
});
