// Landing checks count once, on the account's month, whoever runs them (lib/landing-check.ts checkLandingFor): the connector's
// check_landing and any other caller spend the same month, /settings/plan reads it (quotaStatus), and the free plan's
// eleventh is refused with the upgrade notice. The browser is a stand-in: the test is about the counting.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { eq, inArray, like } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createExtKey } from "@/lib/ext-keys";
import { checkLandingFor } from "@/lib/landing-check";
import { quotaStatus } from "@/lib/quota";
import { FREE_CHECKS_PER_MONTH, type PlanKey } from "@/lib/plans";
import { QuotaError } from "@/lib/workspace-core";
import { bearer, request } from "./isolation/probe";
import { cleanupTeam, seedTeam, type Team } from "./library/seed";

const opens = vi.hoisted(() => ({ fail: false }));
vi.mock("@/lib/browser", async (real) => ({
  ...(await real<typeof import("@/lib/browser")>()),
  withPage: async (_kind: string, run: (page: unknown) => Promise<unknown>) => {
    if (opens.fail) throw new Error("the page did not open");
    let width = 1440;
    return run({
      setViewport: async (v: { width: number }) => { width = v.width; },
      goto: async () => null,
      waitForSelector: async () => null,
      evaluate: async () => ({ width, viewportHeight: 900, h1: "Book a call", firstScreen: "", actions: [{ text: "Book a call", top: 300 }], scrollWidth: width, images: 0, brokenImages: 0, text: "Book a call" }),
      screenshot: async () => new Uint8Array([0xff, 0xd8]),
    });
  },
}));

let team: Team, key: string, project: string;
const URL = "https://example.com";

beforeEach(async () => {
  opens.fail = false;
  team = await seedTeam();
  ({ key } = await createExtKey(team.user.id, team.ws.id, "Claude"));
  project = `${team.tag}-p`;
  await db.insert(schema.project).values({ id: project, organizationId: team.ws.id, name: `${team.tag} landing`, createdBy: team.user.id, createdAt: new Date(), updatedAt: new Date() });
});
afterEach(async () => {
  // The connector's sign-in gives the person a personal workspace of their own: it goes with them
  const own = await db.select({ id: schema.billingAccount.id }).from(schema.billingAccount).where(eq(schema.billingAccount.ownerUserId, team.user.id));
  if (own.length) {
    await db.delete(schema.organization).where(inArray(schema.organization.billingAccountId, own.map((a) => a.id)));
    await db.delete(schema.billingAccount).where(inArray(schema.billingAccount.id, own.map((a) => a.id)));
  }
  await db.delete(schema.appSetting).where(like(schema.appSetting.key, `landing_checks:${team.ws.billingAccountId}:%`));
  await cleanupTeam(team);
});

const onPlan = async (plan: PlanKey) => {
  await db.update(schema.billingAccount).set({ plan }).where(eq(schema.billingAccount.id, team.ws.billingAccountId));
  team.ws = { ...team.ws, plan };
};

/** check_landing through the connector: its answer's text and whether it is a refusal */
async function viaConnector(): Promise<{ text: string; refused: boolean }> {
  const { POST } = await import("@/app/mcp/route");
  const res = await POST(request("/mcp", { method: "POST", headers: bearer(key), body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "check_landing", arguments: { project, url: URL } } } }));
  const { result } = (await res.json()) as { result: { content: { text?: string }[]; isError?: boolean } };
  return { text: result.content.map((c) => c.text ?? "").join("\n"), refused: !!result.isError };
}

test("the connector and a direct check spend one counter, the one the plan page shows", async () => {
  await onPlan("free");
  expect((await quotaStatus(team.ws)).checks).toEqual({ used: 0, limit: FREE_CHECKS_PER_MONTH });
  for (let i = 0; i < FREE_CHECKS_PER_MONTH - 1; i++) await checkLandingFor(team.ws, team.user.id, URL);
  const last = await viaConnector();
  expect(last.refused, last.text).toBe(false);
  expect((await quotaStatus(team.ws)).checks).toEqual({ used: FREE_CHECKS_PER_MONTH, limit: FREE_CHECKS_PER_MONTH });
});

test("the free plan's eleventh check is refused with the upgrade notice, on either path, and spends nothing", async () => {
  await onPlan("free");
  for (let i = 0; i < FREE_CHECKS_PER_MONTH; i++) await checkLandingFor(team.ws, team.user.id, URL);
  const refusal = await checkLandingFor(team.ws, team.user.id, URL).catch((e: unknown) => e);
  expect(refusal).toBeInstanceOf(QuotaError);
  expect((refusal as QuotaError).status).toBe(402);
  expect((refusal as QuotaError).upgrade, "the notice names the plan that lifts it").toBe("duo");
  const connector = await viaConnector();
  expect(connector.refused).toBe(true);
  expect(connector.text).toContain(`${FREE_CHECKS_PER_MONTH} of ${FREE_CHECKS_PER_MONTH} landing checks`);
  expect((await quotaStatus(team.ws)).checks.used, "a refusal is not a check").toBe(FREE_CHECKS_PER_MONTH);
});

test("a page that does not open spends nothing", async () => {
  await onPlan("free");
  opens.fail = true;
  await expect(checkLandingFor(team.ws, team.user.id, URL)).rejects.toThrow("did not open");
  expect((await quotaStatus(team.ws)).checks.used).toBe(0);
});

test("a paid plan counts its checks with no monthly cap", async () => {
  await onPlan("duo");
  for (let i = 0; i < FREE_CHECKS_PER_MONTH + 1; i++) await checkLandingFor(team.ws, team.user.id, URL);
  expect((await quotaStatus(team.ws)).checks).toEqual({ used: FREE_CHECKS_PER_MONTH + 1, limit: null });
});
