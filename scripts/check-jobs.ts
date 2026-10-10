// Check of the tag jobs the queue runs (lib/tag-jobs.ts, lib/job-run.ts). Not a test framework: creates a test
// workspace with pending items, runs its jobs as they run off Vercel (in this process, each one sending the
// next), and deletes it when done. The model key is a fake one, so every model call fails at no cost: that is
// the failure path, with its pauses and its last try. No browser is opened (the items are images, not sites).
//   npm run check:jobs
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
process.env.OPENROUTER_API_KEY = "sk-or-check-jobs-not-a-key";
for (const k of Object.keys(process.env)) if (k.startsWith("R2_")) delete process.env[k];
import assert from "node:assert/strict";
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { MAX_ATTEMPTS, PER_WORKSPACE, jobStats, retryAfterS, runTagJob } from "../lib/tag-jobs";
import { runJob, sweep, RetryLater } from "../lib/job-run";

const T = schema.inspoItem;
const id = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);
const TAG = `jobcheck-${id().slice(0, 8)}`;
const orgId = id(), userId = id();
const ITEMS = 12;

const rows = () => db.select({ id: T.id, tagStatus: T.tagStatus, tagAttempts: T.tagAttempts }).from(T).where(eq(T.organizationId, orgId));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const now = new Date();
  await db.insert(schema.user).values({ id: userId, name: TAG, email: `${TAG}@example.test`, createdAt: now, updatedAt: now });
  await db.insert(schema.organization).values({ id: orgId, name: TAG, slug: TAG, createdAt: now });
  await db.insert(schema.member).values({ id: id(), organizationId: orgId, userId, role: "owner", createdAt: now });
  await db.insert(T).values(Array.from({ length: ITEMS }, (_, i) => {
    const web = `/api/files/inspo/media/${TAG}-${i}.jpg`;
    return { id: id(), organizationId: orgId, name: `${TAG} ${i}`, web, webKey: web, date: "2026-10-10", author: TAG, createdBy: userId, createdAt: new Date(now.getTime() + i), updatedAt: now };
  }));

  // A workspace already running PER_WORKSPACE takes no other: the item stays pending for one of those to send on
  const seeded = await rows();
  const full = seeded.slice(0, PER_WORKSPACE).map((x) => x.id);
  await db.update(T).set({ tagStatus: "running", tagStartedAt: new Date() }).where(inArray(T.id, full));
  const waiting = seeded[PER_WORKSPACE].id;
  assert.equal(await runTagJob({ organizationId: orgId, itemId: waiting }), null);
  assert.equal((await rows()).find((x) => x.id === waiting)!.tagStatus, "pending", "a full workspace leaves the item pending");
  await db.update(T).set({ tagStatus: "pending", tagStartedAt: null }).where(inArray(T.id, full));
  console.log(`✓ a workspace running ${PER_WORKSPACE} jobs takes no other`);

  // One job starts the workspace; each one that ends sends the next
  await runJob({ kind: "tag", organizationId: orgId, userId }).catch((e) => assert(e instanceof RetryLater, `only a retry is thrown: ${e}`));
  let mostRunning = 0;
  for (const end = Date.now() + 180_000; Date.now() < end; await sleep(200)) {
    const r = await rows();
    mostRunning = Math.max(mostRunning, r.filter((x) => x.tagStatus === "running").length);
    if (r.every((x) => x.tagStatus === "failed")) break;
  }
  const first = await rows();
  assert(first.every((x) => x.tagStatus === "failed" && x.tagAttempts === 1), `every item tried once and failed: ${JSON.stringify(first.map((x) => [x.tagStatus, x.tagAttempts]))}`);
  assert(mostRunning <= PER_WORKSPACE, `at most ${PER_WORKSPACE} at once (saw ${mostRunning})`);
  console.log(`✓ the chain went through ${ITEMS} items, at most ${mostRunning} at once`);

  // Inside its pause a failure is not taken again; once its pause is over it is, and the next pause is longer
  const one = first[0].id;
  assert.equal(await runTagJob({ organizationId: orgId, itemId: one }), null, "nothing to do inside the pause");
  assert.equal((await rows()).find((x) => x.id === one)!.tagAttempts, 1, "not tried again inside the pause");
  const back = async (s: number) => db.update(T).set({ tagStartedAt: sql`now() - make_interval(secs => ${s})` }).where(eq(T.id, one));
  await back(retryAfterS(1) + 1);
  assert.equal(await runTagJob({ organizationId: orgId, itemId: one }), retryAfterS(2) + 5, "second failure: delivered again after the longer pause");
  await back(retryAfterS(2) - 30);
  assert.equal(await runTagJob({ organizationId: orgId, itemId: one }), null, "the second pause is longer than the first");
  await back(retryAfterS(2) + 1);
  assert.equal(await runTagJob({ organizationId: orgId, itemId: one }), null, `try ${MAX_ATTEMPTS} is the last: not delivered again`);
  assert.equal((await rows()).find((x) => x.id === one)!.tagAttempts, MAX_ATTEMPTS);
  console.log(`✓ pauses of ${retryAfterS(1)} s and ${retryAfterS(2)} s, then the last try lets go`);

  // Stalled: something waiting over 15 minutes with nothing started in that time. Moving is not stalled.
  const before = (await jobStats()).stalled;
  await db.update(T).set({ tagStatus: "pending", tagStartedAt: sql`now() - interval '20 minutes'` }).where(eq(T.organizationId, orgId));
  assert.equal((await jobStats()).stalled, before + 1, "a workspace with old work and nothing started is stalled");
  await db.update(T).set({ tagStartedAt: sql`now()` }).where(eq(T.id, one));
  assert.equal((await jobStats()).stalled, before, "one started in the last 15 minutes: moving, not stalled");
  console.log("✓ /api/health/deep tells a stalled workspace from a moving one");

  // The sweep's queries run; with no model key it sends no tag job and makes no vector
  delete process.env.OPENROUTER_API_KEY;
  const swept = await sweep();
  assert.equal(swept.workspaces, 0);
  console.log(`✓ the sweep runs (${swept.embeds} vectors to make)`);
}

main()
  .then(async () => { await cleanup(); console.log("\nall good"); process.exit(0); })
  .catch(async (e) => { console.error(e); await cleanup(); process.exit(1); });

async function cleanup() {
  await db.delete(schema.failure).where(eq(schema.failure.organizationId, orgId)).catch(() => {});
  await db.delete(schema.aiUsage).where(eq(schema.aiUsage.organizationId, orgId)).catch(() => {});
  await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
  await db.delete(schema.user).where(eq(schema.user.id, userId));
}
