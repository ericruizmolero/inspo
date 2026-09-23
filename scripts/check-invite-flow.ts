// Check of the real invitation flow against the running app. Needs
// `npm run dev` in another terminal (no RESEND_API_KEY: links go to .data/last-mail.txt).
//   npm run check:invites            (port 3000 by default)
//   BASE=http://localhost:3777 npm run check:invites
//
// A unit test of single functions misses this: Better Auth uses different hooks to
// accept an invitation (beforeAcceptInvitation) and to add a member by hand
// (beforeAddMember), and hanging the check on the wrong hook makes it useless.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { setWorkspacePlan } from "../lib/workspace-core";

const BASE = process.env.BASE || "http://localhost:3000";
const TAG = `flowcheck-${crypto.randomUUID().slice(0, 8)}`;
const mail = (who: string) => `${TAG}-${who}@example.test`;
const PEOPLE = ["owner", "one", "two", "three", "eva", "fran", "gus"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);

/** Signs in by magic link, reading the link from .data/last-mail.txt. Returns the session cookie. */
async function login(email: string): Promise<string> {
  const r = await fetch(`${BASE}/api/auth/sign-in/magic-link`, {
    method: "POST", headers: { "Content-Type": "application/json", origin: BASE },
    body: JSON.stringify({ email, callbackURL: `${BASE}/` }),
  });
  if (!r.ok) throw new Error(`magic-link ${r.status} for ${email}: ${await r.text()}`);
  await sleep(500);
  const txt = await fs.readFile(".data/last-mail.txt", "utf8");
  const url = txt.split("\n").find((l) => l.includes("/api/auth/magic-link/verify"));
  if (!url) throw new Error(`no link for ${email}. Last email:\n${txt}`);
  const res = await fetch(url, { redirect: "manual" });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!cookie.includes("session_token")) throw new Error(`no session for ${email}`);
  return cookie;
}

const post = (path: string, cookie: string, body: unknown) =>
  fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json", cookie, origin: BASE }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, body: (await r.json().catch(() => ({}))) as Record<string, unknown> }));

const invite = (cookie: string, orgId: string, email: string) =>
  post("/api/auth/organization/invite-member", cookie, { email, role: "member", organizationId: orgId });
const accept = (cookie: string, invitationId: string) =>
  post("/api/auth/organization/accept-invitation", cookie, { invitationId });

let orgId = "";

async function main() {
  const owner = await login(mail("owner"));
  const created = await post("/api/auth/organization/create", owner, { name: TAG, slug: TAG });
  orgId = created.body.id as string;
  assert.ok(orgId, `team was not created: ${JSON.stringify(created.body)}`);
  await setWorkspacePlan(orgId, "studio");

  // 1. Three people join: the team is at 4 of 5
  for (const who of ["one", "two", "three"]) {
    const inv = await invite(owner, orgId, mail(who));
    assert.equal(inv.status, 200, `could not invite ${who}: ${JSON.stringify(inv.body)}`);
    const acc = await accept(await login(mail(who)), inv.body.id as string);
    assert.equal(acc.status, 200, `${who} could not join: ${JSON.stringify(acc.body)}`);
  }

  // 2. One more invitation fills the plan; the next is rejected at invite time, not on accept
  const eva = await invite(owner, orgId, mail("eva"));
  assert.equal(eva.status, 200, "the fifth seat should fit");
  const full = await invite(owner, orgId, mail("extra"));
  assert.equal(full.status, 403, "with 4 members and 1 invitation the plan is full");
  assert.match(String(full.body.message), /1 invitation not yet accepted/);

  // 3. Two extra invitations for the last seat, inserted by hand: the state that
  //    invitations created before the fix left behind.
  const ids: Record<string, string> = { eva: eva.body.id as string };
  for (const who of ["fran", "gus"]) {
    ids[who] = newId();
    await db.insert(schema.invitation).values({
      id: ids[who], organizationId: orgId, email: mail(who), role: "member", status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000), createdAt: new Date(),
      inviterId: (await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, mail("owner"))))[0].id,
    });
  }

  // 4. All three at once
  const cookies: Record<string, string> = {};
  for (const who of ["eva", "fran", "gus"]) cookies[who] = await login(mail(who));
  const res = await Promise.all(["eva", "fran", "gus"].map((who) => accept(cookies[who], ids[who]).then((r) => ({ who, ...r }))));

  const [members, invs] = await Promise.all([
    db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, orgId)),
    db.select({ email: schema.invitation.email, status: schema.invitation.status }).from(schema.invitation).where(eq(schema.invitation.organizationId, orgId)),
  ]);
  for (const r of res) console.log(`  ${r.who.padEnd(4)} ${r.status} ${r.body.message ?? "joins"}`);

  assert.equal(res.filter((r) => r.status === 200).length, 1, "only one person can take the last seat");
  assert.equal(members.length, 5, "the team can't go past the 5 of the Studio plan");
  for (const r of res.filter((x) => x.status !== 200)) {
    assert.equal(invs.find((i) => i.email === mail(r.who))!.status, "pending", `${r.who}'s invitation must stay valid`);
  }

  console.log("✓ invitations: cap on invite, cap on accept, and the last seat for one person only");
}

main()
  .catch((e) => { console.error("✗", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(async () => {
    if (orgId) await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
    await db.delete(schema.user).where(inArray(schema.user.email, PEOPLE.map(mail)));
  });
