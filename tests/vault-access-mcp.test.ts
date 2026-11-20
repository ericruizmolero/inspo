// The Vault's code through the connector follows the plan of the caller's workspace (types/vault.ts canReadVault):
// on Free, read_vault gives a paid piece without its code, and search_vault marks it locked. A paid plan and a
// partner read every piece. The app's listing says how much the active workspace reads.
import { afterEach, beforeEach, expect, test } from "vitest";
import { eq, like } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createExtKey } from "@/lib/ext-keys";
import type { PlanKey } from "@/lib/plans";
import { actAs } from "./harness";
import { bearer, request } from "./isolation/probe";
import { cleanupTeam, seedTeam, type Team } from "./library/seed";

const SECRET = "secret-vault-code-7f3a";
let team: Team, key: string;
const slug = (s: string) => `${team.tag}-${s}`;

beforeEach(async () => {
  team = await seedTeam();
  ({ key } = await createExtKey(team.user.id, team.ws.id, "Claude"));
  const now = new Date();
  const piece = (s: string, o: { category?: string; access?: "paid" | "free" } = {}) => ({
    id: slug(s), slug: slug(s), title: `${team.tag} ${s}`, category: o.category ?? "hero", access: o.access ?? "paid", summary: `${s} piece`,
    blocks: [{ title: "HTML", lang: "html", code: `<div>${SECRET}</div>` }], publishedAt: now, createdAt: now, updatedAt: now,
  });
  await db.insert(schema.vaultItem).values([piece("paid"), piece("free", { access: "free" }), piece("rule", { category: "utilities" })]);
});
afterEach(async () => {
  delete process.env.ADMIN_EMAILS;
  await db.delete(schema.vaultItem).where(like(schema.vaultItem.id, `${team.tag}%`));
  await cleanupTeam(team);
});

const onPlan = (plan: PlanKey) => db.update(schema.billingAccount).set({ plan }).where(eq(schema.billingAccount.id, team.ws.billingAccountId));

async function call(name: string, args: Record<string, unknown>): Promise<string> {
  const { POST } = await import("@/app/mcp/route");
  const res = await POST(request("/mcp", { method: "POST", headers: bearer(key), body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } } }));
  return ((await res.json()) as { result: { content: { text?: string }[] } }).result.content.map((c) => c.text ?? "").join("\n");
}
// The entries have no picture: the answer is its JSON alone
const read = async (s: string) => JSON.parse(await call("read_vault", { entry: slug(s) })) as Record<string, unknown>;

test("on Free a paid piece is locked with no code in the answer; a free piece and a rule come whole", async () => {
  await onPlan("free");
  const raw = await call("read_vault", { entry: slug("paid") });
  expect(raw).not.toContain(SECRET);
  const locked = JSON.parse(raw);
  expect(locked).toMatchObject({ code: "locked", what_it_is: "paid piece" });
  expect(locked.plans).toMatch(/\/settings\/plan$/);
  expect(locked.preview).toMatch(new RegExp(`/api/vault/${slug("paid")}/preview$`));
  for (const s of ["free", "rule"]) expect(await call("read_vault", { entry: slug(s) })).toContain(SECRET);

  const found = JSON.parse(await call("search_vault", { query: team.tag })) as { entries: { entry: string; code: string }[] };
  expect(Object.fromEntries(found.entries.map((e) => [e.entry, e.code]))).toMatchObject({ [slug("paid")]: "locked", [slug("free")]: "readable", [slug("rule")]: "readable" });
});

test("a paid workspace reads every piece whole", async () => {
  await onPlan("duo");
  for (const s of ["paid", "free", "rule"]) expect(await read(s)).toMatchObject({ code: "readable" });
});

test("a partner reads every piece whole, whatever the plan", async () => {
  await onPlan("free");
  process.env.ADMIN_EMAILS = team.user.email;
  for (const s of ["paid", "free", "rule"]) expect(await read(s)).toMatchObject({ code: "readable" });
});

test("the app's listing carries each card's access and how much the active workspace reads", async () => {
  await onPlan("free");
  actAs({ id: team.user.id, name: team.user.name, email: team.user.email, workspaceId: team.ws.id });
  const { GET } = await import("@/app/api/vault/route");
  const body = (await (await GET()).json()) as { vault: string; entries: { slug: string; access: string }[] };
  expect(body.vault).toBe("sample");
  expect(body.entries.find((e) => e.slug === slug("free"))?.access).toBe("free");
  expect(JSON.stringify(body)).not.toContain(SECRET);
});
