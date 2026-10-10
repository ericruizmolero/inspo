// Two teams, A and B, one owner each (and each owner's personal workspace). A has real data on every surface;
// B has an extension key, an MCP token and a little of its own, so B's probes reach past the sign-in check.
// Every id and email starts with a random tag, A's with `${tag}a` and B's with `${tag}b`, and cleanup deletes
// only those rows.
import { randomBytes } from "node:crypto";
import { inArray, like, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sha256 } from "@/lib/hash";
import { createExtKey } from "@/lib/ext-keys";
import { ACCESS_PREFIX } from "@/lib/mcp/oauth";
import { webKeyOf } from "@/lib/url";
import { files, UNIT_VECTOR, type Actor } from "../harness";

export type Fixture = Awaited<ReturnType<typeof seed>>;

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

export async function seed() {
  const tag = `iso${randomBytes(4).toString("hex")}`;
  const a = await seedA(`${tag}a`);
  const b = await seedB(`${tag}b`);
  return { tag, a, b };
}

async function person(p: string) {
  const now = new Date();
  const owner: Actor = { id: `${p}-user`, name: `${p} owner`, email: `${p}@example.test`, workspaceId: `${p}-team` };
  await db.insert(schema.user).values({ id: owner.id, name: owner.name, email: owner.email, emailVerified: true, createdAt: now, updatedAt: now });
  await db.insert(schema.organization).values([
    { id: `${p}-team`, name: `${p} team`, slug: `${p}-team`, kind: "team", plan: "agency", createdAt: now },
    { id: `${p}-personal`, name: `${p} personal`, slug: `${p}-personal`, kind: "personal", plan: "agency", createdAt: now },
  ]);
  await db.insert(schema.member).values([
    { id: `${p}-m1`, organizationId: `${p}-team`, userId: owner.id, role: "owner", createdAt: now },
    { id: `${p}-m2`, organizationId: `${p}-personal`, userId: owner.id, role: "owner", createdAt: now },
  ]);
  return owner;
}

async function seedA(p: string) {
  const owner = await person(p);
  const ws = owner.workspaceId;
  const now = new Date();
  /** Written into every name, note and body of A: no answer to B may contain it */
  const secret = `${p}-secret`;
  /** Written only into the project no link shares, and the reference only it holds */
  const unshared = `${secret}-unshared`;

  const thumbKey = `inspo/${ws}/thumbs/${p}.png`;
  const mediaKey = `inspo/${ws}/media/${p}.png`;
  const textKey = `inspo/${ws}/text/${p}.md`;
  const commentKey = `inspo/${ws}/comments/${p}.png`;
  const brandKey = `inspo/${ws}/brand/${p}-shared/logo.png`;
  for (const k of [thumbKey, mediaKey, commentKey, brandKey]) files.set(k, { body: png, contentType: "image/png" });
  files.set(textKey, { body: Buffer.from(`# ${unshared}`), contentType: "text/markdown; charset=utf-8" });

  const web = `https://${p}.example.com`;
  const item = (id: string, w: string, extra: Partial<typeof schema.inspoItem.$inferInsert> = {}) => ({
    id, organizationId: ws, name: `${secret} ${id}`, web: w, webKey: webKeyOf(w), date: now.toISOString().slice(0, 10),
    author: owner.name, createdBy: owner.id, note: secret, tagStatus: "done", createdAt: now, updatedAt: now, ...extra,
  });
  await db.insert(schema.inspoItem).values([
    item(`${p}-item`, web, { thumbnailUrl: `/api/files/${thumbKey}`, embedding: UNIT_VECTOR, embeddingAt: now }),
    item(`${p}-post`, `https://x.com/${p}/status/1`),
    item(`${p}-media`, `/api/files/${mediaKey}`, { thumbnailUrl: `/api/files/${mediaKey}` }),
    item(`${p}-text`, `/api/files/${textKey}`, { name: unshared, note: unshared }),
  ]);

  const project = (id: string, name: string, template: unknown = null) =>
    ({ id, organizationId: ws, name, createdBy: owner.id, template, recipe: secret, brief: { about: secret, clientItemId: `${p}-item` }, createdAt: now, updatedAt: now });
  await db.insert(schema.project).values([
    project(`${p}-shared`, `${secret} shared`),
    project(`${p}-hidden`, unshared),
    project(`${p}-template`, `${secret} template`, { from: "", to: web, about: secret }),
  ]);
  await db.insert(schema.projectItem).values([
    { projectId: `${p}-shared`, itemId: `${p}-item`, organizationId: ws, addedBy: owner.id, createdAt: now },
    { projectId: `${p}-shared`, itemId: `${p}-media`, organizationId: ws, addedBy: owner.id, createdAt: now },
    { projectId: `${p}-hidden`, itemId: `${p}-text`, organizationId: ws, addedBy: owner.id, createdAt: now },
  ]);
  await db.insert(schema.polishVote).values({ projectId: `${p}-shared`, itemId: `${p}-item`, userId: owner.id, organizationId: ws, vote: "keep", updatedAt: now });

  await db.insert(schema.inspoComment).values([
    { id: `${p}-comment`, organizationId: ws, itemId: `${p}-item`, authorId: owner.id, authorName: owner.name, body: secret, attachments: [{ url: `/api/files/${commentKey}`, w: 1, h: 1 }], createdAt: now },
    { id: `${p}-reply`, organizationId: ws, itemId: `${p}-item`, authorId: owner.id, authorName: owner.name, body: secret, parentId: `${p}-comment`, createdAt: now },
  ]);

  for (const [projectId, said] of [[`${p}-shared`, secret], [`${p}-hidden`, unshared]]) {
    await db.insert(schema.projectSystem).values({ projectId, organizationId: ws, summary: said, doc: { head: said }, brand: { logo: { files: [{ key: brandKey }] } }, createdAt: now, updatedAt: now });
    await db.insert(schema.systemArea).values({ projectId, organizationId: ws, area: "color", decision: said, confidence: 80, source: "team", decidedBy: owner.id, why: said, never: said, updatedAt: now });
    await db.insert(schema.systemAreaRevision).values({ id: `${projectId}-rev`, projectId, organizationId: ws, area: "color", decision: said, confidence: 80, source: "team", why: said, authorId: owner.id, authorName: owner.name, createdAt: now });
  }
  await db.insert(schema.systemAreaComment).values([
    { id: `${p}-area-comment`, projectId: `${p}-shared`, organizationId: ws, area: "color", authorId: owner.id, authorName: owner.name, body: secret, createdAt: now },
    { id: `${p}-proposal`, projectId: `${p}-shared`, organizationId: ws, area: "typography", authorId: owner.id, authorName: owner.name, body: secret, about: { proposal: { decision: secret, why: secret, never: "", state: "open" } }, createdAt: now },
  ]);

  const designUrl = webKeyOf(web);
  await db.insert(schema.designDoc).values({ webKey: designUrl, url: designUrl, markdown: `# ${secret}`, model: "m", generatedAt: now, updatedAt: now });
  await db.insert(schema.designRevision).values({ id: `${p}-revision`, organizationId: ws, url: designUrl, authorId: owner.id, authorName: owner.name, kind: "revision", section: "color", comment: secret, summary: secret, specJson: { name: secret }, createdAt: now });
  await db.insert(schema.designWhy).values({ id: `${p}-why`, organizationId: ws, url: designUrl, stamp: "s", model: "m", whyJson: { why: secret }, createdAt: now });

  const shareToken = randomBytes(16).toString("base64url");
  await db.insert(schema.systemShare).values({ id: `${p}-share`, token: shareToken, projectId: `${p}-shared`, organizationId: ws, mode: "full", label: secret, createdBy: owner.id, createdAt: now });

  const { key: extKey, row: extRow } = await createExtKey(owner.id, ws, secret);
  await db.insert(schema.invitation).values({ id: `${p}-invitation`, organizationId: ws, email: `${p}-invitee@example.test`, role: "member", status: "pending", inviterId: owner.id, expiresAt: new Date(+now + 86_400_000), createdAt: now });

  return {
    owner, prefix: p, team: ws, personal: `${p}-personal`, secret, unshared,
    item: `${p}-item`, web, designUrl, post: `https://x.com/${p}/status/1`, invitation: `${p}-invitation`, media: `${p}-media`, text: `${p}-text`,
    comment: `${p}-comment`, reply: `${p}-reply`, areaComment: `${p}-area-comment`, proposal: `${p}-proposal`,
    project: `${p}-shared`, hidden: `${p}-hidden`, template: `${p}-template`, revision: `${p}-revision`,
    share: `${p}-share`, shareToken, extKey, extKeyId: extRow.id,
    keys: { thumb: thumbKey, media: mediaKey, text: textKey, comment: commentKey, brand: brandKey },
  };
}

async function seedB(p: string) {
  const owner = await person(p);
  const ws = owner.workspaceId;
  const now = new Date();
  const web = `https://${p}.example.com`;
  await db.insert(schema.inspoItem).values({ id: `${p}-item`, organizationId: ws, name: "b", web, webKey: webKeyOf(web), date: now.toISOString().slice(0, 10), author: owner.name, createdBy: owner.id, tagStatus: "done", createdAt: now, updatedAt: now });
  await db.insert(schema.project).values({ id: `${p}-project`, organizationId: ws, name: "b", createdBy: owner.id, createdAt: now, updatedAt: now });
  await db.insert(schema.projectItem).values({ projectId: `${p}-project`, itemId: `${p}-item`, organizationId: ws, addedBy: owner.id, createdAt: now });

  const { key: extKey } = await createExtKey(owner.id, ws, "b");
  const mcpToken = ACCESS_PREFIX + randomBytes(24).toString("base64url");
  await db.insert(schema.mcpClient).values({ id: `${p}-client`, name: "Probe", redirectUris: ["http://127.0.0.1/cb"], createdAt: now });
  await db.insert(schema.mcpGrant).values({
    id: `${p}-grant`, clientId: `${p}-client`, userId: owner.id, codeHash: sha256(`${p}-code`), codeExpiresAt: now, codeUsedAt: now,
    codeChallenge: "x", redirectUri: "http://127.0.0.1/cb", accessHash: sha256(mcpToken), accessExpiresAt: new Date(+now + 3_600_000), createdAt: now,
  });

  return { owner, team: ws, personal: `${p}-personal`, item: `${p}-item`, web, project: `${p}-project`, extKey, mcpToken };
}

/** Deletes every row the run made: its users, its workspaces (which cascade to their data) and its MCP client */
export async function cleanup(tag: string) {
  const users = await db.select({ id: schema.user.id }).from(schema.user).where(like(schema.user.email, `${tag}%`));
  const ids = users.map((u) => u.id);
  // A failure recorded in the background may carry no person, only the id it was about
  await db.delete(schema.failure).where(or(ids.length ? inArray(schema.failure.userId, ids) : undefined, like(schema.failure.ref, `%${tag}%`)));
  if (ids.length) {
    const spaces = await db.select({ id: schema.member.organizationId }).from(schema.member).where(inArray(schema.member.userId, ids));
    const orgs = [...new Set(spaces.map((s) => s.id))];
    if (orgs.length) await db.delete(schema.organization).where(inArray(schema.organization.id, orgs));
    await db.delete(schema.user).where(inArray(schema.user.id, ids));
  }
  await db.delete(schema.organization).where(like(schema.organization.id, `${tag}%`));
  await db.delete(schema.mcpClient).where(like(schema.mcpClient.id, `${tag}%`));
  // Shared across workspaces, so no cascade reaches it
  await db.delete(schema.designDoc).where(like(schema.designDoc.url, `https://${tag}%`));
}
