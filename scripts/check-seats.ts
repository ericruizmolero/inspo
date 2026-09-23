// Check of the per-plan people limit. Not a test framework: creates a
// test workspace, checks with assert and deletes it when done.
//   npx tsx scripts/check-seats.ts
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { setWorkspacePlan } from "../lib/workspace-core";
import { memberLimitMessage, overCapacity, memberRank, assertSeatsOk, countPendingInvitations } from "../lib/quota";
import { HttpError } from "../lib/workspace-core";

const id = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);
const TAG = `seatcheck-${id().slice(0, 8)}`;
const orgId = id();
const userIds: string[] = [];

const DAY = 24 * 60 * 60 * 1000;

async function addUser(n: number) {
  const uid = id();
  const now = new Date();
  await db.insert(schema.user).values({ id: uid, name: `${TAG}-${n}`, email: `${TAG}-${n}@example.test`, createdAt: now, updatedAt: now });
  userIds.push(uid);
  return uid;
}

async function addMember(uid: string, at: Date, role = "member") {
  const mid = id();
  await db.insert(schema.member).values({ id: mid, organizationId: orgId, userId: uid, role, createdAt: at });
  return mid;
}

async function addInvitation(email: string, expiresAt: Date, inviterId: string) {
  const iid = id();
  await db.insert(schema.invitation).values({
    id: iid, organizationId: orgId, email, role: "member", status: "pending", expiresAt, createdAt: new Date(), inviterId,
  });
  return iid;
}

async function main() {
  const now = new Date();
  await db.insert(schema.organization).values({
    id: orgId, name: TAG, slug: TAG, createdAt: now, metadata: JSON.stringify({ kind: "team", plan: "studio" }),
  });
  const owner = await addUser(0);
  await addMember(owner, now, "owner");

  // 1. Unaccepted invitations take a seat
  for (let i = 1; i <= 4; i++) await addInvitation(`${TAG}-inv${i}@example.test`, new Date(Date.now() + 7 * DAY), owner);
  assert.equal(await countPendingInvitations(orgId), 4, "4 pending invitations");
  assert.equal(await memberLimitMessage(orgId, "studio"), null, "not counting pending ones there is still room");
  const full = await memberLimitMessage(orgId, "studio", { includePending: true });
  assert.ok(full, "1 member + 4 invitations fill the Studio plan");
  assert.match(full!, /4 invitations not yet accepted/, "the message says how many invitations there are");

  // 2. Resending an invitation doesn't take an extra seat
  assert.equal(
    await memberLimitMessage(orgId, "studio", { includePending: true, exceptEmail: `${TAG}-INV1@example.test` }),
    null, "resending to an already invited address still fits",
  );

  // 3. Expired ones don't count
  await addInvitation(`${TAG}-old@example.test`, new Date(Date.now() - DAY), owner);
  assert.equal(await countPendingInvitations(orgId), 4, "the expired invitation takes no seat");

  // 4. Downgrading leaves the team over the limit
  for (let i = 1; i <= 4; i++) await addMember(await addUser(i), new Date(+now + i));
  assert.equal(await overCapacity(orgId, "studio"), null, "5 people fit in Studio");
  await setWorkspacePlan(orgId, "solo");
  const over = await overCapacity(orgId, "solo");
  assert.deepEqual(over, { members: 5, limit: 1, planName: "Solo" }, "5 people don't fit in Solo");
  await assert.rejects(
    () => assertSeatsOk({ id: orgId, plan: "solo" }),
    (e: unknown) => e instanceof HttpError && e.status === 402,
    "AI stops while the team is over the limit",
  );

  // 5. When two accept the last seat at once, the one left over is always the later one, never both
  const ordered = await db.select({ id: schema.member.id, createdAt: schema.member.createdAt })
    .from(schema.member).where(eq(schema.member.organizationId, orgId));
  ordered.sort((a, b) => (+a.createdAt - +b.createdAt) || (a.id < b.id ? -1 : 1));
  for (let i = 0; i < ordered.length; i++) {
    assert.equal(await memberRank(orgId, ordered[i].id), i, `member ${i} has rank ${i}`);
  }

  console.log("✓ seats: pending, resend, expired, downgrade and last-seat order");
}

main()
  .catch((e) => { console.error("✗", e); process.exitCode = 1; })
  .finally(async () => {
    // The cascade delete takes members and invitations; users go separately
    await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
    for (const uid of userIds) await db.delete(schema.user).where(eq(schema.user.id, uid));
  });
