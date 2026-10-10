// Check of the waitlist and the invite codes (lib/access.ts) against the database. Not a test framework:
// it writes its own rows, checks with assert and deletes them when done.
//   npm run check:access
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { eq, inArray, like } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { createInvite, hasAccess, joinWaitlist, redeemInvite } from "../lib/access";

const TAG = `accesscheck-${crypto.randomUUID().slice(0, 8)}`;
const inviteIds: string[] = [];

async function invite(o: Parameters<typeof createInvite>[0] = {}) {
  const made = await createInvite({ wave: TAG, ...o });
  inviteIds.push(made.id);
  return made;
}

async function main() {
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
}

main()
  .then(() => console.log("access: ok"))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    await db.delete(schema.waitlistEntry).where(like(schema.waitlistEntry.email, `${TAG}%`));
    if (inviteIds.length) await db.delete(schema.accessInvite).where(inArray(schema.accessInvite.id, inviteIds));
    await pool.end();
  });
