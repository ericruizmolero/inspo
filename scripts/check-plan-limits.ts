// Check of the free plan's room against the local database (#124): 200 references with the sample project's left
// out, 1 GB of files, an import that stops at the cap, and one free workspace each. Creates a test workspace and two
// people, checks with assert and deletes them when done. Files go to the local .data/files: with R2_* set it stops.
//   npm run check:limits
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";

const id = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);
const TAG = `limitcheck-${id().slice(0, 8)}`;

async function main() {
  const { db, pool, schema } = await import("../lib/db");
  const { usingR2, putFile, deleteFiles } = await import("../lib/storage");
  if (usingR2()) throw new Error("R2_* is set: this check writes files, run it against the local storage");
  const { PLANS, isPaid } = await import("../lib/plans");
  const { addItem } = await import("../lib/items");
  const { addMany } = await import("../lib/add-many");
  const { countItems, storageUsed, newTeamRefusal, assertRoom } = await import("../lib/quota");
  const { TEMPLATE_AUTHOR } = await import("../lib/sample-items");
  const { auth } = await import("../lib/auth");
  const { HttpError } = await import("../lib/workspace-core");
  const free = PLANS.find((p) => !isPaid(p))!, paid = PLANS.find(isPaid)!;

  const orgs: string[] = [], users: string[] = [];
  const now = new Date();
  const newUser = async (n: string) => {
    const uid = id();
    await db.insert(schema.user).values({ id: uid, name: `${TAG}-${n}`, email: `${TAG}-${n}@example.test`, createdAt: now, updatedAt: now });
    users.push(uid);
    return uid;
  };
  const newOrg = async (owner: string, kind: "personal" | "team", plan: string) => {
    const oid = id();
    await db.insert(schema.organization).values({ id: oid, name: `${TAG}-${kind}`, slug: `${TAG}-${oid}`, createdAt: now, kind, plan });
    await db.insert(schema.member).values({ id: id(), organizationId: oid, userId: owner, role: "owner", createdAt: now });
    orgs.push(oid);
    return oid;
  };
  const items = (org: string, n: number, from: number, author = "someone") => Array.from({ length: n }, (_, i) => ({
    id: id(), organizationId: org, name: `ref ${from + i}`, web: `https://${TAG}-${from + i}.invalid`, webKey: `${TAG}-${from + i}.invalid`,
    date: "2026-10-10", author, createdAt: now, updatedAt: now,
  }));
  const as402 = async (p: Promise<unknown>) => {
    try { await p; } catch (e) { if (e instanceof HttpError && e.status === 402) return e.message; throw e; }
    return null;
  };

  try {
    const owner = await newUser("owner");
    const ws = await newOrg(owner, "personal", free.key);
    const who = { workspaceId: ws, user: { id: owner, name: "Owner", email: `${TAG}-owner@example.test` } };

    // 1. The sample project's references don't count, a person who signs as Criterio does
    await db.insert(schema.inspoItem).values(items(ws, 198, 0));
    await db.insert(schema.inspoItem).values(items(ws, 1, 198, TEMPLATE_AUTHOR));
    const samples = items(ws, 5, 500, TEMPLATE_AUTHOR);
    await db.insert(schema.inspoItem).values(samples);
    const tpl = id();
    await db.insert(schema.project).values({ id: tpl, organizationId: ws, name: `${TAG} template`, template: { about: "" }, createdAt: now, updatedAt: now });
    await db.insert(schema.projectItem).values(samples.map((s) => ({ projectId: tpl, itemId: s.id, organizationId: ws, createdAt: now })));
    assert.equal(await countItems(ws), 199, "204 rows, 5 of them the template's: 199 count");
    console.log("✓ 199 counted: the 5 a template brought are left out, the one signed Criterio by hand is not");

    // 2. The 200th reference saves, the 201st is refused with the plan's message
    const ok = await addItem(ws, { name: "200th", web: `https://${TAG}-200.invalid`, author: "Owner", createdBy: owner });
    assert.ok(ok.id, "the 200th reference is saved");
    const refused = await as402(addItem(ws, { name: "201st", web: `https://${TAG}-201.invalid`, author: "Owner", createdBy: owner }));
    assert.ok(refused, "the 201st reference is refused with a 402");
    assert.match(refused!, /200 references.*Viewing, searching and exporting still work/);
    assert.equal(await countItems(ws), 200);
    console.log(`✓ the 200th saves, the 201st answers 402: "${refused}"`);

    // 3. An import of 25 at 190 brings in 10 and says 15 stayed out
    await db.delete(schema.inspoItem).where(inArray(schema.inspoItem.id, [ok.id!]));
    await db.delete(schema.inspoItem).where(inArray(schema.inspoItem.webKey, items(ws, 9, 189).map((r) => r.webKey)));
    assert.equal(await countItems(ws), 190);
    const refs = Array.from({ length: 25 }, (_, i) => ({ url: `https://${TAG}-import-${i}.invalid`, title: `Imported ${i}` }));
    const run = await addMany(who, refs, { source: "check" });
    const by = (s: string) => run.results.filter((r) => r.status === s).length;
    assert.equal(by("added"), 10, "10 fit");
    assert.equal(by("full"), 15, "15 stay out");
    assert.ok(run.full && /200 references/.test(run.full), "the import says why");
    assert.equal(await countItems(ws), 200, "the library stops at the cap");
    console.log(`✓ an import of 25 at 190: ${by("added")} added, ${by("full")} left out, ${await countItems(ws)} in the library`);

    // 4. Storage: a file that would pass 1 GB is refused before it is written, one that fits is recorded, a delete frees it
    await db.insert(schema.storedFile).values({ key: `inspo/${ws}/media/${TAG}-big.bin`, organizationId: ws, bytes: free.storageMaxBytes! - 10 });
    const key = `inspo/${ws}/media/${TAG}-small.png`;
    const tooBig = await as402(putFile(key, Buffer.alloc(11), "image/png", ws));
    assert.ok(tooBig && /1 GB of files/.test(tooBig), "11 bytes over the 10 left: 402");
    await putFile(key, Buffer.alloc(10), "image/png", ws);
    assert.equal(await storageUsed(ws), free.storageMaxBytes, "10 bytes fill it exactly");
    await putFile(key, Buffer.alloc(4), "image/png", ws);
    assert.equal(await storageUsed(ws), free.storageMaxBytes! - 6, "writing over a file counts its new size, not both");
    await deleteFiles([key]);
    assert.equal(await storageUsed(ws), free.storageMaxBytes! - 10, "a deleted file frees its bytes");
    await putFile(`inspo/pages/${TAG}.jpg`, Buffer.alloc(100), "image/jpeg");
    assert.equal(await storageUsed(ws), free.storageMaxBytes! - 10, "a shared capture is nobody's");
    await deleteFiles([`inspo/pages/${TAG}.jpg`]);
    await assertRoom({ id: ws, plan: free.key }, {});
    console.log(`✓ storage: "${tooBig}"`);

    // 5. A paid plan has no cap
    await assertRoom({ id: ws, plan: paid.key }, { items: 1000, bytes: 50 * 1024 ** 3 });
    console.log(`✓ on ${paid.name} the same workspace has room`);

    // 6. One free workspace each, through Better Auth's own hook
    const create = (userId: string) => auth.api.createOrganization({ body: { name: `${TAG} team`, slug: `${TAG}-${id()}`, userId } })
      .then((o) => { if (o?.id) orgs.push(o.id); return { ok: true as const, id: o?.id }; })
      .catch((e: { status?: string; body?: { message?: string }; message?: string }) => ({ ok: false as const, status: e.status, message: e.body?.message ?? e.message }));
    assert.ok(await newTeamRefusal(owner), "only the personal space: refused");
    const second = await create(owner);
    assert.equal(second.ok, false, "a second free workspace is not created");
    assert.equal(second.ok ? "" : second.status, "FORBIDDEN");
    console.log(`✓ only free workspaces: refused, "${second.ok ? "" : second.message}"`);
    const payer = await newUser("payer");
    await newOrg(payer, "personal", free.key);
    await newOrg(payer, "team", paid.key);
    assert.equal(await newTeamRefusal(payer), null);
    const third = await create(payer);
    assert.equal(third.ok, true, `with a paid workspace a team is created: ${JSON.stringify(third)}`);
    console.log("✓ owner of a paid workspace: the team is created");
    console.log("check:limits ok");
  } finally {
    if (orgs.length) await db.delete(schema.organization).where(inArray(schema.organization.id, orgs));
    if (users.length) await db.delete(schema.user).where(inArray(schema.user.id, users));
    await db.delete(schema.storedFile).where(eq(schema.storedFile.key, `inspo/pages/${TAG}.jpg`));
    await pool.end();
  }
}

main().catch((e) => { console.error("✗", e); process.exitCode = 1; });
