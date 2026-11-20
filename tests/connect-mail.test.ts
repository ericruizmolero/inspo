// After Welcome: the "Connect your agent" email five days after it ended unconnected, once, and the install link a
// person away from Chrome emails themselves. Mail is recorded, never sent.
import { randomBytes } from "node:crypto";
import { inArray, like, or } from "drizzle-orm";
import { afterAll, beforeEach, expect, test, vi } from "vitest";
import { db, pool, schema } from "@/lib/db";
import { CONNECT_AFTER_DAYS, connectLater, connectMailKey, pendingKey, sendConnectReminders } from "@/lib/connect-mail";
import { saveWelcomeStep, emailExtensionLink } from "@/app/actions/welcome";
import { ensurePersonalWorkspace } from "@/lib/workspace-core";
import type { Mail } from "@/lib/mail-templates";
import { actAs, checkedMail } from "./harness";

const sent: (Mail & { to: string })[] = [];
vi.mock("@/lib/mail", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendMail: async (to: string | string[], m: Mail) => { sent.push({ to: [to].flat()[0], ...checkedMail(m) }); },
}));

const DAY = 24 * 60 * 60 * 1000;
const tag = `conn${randomBytes(4).toString("hex")}`;
const users: string[] = [], orgs: string[] = [];
const to = (id: string) => sent.filter((m) => m.to === `${id}@example.test`);

async function person(name: string, o: { language?: string; digest?: boolean } = {}) {
  const id = `${tag}-${name}`, email = `${id}@example.test`, now = new Date();
  await db.insert(schema.user).values({ id, name, email, language: o.language ?? "en", digestEmails: o.digest ?? true, createdAt: now, updatedAt: now });
  users.push(id);
  orgs.push(await ensurePersonalWorkspace(id, name, email, o.language));
  return id;
}

const signIn = (id: string) => actAs({ id, name: id, email: `${id}@example.test`, workspaceId: orgs[users.indexOf(id)] });

async function connect(userId: string) {
  const now = new Date();
  await db.insert(schema.mcpClient).values({ id: `${userId}-client`, name: "Claude", redirectUris: ["http://127.0.0.1/cb"], createdAt: now });
  await db.insert(schema.mcpGrant).values({ id: `${userId}-grant`, clientId: `${userId}-client`, userId, codeHash: `${userId}-code`, codeExpiresAt: now, codeUsedAt: now, codeChallenge: "x", redirectUri: "http://127.0.0.1/cb", createdAt: now });
}

const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

beforeEach(() => { sent.length = 0; });
afterAll(async () => {
  actAs(null);
  await db.delete(schema.appSetting).where(or(...users.flatMap((u) => [like(schema.appSetting.key, `%:${u}`)])));
  await db.delete(schema.mcpClient).where(like(schema.mcpClient.id, `${tag}%`));
  await db.delete(schema.organization).where(inArray(schema.organization.id, orgs));
  await db.delete(schema.billingAccount).where(inArray(schema.billingAccount.ownerUserId, users));
  await db.delete(schema.user).where(inArray(schema.user.id, users));
  await pool.end();
});

test(`ending Welcome unconnected sends the email after ${CONNECT_AFTER_DAYS} days, once, with the address and the stop link`, async () => {
  const ana = await person("ana");
  await connectLater(ana, daysAgo(CONNECT_AFTER_DAYS - 1));
  await sendConnectReminders();
  expect(to(ana), "too early").toEqual([]);

  await db.update(schema.appSetting).set({ updatedAt: daysAgo(CONNECT_AFTER_DAYS) }).where(like(schema.appSetting.key, pendingKey(ana)));
  await sendConnectReminders();
  const [mail, ...more] = to(ana);
  expect(more).toEqual([]);
  expect(mail).toEqual({
    to: `${ana}@example.test`, template: "connect-agent", locale: "en",
    vars: { ADDRESS: expect.stringMatching(/^https?:\/\/[^/]+\/mcp$/), URL: expect.stringMatching(/\/\?in=home$/), STOP_URL: expect.stringContaining(`/unsubscribe?u=${encodeURIComponent(ana)}&k=digest`) },
  });

  await sendConnectReminders();
  expect(to(ana), "the next morning sends nothing more").toHaveLength(1);
  // Ending Welcome again (another device) does not bring it back
  await connectLater(ana, daysAgo(CONNECT_AFTER_DAYS + 1));
  await sendConnectReminders();
  expect(to(ana)).toHaveLength(1);
});

test("it goes in the person's language", async () => {
  const lucia = await person("lucia", { language: "es" });
  await connectLater(lucia, daysAgo(CONNECT_AFTER_DAYS + 1));
  await sendConnectReminders();
  expect(to(lucia).map((m) => [m.template, m.locale])).toEqual([["connect-agent", "es"]]);
});

test("nobody is mailed who connected since, connected before the end, or turned the digest off", async () => {
  const since = await person("since"), before = await person("before"), quiet = await person("quiet", { digest: false });
  await connectLater(since, daysAgo(CONNECT_AFTER_DAYS + 1));
  await connect(since);
  await connect(before);
  await connectLater(before, daysAgo(CONNECT_AFTER_DAYS + 1));
  await connectLater(quiet, daysAgo(CONNECT_AFTER_DAYS + 1));
  await sendConnectReminders();
  expect([...to(since), ...to(before), ...to(quiet)]).toEqual([]);
  const keys = await db.select({ key: schema.appSetting.key }).from(schema.appSetting)
    .where(inArray(schema.appSetting.key, [since, before, quiet].flatMap((u) => [pendingKey(u), connectMailKey(u)])));
  expect(keys, "nothing left waiting and nothing marked sent").toEqual([]);
});

test("Welcome's end is what leaves the email waiting", async () => {
  const bea = await person("bea");
  signIn(bea);
  expect((await saveWelcomeStep("agent")).ok).toBe(true);
  const waiting = async () => (await db.select({ key: schema.appSetting.key }).from(schema.appSetting).where(like(schema.appSetting.key, pendingKey(bea)))).length;
  expect(await waiting()).toBe(0);
  expect((await saveWelcomeStep(null)).ok).toBe(true);
  expect(await waiting()).toBe(1);
});

test("away from Chrome, the install link goes to the person's own address, a few times an hour at most", async () => {
  const eva = await person("eva");
  signIn(eva);
  const r = await emailExtensionLink();
  expect(r).toEqual({ ok: true, data: `${eva}@example.test` });
  const [mail] = to(eva);
  expect(mail).toEqual({ to: `${eva}@example.test`, template: "extension-link", locale: "en", vars: { URL: expect.stringMatching(/^https?:\/\/[^/]+\/extension\/install$/) } });
  await emailExtensionLink();
  await emailExtensionLink();
  expect((await emailExtensionLink()).ok, "the fourth in an hour is refused").toBe(false);
  expect(to(eva)).toHaveLength(3);
});
