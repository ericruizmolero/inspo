// Retry and fallback check for lib/llm.ts, with OpenRouter stubbed: no call leaves the machine.
// A dropped call is tried once more, an unfinished one goes to the fallback model, a refused account goes nowhere,
// and the usage row says when the fallback answered and which prompt version asked. Writes to the LOCAL database and cleans up what it creates.
//   npm run check:llm
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { and, eq, gte, like, or } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { runMigrations } from "../lib/db/migrate";
import { FALLBACK_MODEL, llm, LlmError } from "../lib/llm";
import { billOf, recordUsage } from "../lib/usage";
import { prompt, promptId } from "../lib/prompts";

const TAG = `llmcheck-${crypto.randomUUID().slice(0, 8)}`;
const MODEL = `${TAG}/model`;

type Reply = { status: number; finish?: string; cost?: number } | "network";
let calls: string[] = [];

/** OpenRouter answers each call with the next reply in line */
function stub(...replies: Reply[]) {
  calls = [];
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    calls.push(JSON.parse(init.body).model);
    const r = replies.shift();
    if (!r) throw new Error("more calls than replies");
    if (r === "network") throw new TypeError("fetch failed");
    const body = r.status === 200
      ? { id: `gen-${calls.length}`, model: calls.at(-1), provider: "Stub", choices: [{ finish_reason: r.finish ?? "stop", message: { content: "{}" } }], usage: { prompt_tokens: 10, completion_tokens: 5, cost: r.cost ?? 0.001 } }
      : { error: { message: `stub ${r.status}` } };
    return new Response(JSON.stringify(body), { status: r.status });
  }) as typeof fetch;
}

const ask = (fallback?: string | null) => llm({ model: MODEL, system: "s", text: "t", maxTokens: 10, fallback });

async function main() {
  if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/criterio")) throw new Error("check:llm only runs against the local database");
  process.env.OPENROUTER_API_KEY ||= "stub";
  await runMigrations();
  const start = new Date();
  const realFetch = globalThis.fetch;
  try {
    stub({ status: 500 }, { status: 200 });
    let r = await ask();
    assert.deepEqual(calls, [MODEL, MODEL], "a dropped call is tried once more on the same model");
    assert.equal(r.fallbackFrom, null, "the model answered itself");

    stub("network", { status: 200 });
    r = await ask();
    assert.deepEqual(calls, [MODEL, MODEL], "a lost connection is tried once more too");

    stub({ status: 200, finish: "length", cost: 0.002 }, { status: 200, cost: 0.001 });
    r = await ask();
    assert.deepEqual(calls, [MODEL, FALLBACK_MODEL], "an unfinished answer goes straight to the fallback");
    assert.equal(r.fallbackFrom, MODEL, "the result names the model that failed");
    assert.equal(r.model, FALLBACK_MODEL);
    assert.equal(r.costUsd?.toFixed(3), "0.003", "the unfinished answer's bill is added to the one that answered");

    stub({ status: 503 }, { status: 429 }, { status: 200 });
    r = await ask();
    assert.deepEqual(calls, [MODEL, MODEL, FALLBACK_MODEL], "dropped twice: the fallback answers");
    assert.equal(r.fallbackFrom, MODEL);

    stub({ status: 401 });
    await assert.rejects(ask(), (e) => e instanceof LlmError && e.status === 401, "a refused key is not retried");
    assert.deepEqual(calls, [MODEL]);

    stub({ status: 200, finish: "length" });
    await assert.rejects(ask(null), (e) => e instanceof LlmError && e.finishReason === "length", "with no fallback the failure reaches the caller");
    assert.deepEqual(calls, [MODEL]);

    stub({ status: 500 }, { status: 500 }, { status: 500 });
    await assert.rejects(ask(), (e) => e instanceof LlmError && e.status === 500, "when everything fails, the last failure is thrown");
    assert.equal(calls.length, 3);
  } finally {
    globalThis.fetch = realFetch;
  }

  const org = { id: TAG };
  await db.insert(schema.organization).values({ id: TAG, name: "check", slug: TAG, createdAt: new Date() });
  stub({ status: 200, finish: "length" }, { status: 200 });
  const r = await llm({ ...prompt("brand", { system: "s", text: "t" }), model: MODEL, fallback: FALLBACK_MODEL });
  globalThis.fetch = realFetch;
  await recordUsage({ organizationId: org.id }, { action: "system", ...billOf(r), ref: TAG });
  const [row] = await db.select().from(schema.aiUsage).where(eq(schema.aiUsage.ref, TAG));
  assert.equal(row?.fallbackFrom, MODEL, "ai_usage says the fallback answered, and for which model");
  assert.equal(row?.model, FALLBACK_MODEL);
  assert.equal(row?.promptVersion, promptId("brand"), "ai_usage says which prompt version made the call");

  await db.delete(schema.organization).where(eq(schema.organization.id, TAG));
  // Give the failure rows recordFailure writes without waiting a moment to land, then drop them
  await new Promise((res) => setTimeout(res, 500));
  await db.delete(schema.failure).where(and(gte(schema.failure.createdAt, start), or(like(schema.failure.what, `${TAG}%`), eq(schema.failure.what, FALLBACK_MODEL))));
  console.log("check:llm ok");
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
