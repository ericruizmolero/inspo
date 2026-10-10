// The real embedItems and staleEmbedding (tests/setup.ts mocks them for every other file): given A's ids under
// B's workspace, they touch nothing of A's and call no model. The same call under A's workspace does both.
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { pool } from "@/lib/db";
import { UNIT_VECTOR } from "../harness";
import { cleanup, seed, type Fixture } from "./fixture";
import { itemRow, withKeys } from "./probe";

const { embedItems, staleEmbedding } = await vi.importActual<typeof import("@/lib/embed")>("@/lib/embed");

const embedded: unknown[] = [];
const OTHER_VECTOR = Array.from({ length: 1024 }, (_, i) => (i === 0 ? 1 : 0));
const outside = globalThis.fetch;

let fx: Fixture;
beforeAll(async () => {
  fx = await seed();
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!String(input).startsWith("https://openrouter.ai/api/v1/embeddings")) return outside(input, init);
    const { input: texts } = JSON.parse(String(init?.body)) as { input: string[] };
    embedded.push(texts);
    return Response.json({ data: texts.map(() => ({ embedding: OTHER_VECTOR })), usage: { prompt_tokens: 1 } });
  });
});
afterAll(async () => {
  vi.stubGlobal("fetch", outside);
  if (fx) await cleanup(fx.tag);
  await pool.end();
});
beforeEach(() => { embedded.length = 0; });

const vectorOf = async (id: string) => (await itemRow(id)).embedding;

test("B's workspace cannot embed A's item", async () => {
  expect(await withKeys(() => embedItems(fx.b.team, [fx.a.item]))).toBe(0);
  expect(embedded, "no model call for A's words").toEqual([]);
  expect(await vectorOf(fx.a.item)).toEqual(UNIT_VECTOR);

  expect(await withKeys(() => embedItems(fx.a.team, [fx.a.item]))).toBe(1);
  expect(embedded).toHaveLength(1);
  expect(await vectorOf(fx.a.item)).toEqual(OTHER_VECTOR);
});

test("B's workspace cannot clear A's item's vector", async () => {
  const before = await vectorOf(fx.a.item);
  expect(before).not.toBeNull();
  await staleEmbedding(fx.b.team, fx.a.item);
  expect(await vectorOf(fx.a.item)).toEqual(before);

  await staleEmbedding(fx.a.team, fx.a.item);
  expect(await vectorOf(fx.a.item)).toBeNull();
});
