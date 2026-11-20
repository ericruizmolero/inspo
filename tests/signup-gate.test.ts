// The signup gate end to end through Better Auth's own handler: the mode a database with no row starts in, the invite
// code riding on the magic link to another browser, what /login promises after sending, and a new team refused as a
// plan's limit.
import { randomBytes } from "node:crypto";
import { eq, inArray, like, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import type { ReactElement } from "react";
import { db, schema } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createInvite, setSignupMode, signupModeState } from "@/lib/access";
import { newTeamRefusal } from "@/lib/quota";
import { httpErrorBody, QuotaError } from "@/lib/workspace-core";
import { actAs, cookieJar } from "./harness";
import LoginForm from "@/components/LoginForm";
import LoginPage from "@/app/login/page";

const sent = vi.hoisted(() => [] as { to: string[]; text: string }[]);
vi.mock("@/lib/mail", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendMail: async (to: string | string[], m: { text: string }) => { sent.push({ to: [to].flat(), text: m.text }); },
}));

const BASE = "http://localhost:3000";
const tag = `gate-${randomBytes(4).toString("hex")}`;
const mail = (who: string) => `${tag}-${who}@example.test`;
const inviteIds: string[] = [];
let before: (typeof schema.appSetting.$inferSelect)[] = [];

const askLink = (email: string, o: { invite?: string; cookie?: string } = {}) => auth.handler(new Request(`${BASE}/api/auth/sign-in/magic-link`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: BASE, ...(o.cookie ? { cookie: o.cookie } : {}) },
  body: JSON.stringify({ email, callbackURL: "/", ...(o.invite ? { metadata: { invite: o.invite } } : {}) }),
}));
const linkSentTo = (email: string) => sent.find((m) => m.to.includes(email))?.text.match(/https?:\/\/\S+\/magic-link\/verify\S+/)?.[0];
/** Opens the link as a browser that never saw /login: no cookie at all */
const openElsewhere = (link: string) => auth.handler(new Request(link, { redirect: "manual" }));
const userOf = async (email: string) => (await db.select().from(schema.user).where(eq(schema.user.email, email)))[0];

beforeAll(async () => {
  before = await db.select().from(schema.appSetting).where(eq(schema.appSetting.key, "signup_mode"));
  await setSignupMode("invite", null);
});
beforeEach(() => { sent.length = 0; actAs(null); });

afterAll(async () => {
  await db.delete(schema.appSetting).where(eq(schema.appSetting.key, "signup_mode"));
  if (before[0]) await db.insert(schema.appSetting).values(before[0]);
  await db.delete(schema.user).where(like(schema.user.email, `${tag}-%`));
  if (inviteIds.length) await db.delete(schema.accessInvite).where(inArray(schema.accessInvite.id, inviteIds));
  await db.execute(sql`delete from rate_limit where key like ${`%${tag}%`}`);
  delete process.env.SIGNUP_MODE;
});

test("with no row, signup is invite-only unless SIGNUP_MODE says otherwise", async () => {
  const row = await db.select().from(schema.appSetting).where(eq(schema.appSetting.key, "signup_mode"));
  await db.delete(schema.appSetting).where(eq(schema.appSetting.key, "signup_mode"));
  try {
    delete process.env.SIGNUP_MODE;
    expect((await signupModeState()).mode, "a fresh or reset database never opens signup by itself").toBe("invite");
    process.env.SIGNUP_MODE = "open";
    expect((await signupModeState()).mode, "the env still sets the starting value").toBe("open");
  } finally {
    delete process.env.SIGNUP_MODE;
    await db.insert(schema.appSetting).values(row);
  }
});

test("the code /login was opened with rides on the magic link: the account is created with it in another browser", async () => {
  const made = await createInvite({ wave: tag });
  inviteIds.push(made.id);
  const email = mail("code");
  const res = await askLink(email, { invite: made.code });
  expect(res.status).toBe(200);
  const link = linkSentTo(email);
  expect(new URL(link!).searchParams.get("invite"), "the link carries the code").toBe(made.code);

  const opened = await openElsewhere(link!);
  expect(opened.headers.get("location") ?? "", "no invite_only on the way back").not.toMatch(/error=/);
  expect((await userOf(email))?.accessInviteId, "the account is made with the invite that let it in").toBe(made.id);
});

test("a code that waited in the cookie rides on the link too", async () => {
  const made = await createInvite({ wave: tag });
  inviteIds.push(made.id);
  const email = mail("cookie");
  await askLink(email, { cookie: `criterio_invite=${encodeURIComponent(made.code)}` });
  await openElsewhere(linkSentTo(email)!);
  expect((await userOf(email))?.accessInviteId).toBe(made.id);
});

test("without a code, a stranger gets the same answer and no link; a link opened without its code is refused", async () => {
  const made = await createInvite({ wave: tag });
  inviteIds.push(made.id);
  const withCode = await askLink(mail("other"), { invite: made.code });
  const stranger = await askLink(mail("stranger"));
  expect([stranger.status, await stranger.json()], "the answer does not say who gets a link").toEqual([withCode.status, await withCode.json()]);
  expect(linkSentTo(mail("stranger"))).toBeUndefined();

  const stripped = new URL(linkSentTo(mail("other"))!);
  stripped.searchParams.delete("invite");
  const refused = await openElsewhere(stripped.toString());
  expect(refused.headers.get("location")).toMatch(/error=invite_only/);
  expect(await userOf(mail("other"))).toBeUndefined();
});

/** The props /login hands its form */
async function formProps(searchParams: Record<string, string>) {
  cookieJar.delete("criterio_invite");
  const tree = await LoginPage({ searchParams: Promise.resolve(searchParams) });
  const find = (node: unknown): ReactElement<Record<string, unknown>> | null => {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) { for (const n of node) { const f = find(n); if (f) return f; } return null; }
    const el = node as ReactElement<{ children?: unknown }>;
    if (el.type === LoginForm) return el as ReactElement<Record<string, unknown>>;
    return find(el.props?.children);
  };
  return find(tree)!.props;
}

test("invite-only, /login never promises a link went out, and offers the waitlist to whoever came without an invite", async () => {
  expect((await formProps({})).gate, "no code: the conditional text and the waitlist").toBe("waitlist");
  const made = await createInvite({ wave: tag });
  inviteIds.push(made.id);
  const invited = await formProps({ invite: ` ${made.code} ` });
  expect([invited.gate, invited.invite], "a usable code: the conditional text, no waitlist, and the code for the request").toEqual(["invited", made.code]);
  await setSignupMode("open", null);
  try {
    expect((await formProps({})).gate, "open: everyone gets a link, so the form says it was sent").toBe("open");
  } finally {
    await setSignupMode("invite", null);
  }
});

test("a new team without a paid plan is a plan's limit, lifted by the cheapest paid plan", async () => {
  const now = new Date();
  const [user] = await db.insert(schema.user).values({ id: `${tag}-solo`, name: "Solo", email: mail("solo"), emailVerified: true, createdAt: now, updatedAt: now })
    .returning({ id: schema.user.id });
  const refused = await newTeamRefusal(user.id);
  expect(refused).toBeInstanceOf(QuotaError);
  expect(httpErrorBody(refused!)).toMatchObject({ quota: true, upgrade: "duo" });

  const err = await auth.api.createOrganization({ body: { name: tag, slug: tag, userId: user.id } }).then(() => null, (e: unknown) => e);
  expect(err, "Better Auth answers 402 with what the upgrade notice reads").toMatchObject({ status: "PAYMENT_REQUIRED", body: { quota: true, upgrade: "duo" } });
});
