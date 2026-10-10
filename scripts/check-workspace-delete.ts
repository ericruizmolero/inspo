// Check of exporting and deleting a workspace (lib/workspace-export.ts, lib/workspace-delete.ts). Not a test
// framework: seeds a throwaway team with a row in every table it can reach and a file under each of its storage
// prefixes, exports it, deletes it, deletes it again, and asserts nothing is left with its id. Every table with an
// organization_id column is read from information_schema, so a table added later is covered without touching this.
// Storage is always the local driver (.data/files): the R2_* variables are dropped before anything loads.
//   npm run check:workspace-delete
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
for (const k of Object.keys(process.env)) if (k.startsWith("R2_")) delete process.env[k];
import assert from "node:assert/strict";
import { eq, inArray, sql } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { newId, HttpError } from "../lib/workspace-core";
import { addItem, deleteItem } from "../lib/items";
import { createProject } from "../lib/projects";
import { putFile, listFiles, usingR2 } from "../lib/storage";
import { buildWorkspaceExport, WORKSPACE_EXPORT_VERSION, type WorkspaceExport } from "../lib/workspace-export";
import { deleteWorkspace, workspacePrefixes } from "../lib/workspace-delete";

async function main() {
  assert.equal(usingR2(), false, "storage is the local driver");
  const now = new Date();
  const orgId = newId(), personalId = newId(), userId = newId();
  const name = `Delete check ${orgId.slice(0, 6)}`;
  const usageIds = [newId(), newId()];

  await db.insert(schema.user).values({ id: userId, name: "check", email: `check-${userId}@example.invalid`, createdAt: now, updatedAt: now });
  await db.insert(schema.organization).values([
    { id: orgId, name, slug: `check-${orgId}`, createdAt: now, kind: "team" },
    { id: personalId, name: "check", slug: `p-check-${personalId}`, createdAt: now, kind: "personal" },
  ]);
  try {
    await db.insert(schema.member).values([
      { id: newId(), organizationId: orgId, userId, role: "owner", createdAt: now },
      { id: newId(), organizationId: personalId, userId, role: "owner", createdAt: now },
    ]);
    await db.insert(schema.session).values({ id: newId(), token: newId(), userId, activeOrganizationId: orgId, expiresAt: new Date(Date.now() + 864e5), createdAt: now, updatedAt: now });
    await db.insert(schema.invitation).values({ id: newId(), organizationId: orgId, email: `invitee-${orgId}@example.invalid`, role: "member", status: "pending", inviterId: userId, expiresAt: new Date(Date.now() + 864e5), createdAt: now });

    const thumb = await putFile(`inspo/${orgId}/thumbs/${Date.now()}-a.jpg`, Buffer.from("thumb"), "image/jpeg");
    const shot = await putFile(`inspo/${orgId}/comments/${Date.now()}-b.png`, Buffer.from("shot"), "image/png");
    await putFile(`inspo/${orgId}/media/${Date.now()}-c.png`, Buffer.from("media"), "image/png");
    await putFile(`inspo/design-why/${orgId}/${Date.now()}-d.jpg`, Buffer.from("why"), "image/jpeg");

    const item = { id: (await addItem(orgId, { name: "Kept", web: "https://kept.delete-check.example", author: "check", createdBy: userId })).id! };
    const gone = { id: (await addItem(orgId, { name: "Gone", web: "https://gone.delete-check.example", author: "check", createdBy: userId })).id! };
    await db.update(schema.inspoItem).set({ thumbnailUrl: thumb }).where(eq(schema.inspoItem.id, item.id));
    // A deleted item leaves a tombstone keyed by the workspace, with no foreign key to it
    assert.equal(await deleteItem(orgId, gone.id), true);
    await db.insert(schema.inspoComment).values({ id: newId(), organizationId: orgId, itemId: item.id, authorId: userId, authorName: "check", body: "a comment", attachments: [{ url: shot, w: 1, h: 1 }], createdAt: now });

    const project = await createProject(orgId, "Project", userId);
    await db.insert(schema.projectItem).values({ projectId: project.id, itemId: item.id, organizationId: orgId, addedBy: userId, createdAt: now });
    await db.insert(schema.systemArea).values({ projectId: project.id, organizationId: orgId, area: "color", decision: "Warm paper", confidence: 60, source: "team", updatedAt: now });
    await db.insert(schema.systemAreaComment).values({ id: newId(), projectId: project.id, organizationId: orgId, area: "color", authorId: userId, authorName: "check", body: "an area comment", createdAt: now });
    await db.insert(schema.systemAreaRevision).values({ id: newId(), projectId: project.id, organizationId: orgId, area: "color", decision: "Warm paper", confidence: 60, source: "team", authorId: userId, authorName: "check", createdAt: now });
    await db.insert(schema.designRevision).values({ id: newId(), organizationId: orgId, url: "https://kept.delete-check.example", authorId: userId, authorName: "check", comment: "a revision", specJson: {}, createdAt: now });
    await db.insert(schema.aiUsage).values(usageIds.map((id) => ({ id, organizationId: orgId, userId, action: "system", model: "check", costMicros: 1200, createdAt: now })));
    await db.insert(schema.captureClaim).values([
      { key: `system:${orgId}|${project.id}`, claimedAt: now },
      { key: `brand:${orgId}|${project.id}`, claimedAt: now },
    ]);
    await db.insert(schema.rateLimit).values({ id: newId(), key: `app:shot:${orgId}`, count: 1, lastRequest: Date.now() });

    const built = await buildWorkspaceExport(orgId);
    assert.ok(built, "the workspace exports");
    const file = JSON.parse(JSON.stringify(built)) as WorkspaceExport;
    assert.equal(file.version, WORKSPACE_EXPORT_VERSION);
    assert.equal(file.workspace.name, name);
    assert.deepEqual(file.members.map((m) => [m.userId, m.role, m.email]), [[userId, "owner", `check-${userId}@example.invalid`]], "members with their email");
    assert.deepEqual(file.items.map((i) => i.name), ["Kept"], "the items that exist");
    assert.ok(!("embedding" in file.items[0]) && !("organizationId" in file.items[0]), "no embedding, no workspace id per row");
    assert.equal(file.items[0].thumbnailUrl, thumb, "files stay as their paths");
    assert.deepEqual(file.projects.map((p) => p.name), ["Project"]);
    assert.equal(file.projectItems.length, 1);
    assert.equal(file.systemAreas[0]?.decision, "Warm paper");
    assert.deepEqual(file.comments.items.map((c) => c.body), ["a comment"]);
    assert.deepEqual(file.comments.areas.map((c) => c.body), ["an area comment"]);
    assert.deepEqual(file.revisions.design.map((r) => r.comment), ["a revision"]);
    assert.equal(file.revisions.areas.length, 1);
    assert.deepEqual(file.aiUsage.map((u) => u.id).sort(), [...usageIds].sort(), "AI spend");
    assert.equal(typeof file.exportedAt, "string", "dates are ISO strings in the file");

    await assert.rejects(deleteWorkspace(personalId), (e) => e instanceof HttpError && e.status === 403, "personal space refused");
    assert.equal((await db.select().from(schema.organization).where(eq(schema.organization.id, personalId))).length, 1, "personal space still there");

    const first = await deleteWorkspace(orgId);
    assert.deepEqual(first, { files: 4, storageClean: true }, "four files deleted, storage clean");
    const again = await deleteWorkspace(orgId);
    assert.deepEqual(again, { files: 0, storageClean: true }, "a second run finds nothing and still converges");

    const { rows: tables } = await db.execute<{ table_name: string }>(sql`
      select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'organization_id' order by table_name`);
    assert.ok(tables.length >= 20, `found ${tables.length} tables with organization_id`);
    for (const { table_name } of tables) {
      const { rows: [r] } = await db.execute<{ n: number }>(sql`select count(*)::int as n from ${sql.identifier(table_name)} where organization_id = ${orgId}`);
      assert.equal(r.n, 0, `${table_name} has no row of the deleted workspace`);
    }
    const left = async (q: ReturnType<typeof sql>) => (await db.execute<{ n: number }>(q)).rows[0].n;
    assert.equal(await left(sql`select count(*)::int as n from capture_claim where position(${orgId} in key) > 0`), 0, "no claim names it");
    assert.equal(await left(sql`select count(*)::int as n from rate_limit where position(${orgId} in key) > 0`), 0, "no rate counter names it");
    assert.equal(await left(sql`select count(*)::int as n from session where active_organization_id = ${orgId}`), 0, "no session has it open");

    const usage = await db.select().from(schema.aiUsage).where(inArray(schema.aiUsage.id, usageIds));
    assert.equal(usage.length, 2, "AI spend survives the delete");
    for (const u of usage) {
      assert.equal(u.organizationId, null, "detached from the workspace");
      assert.equal(u.organizationName, name, "with the workspace's name");
      assert.equal(u.costMicros, 1200);
    }

    for (const prefix of workspacePrefixes(orgId)) assert.deepEqual(await listFiles(prefix), [], `nothing under ${prefix}`);
    console.log(`check:workspace-delete ok (${tables.length} tables with organization_id, all empty for the deleted team)`);
  } finally {
    await db.delete(schema.aiUsage).where(inArray(schema.aiUsage.id, usageIds));
    await db.delete(schema.organization).where(inArray(schema.organization.id, [orgId, personalId]));
    await db.delete(schema.libraryTombstone).where(eq(schema.libraryTombstone.organizationId, orgId));
    await db.delete(schema.user).where(eq(schema.user.id, userId));
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
