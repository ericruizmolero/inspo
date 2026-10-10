// The brief drafts itself (#128): a draft never writes over what the team wrote, a drafted field is replaced by the
// next draft, and Color and Voice ask for their brief field once. The model and the client's site are the edge: the
// model answers a fixed draft, and any other call to it fails the test.
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import type { LlmInput } from "@/lib/llm";
import type { BriefDraft } from "@/lib/brief-draft";

const answer = vi.hoisted(() => ({ draft: null as unknown }));
vi.mock("@/lib/llm", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  llmEnabled: () => true,
  llm: async (i: LlmInput) => {
    if (i.prompt?.startsWith("brief@")) return { text: JSON.stringify(answer.draft), model: i.model, provider: null, id: null, usage: { input: 1, output: 1, cacheRead: 0, reasoning: 0 }, costUsd: 0, ms: 1, fallbackFrom: null, prompt: i.prompt };
    throw new Error(`model called for ${i.prompt}`);
  },
}));
vi.mock("@/lib/extract", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchSiteText: async () => ({ title: "Casa Barro", description: "Cerámica hecha a mano", siteName: "Casa Barro", lang: "es", headings: ["Barro y fuego"], textSample: "Cerámica para restaurantes.", hreflang: ["es-ES", "en-GB"], currencies: ["EUR"], signals: { themeColor: null, fonts: [], colors: [], hasCanvas: false, hasVideo: false, imageCount: 0, platform: null } }),
}));

const { db, pool, schema } = await import("@/lib/db");
const { draftBrief, mergeDraft } = await import("@/lib/brief-draft");
const { saveBrief } = await import("@/lib/brief");
const { startAreaAsk } = await import("@/lib/system");
const { readBrief } = await import("@/types/brief");
const { addItems, cleanupTeam, seedTeam } = await import("./library/seed");

type Team = Awaited<ReturnType<typeof seedTeam>>;
let team: Team;
let project: string;
beforeAll(async () => {
  team = await seedTeam();
  const [client] = await addItems(team, 1);
  project = `${team.tag}-p`;
  const now = new Date();
  await db.insert(schema.project).values({ id: project, organizationId: team.ws.id, name: "p", createdBy: team.user.id, createdAt: now, updatedAt: now, brief: { about: "Cerámica para restaurantes", clientItemId: client } });
});
afterAll(async () => { if (team) await cleanupTeam(team); await pool.end(); });

const draft = (o: Partial<BriefDraft> = {}): BriefDraft => ({
  sector: "ecommerce", product: { what: "Cerámica hecha a mano", price: "premium" }, markets: ["es-ES"],
  traits: ["sobria", "cálida", "artesana"], keep: ["logo"], voiceSamples: ["Barro y fuego"], ...o,
});
const stored = async () => {
  const [row] = await db.select({ brief: schema.project.brief }).from(schema.project).where(and(eq(schema.project.organizationId, team.ws.id), eq(schema.project.id, project)));
  const { updatedAt: _, ...b } = readBrief(row.brief)!;
  return b;
};
const ctx = () => ({ workspace: { ...team.ws, outputLanguage: "es" as const }, user: team.user });

test("mergeDraft leaves a team-written field alone, replaces a drafted one and says which fields are drafted", () => {
  const current = { ...readBrief({})!, traits: ["exacta", "callada", "rara"], markets: ["en-GB"], drafted: ["markets" as const] };
  const patch = mergeDraft(current, draft({ markets: ["es-ES"], keep: [], voiceSamples: [] }));
  expect(patch).not.toHaveProperty("traits");
  expect(patch.markets).toEqual(["es-ES"]);
  expect(patch.product).toEqual({ what: "Cerámica hecha a mano", price: "premium" });
  expect(patch.drafted).toEqual(["sector", "product", "markets"]);
  // A drafted field the next draft finds nothing for is emptied and is no longer a draft
  const again = mergeDraft({ ...current, ...patch } as typeof current, draft({ markets: [], keep: [], voiceSamples: [] }));
  expect(again.markets).toEqual([]);
  expect(again.drafted).toEqual(["sector", "product"]);
});

test("a draft fills the empty fields, a re-draft keeps what the team wrote and replaces the rest, and running it twice changes nothing", async () => {
  answer.draft = draft();
  await draftBrief(ctx(), project);
  const first = await stored();
  expect(first.traits).toEqual(["sobria", "cálida", "artesana"]);
  expect(first.drafted).toEqual(["sector", "product", "markets", "traits", "keep", "voiceSamples"]);
  expect(first.about).toBe("Cerámica para restaurantes");

  await saveBrief(team.ws.id, project, { traits: ["exacta", "callada", "rara"] }, team.user.id);
  answer.draft = draft({ markets: ["es-ES", "en-GB"], traits: ["otra", "cosa", "distinta"] });
  await draftBrief(ctx(), project);
  const second = await stored();
  expect(second.traits).toEqual(["exacta", "callada", "rara"]);
  expect(second.markets).toEqual(["es-ES", "en-GB"]);
  expect(second.drafted).toEqual(["sector", "product", "markets", "keep", "voiceSamples"]);

  await draftBrief(ctx(), project);
  expect(await stored()).toEqual(second);
});

test("Color asks for the accessibility level and Voice for what the brand never says while each is empty, and never once set", async () => {
  const color = await startAreaAsk({ organizationId: team.ws.id, projectId: project, area: "color", usage: { organizationId: team.ws.id } });
  expect(color.brief).toBe("a11y");
  expect(color.options.map((o) => o.decision)).toEqual(["AA", "AAA"]);
  const voice = await startAreaAsk({ organizationId: team.ws.id, projectId: project, area: "voice", usage: { organizationId: team.ws.id } });
  expect(voice).toMatchObject({ brief: "neverSay", options: [] });

  await saveBrief(team.ws.id, project, { a11y: "AAA", neverSay: "Barato" }, team.user.id);
  await expect(startAreaAsk({ organizationId: team.ws.id, projectId: project, area: "color", usage: { organizationId: team.ws.id } })).rejects.toThrow("model called for start@");
  await expect(startAreaAsk({ organizationId: team.ws.id, projectId: project, area: "voice", usage: { organizationId: team.ws.id } })).rejects.toThrow("model called for start@");
});
