// Every route open to a key, a token or nobody at all answers 429 once its limit is spent, and the limit holds across
// instances: each route is loaded twice with the module registry reset in between, and the requests alternate
// between the two copies, which share only the database.
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { db } from "@/lib/db";
import { createExtKey } from "@/lib/ext-keys";
import { bearer, request } from "./isolation/probe";
import { cleanupTeam, seedTeam, type Team } from "./library/seed";

type Handler = (req: Request) => Promise<Response>;

/** The route's handler twice, each copy with a memory of its own, as two instances have */
async function twice(load: () => Promise<Handler>): Promise<[Handler, Handler]> {
  vi.resetModules();
  const a = await load();
  vi.resetModules();
  return [a, await load()];
}

/** Sends `n` requests, alternating between the two instances, and returns their statuses */
async function hit([a, b]: [Handler, Handler], n: number, make: () => Request): Promise<number[]> {
  const out = [];
  for (let i = 0; i < n; i++) out.push((await (i % 2 ? b : a)(make())).status);
  return out;
}

const only = (statuses: number[], status: number) => statuses.every((s) => s === status);

let team: Team;
let key: string;
const ip = `203.0.113.${randomBytes(1)[0]}-${randomBytes(4).toString("hex")}`;

beforeAll(async () => {
  team = await seedTeam();
  ({ key } = await createExtKey(team.user.id, team.ws.id, "limits"));
});

afterAll(async () => {
  await db.execute(sql`delete from rate_limit where key like ${`app:%${team.tag}%`} or key like ${`app:oauth:%:${ip}`}`);
  await cleanupTeam(team);
});

test("an extension key makes 120 requests a minute and the next is a 429 with Retry-After", async () => {
  const me = await twice(async () => (await import("@/app/api/ext/v1/me/route")).GET);
  expect(only(await hit(me, 120, () => request("/api/ext/v1/me", { headers: bearer(key) })), 200), "120 within the limit").toBe(true);
  const over = await me[0](request("/api/ext/v1/me", { headers: bearer(key) }));
  expect(over.status, "the 121st is refused").toBe(429);
  expect(over.headers.get("Retry-After")).toBe("60");
});

test("a workspace takes 300 requests a minute from all its keys together", async () => {
  // The first key spent 121 above; two more keys bring the workspace past 300
  const keys = [(await createExtKey(team.user.id, team.ws.id, "second")).key, (await createExtKey(team.user.id, team.ws.id, "third")).key];
  const me = await twice(async () => (await import("@/app/api/ext/v1/me/route")).GET);
  expect(only(await hit(me, 110, () => request("/api/ext/v1/me", { headers: bearer(keys[0]) })), 200), "the second key, within the workspace's limit").toBe(true);
  const third = await hit(me, 80, () => request("/api/ext/v1/me", { headers: bearer(keys[1]) }));
  expect(third.filter((s) => s === 200).length, "the workspace stops at 300, whatever key asks").toBe(300 - 121 - 110);
  expect(third.at(-1)).toBe(429);
});

test("a workspace sends 30 import batches a minute", async () => {
  const other = await seedTeam();
  try {
    const { key: k } = await createExtKey(other.user.id, other.ws.id, "import");
    const batch = await twice(async () => (await import("@/app/api/ext/v1/items/batch/route")).POST as Handler);
    const send = () => request("/api/ext/v1/items/batch", { method: "POST", headers: bearer(k), body: { items: [] } });
    expect(only(await hit(batch, 30, send), 200), "30 batches within the limit").toBe(true);
    expect((await batch[1](send())).status, "the 31st is refused").toBe(429);
  } finally {
    await db.execute(sql`delete from rate_limit where key like ${`app:%${other.tag}%`}`);
    await cleanupTeam(other);
  }
});

test("a person makes 40 MCP writes a minute, told as a tool error, and 120 requests, then a 429", async () => {
  const other = await seedTeam();
  try {
    const { key: k } = await createExtKey(other.user.id, other.ws.id, "mcp");
    const mcp = await twice(async () => (await import("@/app/mcp/route")).POST);
    const rpc = (method: string, params: Record<string, unknown> = {}) => () =>
      request("/mcp", { method: "POST", headers: bearer(k), body: { jsonrpc: "2.0", id: 1, method, params } });
    // Arguments that are not right still count: the limit is checked first
    const write = rpc("tools/call", { name: "create_project", arguments: {} });
    const said = async (i: number) => ((await (await (i % 2 ? mcp[1] : mcp[0])(write())).json()) as { result: { content: { text: string }[] } }).result.content[0].text;
    for (let i = 0; i < 40; i++) expect(await said(i), "a write within the limit reaches the tool").toMatch(/arguments are not right/);
    expect(await said(40), "the 41st write is refused").toMatch(/Too many changes/);

    expect(only(await hit(mcp, 120 - 41, rpc("ping")), 200), "requests within the limit").toBe(true);
    const over = await mcp[1](rpc("ping")());
    expect(over.status, "the 121st request is refused").toBe(429);
    expect(over.headers.get("Retry-After")).toBe("60");
  } finally {
    await db.execute(sql`delete from rate_limit where key like ${`app:%${other.tag}%`}`);
    await cleanupTeam(other);
  }
});

test("one address registers 60 OAuth clients an hour and asks the token endpoint 120 times a minute", async () => {
  const register = await twice(async () => (await import("@/app/api/mcp/register/route")).POST);
  const reg = () => new Request("http://localhost/api/mcp/register", { method: "POST", headers: { "x-forwarded-for": `${ip}, 10.0.0.1` }, body: "not json" });
  expect(only(await hit(register, 60, reg), 400), "60 registrations reach the handler").toBe(true);
  expect((await register[0](reg())).status, "the 61st is refused").toBe(429);

  const token = await twice(async () => (await import("@/app/api/mcp/token/route")).POST);
  const tok = () => new Request("http://localhost/api/mcp/token", { method: "POST", headers: { "x-forwarded-for": ip }, body: "grant_type=password" });
  expect(only(await hit(token, 120, tok), 400), "120 token requests reach the handler").toBe(true);
  expect((await token[1](tok())).status, "the 121st is refused").toBe(429);
});
