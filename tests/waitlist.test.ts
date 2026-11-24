// POST /api/waitlist, the marketing site's form: one entry per address with source "landing", the "you're on the
// list" mail once and the partners' notice once, the same 200 for a repeat or an existing account, nothing written for the honeypot, and no
// answer at all for another origin.
import { randomBytes } from "node:crypto";
import { eq, like, sql } from "drizzle-orm";
import { afterAll, beforeEach, expect, test, vi } from "vitest";
import { db, schema } from "@/lib/db";
import { MARKETING_URL } from "@/lib/site";
import { listAdmins } from "@/lib/activity";
import { OPTIONS, POST } from "@/app/api/waitlist/route";
import type { Mail } from "@/lib/mail-templates";
import { request } from "./isolation/probe";

const sent = vi.hoisted(() => [] as (Mail & { to: string[] })[]);
vi.mock("@/lib/mail", async (importOriginal) => {
  const { checkedMail } = await import("./harness");
  return { ...(await importOriginal<object>()), sendMail: async (to: string | string[], m: Mail) => { sent.push({ to: [to].flat(), ...checkedMail(m) }); } };
});

const tag = `wl-${randomBytes(4).toString("hex")}`;
const W = schema.waitlistEntry;
let ipN = 0;

/** A fresh IP per request, so the rate limit never decides a test that is not about it */
const post = (body: unknown, origin: string | null = MARKETING_URL, ip = `198.51.100.${++ipN}-${tag}`) =>
  POST(request("/api/waitlist", { method: "POST", body, headers: { ...(origin ? { origin } : {}), "x-forwarded-for": ip } }));

const rows = (email: string) => db.select().from(W).where(eq(W.email, email));

beforeEach(() => { sent.length = 0; });

afterAll(async () => {
  const ids = (await db.select({ id: W.id }).from(W).where(like(W.email, `%${tag}%`))).map((r) => r.id);
  for (const id of ids) {
    await db.delete(schema.appSetting).where(eq(schema.appSetting.key, `waitlist-mail:${id}`));
    await db.delete(schema.appSetting).where(eq(schema.appSetting.key, `waitlist-partners:${id}`));
  }
  await db.delete(W).where(like(W.email, `%${tag}%`));
  await db.execute(sql`delete from rate_limit where key like ${`app:waitlist:%${tag}`}`);
});

test("a new address is stored once with source landing and its locale, and gets the mail once", async () => {
  const email = `${tag}-new@example.test`;
  const first = await post({ email: `  ${email.toUpperCase()} `, locale: "es", consent: true, website: "" });
  expect(first.status).toBe(200);
  expect(await first.json()).toEqual({ ok: true });
  expect(first.headers.get("access-control-allow-origin")).toBe(new URL(MARKETING_URL).origin);

  const [row] = await rows(email);
  expect({ source: row.source, locale: row.locale, status: row.status }).toEqual({ source: "landing", locale: "es", status: "pending" });
  const [person, partners, ...rest] = sent;
  expect(person).toEqual({ to: [email], template: "on-the-list", locale: "es", vars: { YOUR_EMAIL: email } });
  const admins = (await listAdmins()).map((a) => a.email);
  expect(partners.to, "the partners hear of it").toEqual(admins);
  expect(JSON.stringify(partners), "the notice names the address").toContain(email);
  expect(rest).toHaveLength(0);

  const again = await post({ email, locale: "en", consent: true, website: "" });
  expect(again.status, "a repeat answers the same").toBe(200);
  expect(await again.json()).toEqual({ ok: true });
  expect(await rows(email), "still one entry, with its first locale").toMatchObject([{ locale: "es" }]);
  expect(sent, "each mail went out once").toHaveLength(2);
});

test("an address that already has an account answers the same and is not put on the list", async () => {
  const email = `${tag}-member@example.test`;
  const now = new Date();
  await db.insert(schema.user).values({ id: `${tag}-user`, name: "Member", email, createdAt: now, updatedAt: now });
  try {
    const res = await post({ email, locale: "en", consent: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await rows(email)).toHaveLength(0);
    expect(sent).toHaveLength(0);
  } finally {
    await db.delete(schema.user).where(eq(schema.user.id, `${tag}-user`));
  }
});

test("a filled honeypot answers 200 and writes nothing", async () => {
  const email = `${tag}-bot@example.test`;
  const res = await post({ email, locale: "en", consent: true, website: "https://spam.example" });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  expect(await rows(email)).toHaveLength(0);
  expect(sent).toHaveLength(0);
});

test("a bad address or no consent is a 400 and writes nothing", async () => {
  expect((await post({ email: "not-an-email", consent: true })).status).toBe(400);
  const email = `${tag}-noconsent@example.test`;
  expect((await post({ email, consent: false })).status).toBe(400);
  expect((await post("{", MARKETING_URL)).status, "a body that is not an object").toBe(400);
  expect(await rows(email)).toHaveLength(0);
});

test("another origin, or none, is refused before anything is read or written", async () => {
  const email = `${tag}-evil@example.test`;
  for (const origin of ["https://evil.example", "https://criterio.design.evil.example", null]) {
    const res = await post({ email, locale: "en", consent: true }, origin);
    expect(res.status, String(origin)).toBe(403);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  }
  expect(await rows(email)).toHaveLength(0);

  const pre = OPTIONS(request("/api/waitlist", { method: "OPTIONS", headers: { origin: "https://evil.example" } }));
  expect(pre.status).toBe(403);
  const ok = OPTIONS(request("/api/waitlist", { method: "OPTIONS", headers: { origin: MARKETING_URL } }));
  expect(ok.status).toBe(204);
  expect(ok.headers.get("access-control-allow-methods")).toBe("POST");
});

test("one IP gets ten tries an hour, then a 429", async () => {
  const ip = `198.51.100.250-${tag}`;
  const statuses = [];
  for (let i = 0; i < 11; i++) statuses.push((await post({ email: `${tag}-limit${i}@example.test`, consent: true }, MARKETING_URL, ip)).status);
  expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
  expect(statuses[10]).toBe(429);
  expect(await rows(`${tag}-limit10@example.test`), "the refused one wrote nothing").toHaveLength(0);
});
