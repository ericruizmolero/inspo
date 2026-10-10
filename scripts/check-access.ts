// Check of the waitlist, the invite codes and the signup gate (lib/access.ts, the user.create hook in lib/auth.ts)
// against the database. Not a test framework: it writes its own rows, checks with assert and deletes them when done.
// It flips signup_mode and puts the old value back at the end.
//   npm run check:access
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { and, eq, inArray, like } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { admit, createInvite, getSignupMode, hasAccess, joinWaitlist, maySignIn, redeemInvite, setSignupMode } from "../lib/access";
import { auth } from "../lib/auth";

const TAG = `accesscheck-${crypto.randomUUID().slice(0, 8)}`;
const inviteIds: string[] = [];
let before: (typeof schema.appSetting.$inferSelect)[] = [];

async function invite(o: Parameters<typeof createInvite>[0] = {}) {
  const made = await createInvite({ wave: TAG, ...o });
  inviteIds.push(made.id);
  return made;
}

async function main() {
  before = await db.select().from(schema.appSetting).where(eq(schema.appSetting.key, "signup_mode"));
  const single = await invite();
  const raced = await Promise.all([redeemInvite(single.code, `${TAG}-a@example.test`), redeemInvite(single.code, `${TAG}-b@example.test`)]);
  assert.equal(raced.filter((r) => r.ok).length, 1, "two redeems at once of a single-use code: exactly one gets in");
  assert.deepEqual(raced.find((r) => !r.ok), { ok: false, reason: "used_up" }, "the other is told the code is used up");
  const [{ uses }] = await db.select({ uses: schema.accessInvite.uses }).from(schema.accessInvite).where(eq(schema.accessInvite.id, single.id));
  assert.equal(uses, 1, "uses = 1 after the race");

  const expired = await invite({ expiresAt: new Date(Date.now() - 1000) });
  assert.deepEqual(await redeemInvite(expired.code, `${TAG}@example.test`), { ok: false, reason: "expired" }, "an expired code fails");

  const revoked = await invite();
  await db.update(schema.accessInvite).set({ revokedAt: new Date() }).where(eq(schema.accessInvite.id, revoked.id));
  assert.deepEqual(await redeemInvite(revoked.code, `${TAG}@example.test`), { ok: false, reason: "revoked" }, "a revoked code fails");

  assert.deepEqual(await redeemInvite("not-a-code", `${TAG}@example.test`), { ok: false, reason: "not_found" }, "an unknown code fails");

  const personal = await invite({ email: `  ${TAG}-Mine@Example.TEST ` });
  assert.deepEqual(await redeemInvite(personal.code, `${TAG}-other@example.test`), { ok: false, reason: "wrong_email" }, "a personal code fails for someone else");
  assert.equal((await redeemInvite(personal.code, `${TAG}-MINE@example.test`)).ok, true, "a personal code works for its person, whatever the case");

  const first = await joinWaitlist({ email: `  ${TAG}-Wait@Example.TEST `, locale: "es", source: "landing", note: "first" });
  assert.equal(first.created, true, "joining adds an entry");
  const again = await joinWaitlist({ email: `${TAG}-wait@example.test`, locale: "en", source: "login", note: "second" });
  assert.deepEqual(again, { id: first.id, status: "pending", created: false }, "joining again with the same email in another case keeps the one entry");
  const [entry] = await db.select().from(schema.waitlistEntry).where(eq(schema.waitlistEntry.id, first.id));
  assert.equal(entry.email, `${TAG}-wait@example.test`, "the email is stored trimmed and lowercase");
  assert.equal(entry.note, "first", "the first answers stay");

  const waved = await invite({ email: `${TAG}-wait@example.test` });
  const [invited] = await db.select().from(schema.waitlistEntry).where(eq(schema.waitlistEntry.id, first.id));
  assert.equal(invited.status, "invited", "an invite for a waiting email moves the entry to invited");
  assert.equal(invited.inviteId, waved.id, "and links the invite");

  const users = await db.select({ email: schema.user.email }).from(schema.user);
  for (const u of users) assert.equal(await hasAccess(u.email), true, `existing account ${u.email} has access`);
  assert.equal(await hasAccess(`${TAG}-wait@example.test`), false, "a waiting email without an account has no access");
  console.log(`hasAccess: ${users.length} of ${users.length} existing accounts`);

  await gate();
}

/** Creates the account the way a magic link or Google does, through Better Auth and its user.create hooks */
async function signUp(email: string) {
  const ctx = await auth.$context;
  try {
    const u = await ctx.internalAdapter.createUser({ email, name: "", emailVerified: true }, { method: "magic-link" });
    return { ok: true as const, user: u as typeof u & { accessInviteId?: string | null } };
  } catch (e) {
    return { ok: false as const, code: (e as { body?: { code?: string } }).body?.code };
  }
}

async function gate() {
  const mail = (s: string) => `${TAG}-gate-${s}@example.test`;

  await setSignupMode("invite", null);
  assert.equal(await getSignupMode(), "invite", "the mode reads back what was set");

  assert.equal(await maySignIn(mail("stranger"), null), false, "invite: a stranger gets no magic link");
  assert.deepEqual(await admit(mail("stranger"), null), { ok: false }, "invite: a stranger is turned away");
  assert.deepEqual(await signUp(mail("stranger")), { ok: false, code: "invite_only" }, "invite: the hook cuts with invite_only");
  assert.equal(await hasAccess(mail("stranger")), false, "and no account is left behind");

  const users = await db.select({ email: schema.user.email }).from(schema.user).limit(1);
  if (users[0]) assert.equal(await maySignIn(users[0].email, null), true, "invite: an existing account still gets its link");

  const open = await invite({ maxUses: 2 });
  assert.equal(await maySignIn(mail("code"), open.code), true, "invite: a valid code gets the link");
  assert.equal(await maySignIn(mail("code"), "not-a-code"), false, "invite: a bad code does not");
  const byCode = await admit(mail("code"), open.code);
  assert.deepEqual(byCode, { ok: true, inviteId: open.id, grantsPlan: null }, "path 1: the code from the cookie lets in and is spent");

  await joinWaitlist({ email: mail("named"), locale: "en", source: "landing" });
  const named = await invite({ email: mail("named"), grantsPlan: "studio" });
  assert.equal(await maySignIn(mail("named"), null), true, "invite: an invite in their name gets the link without the code");
  const created = await signUp(mail("named"));
  assert.ok(created.ok, "path 2: an invite in their name lets in through the hook");
  assert.equal(created.user.accessInviteId, named.id, "the account keeps the invite it came with");
  const [entry] = await db.select({ status: schema.waitlistEntry.status }).from(schema.waitlistEntry).where(eq(schema.waitlistEntry.email, mail("named")));
  assert.equal(entry.status, "joined", "the waitlist entry is marked joined");
  const [space] = await db.select({ plan: schema.organization.plan }).from(schema.member)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
    .where(and(eq(schema.member.userId, created.user.id), eq(schema.organization.kind, "personal")));
  assert.equal(space?.plan, "studio", "the personal space starts on the invite's plan");
  assert.deepEqual(await admit(mail("named"), null), { ok: false }, "the named invite is spent once");

  const [team] = await db.select({ id: schema.organization.id }).from(schema.organization).limit(1);
  const [inviter] = await db.select({ id: schema.user.id }).from(schema.user).limit(1);
  if (team && inviter) {
    const id = `${TAG}-team`;
    await db.insert(schema.invitation).values({ id, organizationId: team.id, email: mail("Team"), role: "member", status: "pending", inviterId: inviter.id, expiresAt: new Date(Date.now() + 86_400_000), createdAt: new Date() });
    assert.equal(await maySignIn(mail("team"), null), true, "invite: a pending team invitation gets the link");
    assert.deepEqual(await admit(mail("team"), null), { ok: true, inviteId: null, grantsPlan: null }, "path 3: a pending team invitation skips the list");
    await db.delete(schema.invitation).where(eq(schema.invitation.id, id));
  }

  await setSignupMode("open", null);
  assert.equal(await maySignIn(mail("stranger"), null), true, "open: anyone gets the link");
  const walkIn = await signUp(mail("stranger"));
  assert.ok(walkIn.ok, "path 4: open lets anyone in through the hook");
  assert.equal(walkIn.user.accessInviteId ?? null, null, "with no invite to record");
  const counted = await admit(mail("open-code"), open.code);
  assert.deepEqual(counted, { ok: true, inviteId: open.id, grantsPlan: null }, "open: a code is still spent, so referrals count");
  assert.deepEqual(await redeemInvite(open.code, mail("x")), { ok: false, reason: "used_up" }, "two uses, two spent");
}

main()
  .then(() => console.log("access: ok"))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    await db.delete(schema.appSetting).where(eq(schema.appSetting.key, "signup_mode"));
    if (before[0]) await db.insert(schema.appSetting).values(before[0]);
    const made = await db.select({ id: schema.user.id }).from(schema.user).where(like(schema.user.email, `${TAG}%`));
    if (made.length) {
      const ids = made.map((u) => u.id);
      const spaces = await db.select({ id: schema.member.organizationId }).from(schema.member).where(inArray(schema.member.userId, ids));
      if (spaces.length) await db.delete(schema.organization).where(inArray(schema.organization.id, spaces.map((x) => x.id)));
      await db.delete(schema.user).where(inArray(schema.user.id, ids));
    }
    await db.delete(schema.waitlistEntry).where(like(schema.waitlistEntry.email, `${TAG}%`));
    if (inviteIds.length) await db.delete(schema.accessInvite).where(inArray(schema.accessInvite.id, inviteIds));
    await pool.end();
  });
