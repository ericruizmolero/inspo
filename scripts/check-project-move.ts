// Check of duplicating a project and moving one to another workspace (lib/project-move.ts). Not a test framework:
// creates two test workspaces with a project, a board, a system, a thread and an uploaded image, checks with assert
// and deletes them when done.
//   npm run check:project-move
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { duplicateProject, moveProject } from "../lib/project-move";
import { deleteFiles, fileExists, fileUrl, keyOf, listFiles, putFile } from "../lib/storage";
import { webKeyOf } from "../lib/url";
import { workspacePrefixes } from "../lib/workspace-delete";

const id = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);
const TAG = `movecheck-${id().slice(0, 8)}`;
const from = id(), to = id(), uid = id();
const T = schema.inspoItem, PI = schema.projectItem;

async function workspace(org: string, kind: "personal" | "team") {
  const now = new Date();
  await db.insert(schema.billingAccount).values({ id: org, name: `${TAG}-${kind}`, plan: "studio" });
  await db.insert(schema.organization).values({ id: org, name: `${TAG}-${kind}`, slug: `${TAG}-${kind}`, createdAt: now, kind, billingAccountId: org });
  await db.insert(schema.member).values({ id: id(), organizationId: org, userId: uid, role: "owner", createdAt: now });
}

async function item(org: string, web: string, extra: Partial<typeof T.$inferInsert> = {}) {
  const now = new Date();
  const row = { id: id(), organizationId: org, name: web, web, webKey: webKeyOf(web), date: "2026-10-13", author: TAG, createdBy: uid, tagStatus: "done", createdAt: now, updatedAt: now, ...extra };
  await db.insert(T).values(row);
  return row.id;
}

async function main() {
  const now = new Date();
  await db.insert(schema.user).values({ id: uid, name: TAG, email: `${TAG}@example.test`, createdAt: now, updatedAt: now });
  await workspace(from, "personal");
  await workspace(to, "team");

  // The old workspace: an uploaded image, a site the team already has, and a site that is also on another project
  const imageUrl = await putFile(`inspo/${from}/media/${TAG}.png`, Buffer.from("png"), "image/png", from);
  const image = await item(from, imageUrl, { thumbnailUrl: imageUrl });
  const shared = await item(from, "https://shared.example.test");
  const kept = await item(from, "https://kept.example.test");
  const teamCopy = await item(to, "https://shared.example.test");
  const pid = id(), other = id();
  await db.insert(schema.project).values([
    { id: pid, organizationId: from, name: "Landing", createdBy: uid, brief: { about: "A landing", clientItemId: shared }, createdAt: now, updatedAt: now },
    { id: other, organizationId: from, name: "Other", createdBy: uid, createdAt: now, updatedAt: now },
  ]);
  await db.insert(PI).values([image, shared, kept].map((itemId) => ({ projectId: pid, itemId, organizationId: from, addedBy: uid, createdAt: now })));
  await db.insert(PI).values({ projectId: other, itemId: kept, organizationId: from, addedBy: uid, createdAt: now });
  await db.insert(schema.projectSystem).values({ projectId: pid, organizationId: from, summary: "Calm", runJson: { itemIds: [image, shared] }, createdAt: now, updatedAt: now });
  await db.insert(schema.systemArea).values({ projectId: pid, organizationId: from, area: "color", decision: "Warm", confidence: 80, evidence: [{ itemId: image, take: "the red" }], source: "team", updatedAt: now });
  const c1 = id();
  await db.insert(schema.inspoComment).values([
    { id: c1, organizationId: from, itemId: image, authorId: uid, authorName: TAG, body: "Nice", createdAt: now },
    { id: id(), organizationId: from, itemId: image, authorId: uid, authorName: TAG, body: "Yes", parentId: c1, createdAt: new Date(now.getTime() + 1) },
  ]);

  // Duplicate: same workspace, same board, same system
  const copy = await duplicateProject(from, pid, "Landing (copy)", uid);
  assert.equal(copy.name, "Landing (copy)");
  assert.deepEqual(new Set(copy.boardIds), new Set([image, shared, kept]));
  const [copyArea] = await db.select().from(schema.systemArea).where(eq(schema.systemArea.projectId, copy.id));
  assert.equal(copyArea.decision, "Warm", "the copy keeps the system");
  const second = await duplicateProject(from, pid, "Landing (copy)", uid);
  assert.equal(second.name, "Landing (copy) (1)", "a second copy takes a free name");
  console.log("✓ duplicate: board, system, free name");
  // Copies keep their references in this workspace: they go, so the move can take them
  await db.delete(schema.project).where(inArray(schema.project.id, [copy.id, second.id]));

  // Move to the team
  const { project, gone } = await moveProject(from, pid, to, { id: uid, name: TAG, email: `${TAG}@example.test` }, true);
  assert.equal(project.name, "Landing");
  const [p] = await db.select().from(schema.project).where(eq(schema.project.id, pid));
  assert.equal(p.organizationId, to, "the project is in the team");
  const board = await db.select().from(PI).where(eq(PI.projectId, pid));
  assert.ok(board.every((l) => l.organizationId === to), "its links are the team's");
  const boardItems = await db.select().from(T).where(inArray(T.id, board.map((l) => l.itemId)));
  assert.equal(boardItems.length, 3);
  assert.ok(boardItems.every((i) => i.organizationId === to), "every reference on it is the team's");
  assert.ok(board.some((l) => l.itemId === teamCopy), "a site the team had is filed as it is there");
  const movedImage = boardItems.find((i) => i.web.includes("/media/"))!;
  assert.ok(movedImage.web.startsWith(fileUrl(`inspo/${to}/`)), "the image file was copied into the team's folder");
  assert.equal(movedImage.thumbnailUrl, movedImage.web);
  assert.ok(await fileExists(keyOf(movedImage.web)!));
  const thread = await db.select().from(schema.inspoComment).where(eq(schema.inspoComment.itemId, movedImage.id));
  assert.equal(thread.length, 2, "its thread came with it");
  assert.ok(thread.some((c) => c.parentId && thread.some((x) => x.id === c.parentId)), "the reply still answers its comment");
  assert.deepEqual((p.brief as { clientItemId: string }).clientItemId, teamCopy, "the brief names the team's reference");
  const [area] = await db.select().from(schema.systemArea).where(eq(schema.systemArea.projectId, pid));
  assert.equal(area.organizationId, to);
  assert.deepEqual(area.evidence, [{ itemId: movedImage.id, take: "the red" }], "the evidence names the team's reference");
  const [system] = await db.select().from(schema.projectSystem).where(eq(schema.projectSystem.projectId, pid));
  assert.deepEqual(system.runJson, { itemIds: [movedImage.id, teamCopy] });

  // Left behind: what was only on this project is gone, with its file; what is on another project stays
  assert.deepEqual(new Set(gone), new Set([image, shared]));
  const left = await db.select({ id: T.id }).from(T).where(and(eq(T.organizationId, from)));
  assert.deepEqual(left.map((r) => r.id), [kept]);
  assert.equal(await fileExists(keyOf(imageUrl)!), false, "the old file went with its card");
  const keptLinks = await db.select().from(PI).where(eq(PI.itemId, kept));
  assert.deepEqual(keptLinks.map((l) => l.projectId), [other], "the other project keeps its reference");
  console.log("✓ move: project, board, files, thread, system and brief in the team; the old space keeps what is elsewhere");
}

main()
  .catch((e) => { console.error("✗", e); process.exitCode = 1; })
  .finally(async () => {
    for (const org of [from, to]) {
      for (const prefix of workspacePrefixes(org)) await deleteFiles((await listFiles(prefix).catch(() => [])).map((f) => f.key));
      await db.delete(schema.organization).where(eq(schema.organization.id, org));
      await db.delete(schema.billingAccount).where(eq(schema.billingAccount.id, org));
    }
    await db.delete(schema.user).where(eq(schema.user.id, uid));
  });
