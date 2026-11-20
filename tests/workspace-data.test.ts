// A workspace's data leaving and coming back, and a client's workspace leaving an agency's plan, run through the real
// doors as the people who click them: the export route (owners and admins), the import route (whoever pays for the
// plan), and Settings, Plan's "Let go". Storage is the in-memory bucket of tests/setup.ts; mail is recorded.
import { randomBytes } from "node:crypto";
import { eq, inArray, like, or } from "drizzle-orm";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { ensurePersonalWorkspace } from "@/lib/workspace-core";
import { webKeyOf } from "@/lib/url";
import { bufferSource, openZip, zip } from "@/lib/zip";
import { GET as exportRoute } from "@/app/api/workspace/export/route";
import { POST as importRoute } from "@/app/api/workspace/import/route";
import { letWorkspaceGo } from "@/app/actions/billing";
import { MAX_IMPORT_FILES } from "@/lib/workspace-import";
import type { Mail } from "@/lib/mail-templates";
import { actAs, files, reached, type Actor } from "./harness";

vi.mock("@/lib/mail", async (importOriginal) => {
  const { reached, checkedMail } = await import("./harness");
  return {
    ...(await importOriginal<object>()),
    sendMail: async (to: string | string[], m: Mail) => { reached.push(["mail", { to: [to].flat(), ...checkedMail(m) }]); },
  };
});

const tag = `wsdata${randomBytes(4).toString("hex")}`;
const SRC = `${tag}-src`, CLIENT = `${tag}-client`, OTHER = `${tag}-other`, DEST = `${tag}-dest`;
const person = (who: string, workspaceId = SRC): Actor => ({ id: `${tag}-${who}`, name: `${tag} ${who}`, email: `${tag}-${who}@example.test`, workspaceId });
const payer = person("payer"), admin = person("admin"), member = person("member"), client = person("client", CLIENT), solo = person("solo");
const people = [payer, admin, member, client, solo];
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const key = (rest: string) => `inspo/${SRC}/${rest}`;
const url = (rest: string) => `/api/files/${key(rest)}`;
const imported: string[] = [];

beforeAll(async () => {
  const now = new Date();
  await db.insert(schema.user).values(people.map((p) => ({ id: p.id, name: p.name, email: p.email, emailVerified: true, createdAt: now, updatedAt: now })));
  solo.workspaceId = await ensurePersonalWorkspace(solo.id, solo.name, solo.email, "en");
  await db.insert(schema.billingAccount).values([
    { id: `${tag}-agency`, name: `${tag} Studio`, plan: "agency", ownerUserId: payer.id },
    { id: `${tag}-elsewhere`, name: `${tag} elsewhere`, plan: "agency", ownerUserId: client.id },
  ]);
  await db.insert(schema.organization).values([
    { id: SRC, name: `${tag} Source`, slug: SRC, kind: "team", billingAccountId: `${tag}-agency`, createdAt: now },
    { id: CLIENT, name: `${tag} Client`, slug: CLIENT, kind: "team", billingAccountId: `${tag}-agency`, createdAt: now },
    { id: OTHER, name: `${tag} Other`, slug: OTHER, kind: "team", billingAccountId: `${tag}-elsewhere`, createdAt: now },
    { id: DEST, name: `${tag} Dest`, slug: DEST, kind: "team", billingAccountId: `${tag}-agency`, createdAt: now },
  ]);
  await db.insert(schema.member).values([
    { id: `${tag}-m1`, organizationId: SRC, userId: payer.id, role: "owner", createdAt: now },
    { id: `${tag}-m2`, organizationId: SRC, userId: admin.id, role: "admin", createdAt: now },
    { id: `${tag}-m3`, organizationId: SRC, userId: member.id, role: "member", createdAt: now },
    { id: `${tag}-m4`, organizationId: CLIENT, userId: client.id, role: "owner", createdAt: now },
    { id: `${tag}-m5`, organizationId: OTHER, userId: client.id, role: "owner", createdAt: now },
    { id: `${tag}-m6`, organizationId: DEST, userId: payer.id, role: "owner", createdAt: now },
  ]);

  // Three references: a site with a thumbnail, an uploaded picture, and one whose thumbnail names another workspace's file
  for (const rest of ["thumbs/site.png", "media/pic.png", "comments/shot.png", "brand/p/logo.png"]) files.set(key(rest), { body: png, contentType: "image/png" });
  files.set(`inspo/${OTHER}/thumbs/secret.png`, { body: png, contentType: "image/png" });
  await db.insert(schema.storedFile).values(["thumbs/site.png", "media/pic.png", "comments/shot.png", "brand/p/logo.png"].map((r) => ({ key: key(r), organizationId: SRC, bytes: png.length })));
  const item = (id: string, web: string, extra: Partial<typeof schema.inspoItem.$inferInsert> = {}) => ({
    id: `${tag}-${id}`, organizationId: SRC, name: id, web, webKey: webKeyOf(web), date: "2026-11-20", author: payer.name, createdBy: payer.id,
    note: `${id} note`, tagStatus: "done", tagsJson: { v: 1 } as never, createdAt: now, updatedAt: now, ...extra,
  });
  await db.insert(schema.inspoItem).values([
    item("site", "https://site.example.com", { thumbnailUrl: url("thumbs/site.png") }),
    item("pic", url("media/pic.png")),
    item("foreign", "https://foreign.example.com", { thumbnailUrl: `/api/files/inspo/${OTHER}/thumbs/secret.png` }),
  ]);
  await db.insert(schema.project).values({ id: `${tag}-p`, organizationId: SRC, name: "Landing", createdBy: payer.id, brief: { clientItemId: `${tag}-site` }, createdAt: now, updatedAt: now });
  await db.insert(schema.projectItem).values([`${tag}-site`, `${tag}-pic`].map((itemId) => ({ projectId: `${tag}-p`, itemId, organizationId: SRC, addedBy: payer.id, createdAt: now })));
  await db.insert(schema.projectSystem).values({ projectId: `${tag}-p`, organizationId: SRC, summary: "Calm", brand: { logo: { key: key("brand/p/logo.png") } }, createdAt: now, updatedAt: now });
  await db.insert(schema.systemArea).values({ projectId: `${tag}-p`, organizationId: SRC, area: "color", decision: "Ink on paper", evidence: [{ itemId: `${tag}-site`, take: "the ink" }], source: "team", decidedBy: admin.id, updatedAt: now });
  await db.insert(schema.inspoComment).values([
    { id: `${tag}-c1`, organizationId: SRC, itemId: `${tag}-site`, authorId: admin.id, authorName: "Ana", body: "Love the ink", attachments: [{ url: url("comments/shot.png"), w: 1, h: 1 }], reactions: [{ e: "👍", u: payer.id, n: payer.name }], createdAt: now },
    { id: `${tag}-c2`, organizationId: SRC, itemId: `${tag}-site`, authorId: payer.id, authorName: "Bea", body: "Agreed", parentId: `${tag}-c1`, createdAt: new Date(+now + 1000) },
  ]);
  await db.insert(schema.systemAreaComment).values({ id: `${tag}-ac`, projectId: `${tag}-p`, organizationId: SRC, area: "color", authorId: admin.id, authorName: "Ana", body: "Warmer?", about: { itemId: `${tag}-site` }, createdAt: now });
});

afterAll(async () => {
  actAs(null);
  const ids = people.map((p) => p.id);
  const spaces = await db.select({ id: schema.member.organizationId }).from(schema.member).where(inArray(schema.member.userId, ids));
  if (spaces.length) await db.delete(schema.organization).where(inArray(schema.organization.id, spaces.map((s) => s.id)));
  await db.delete(schema.organization).where(like(schema.organization.id, `${tag}%`));
  await db.delete(schema.billingAccount).where(or(inArray(schema.billingAccount.ownerUserId, ids), like(schema.billingAccount.id, `${tag}%`)));
  await db.delete(schema.user).where(inArray(schema.user.id, ids));
  for (const k of [...files.keys()]) if (k.includes(tag) || imported.some((id) => k.includes(id))) files.delete(k);
});

const exportAs = async (who: Actor) => { actAs(who); return exportRoute(new NextRequest(`http://localhost/api/workspace/export?id=${SRC}`)); };
const importAs = async (who: Actor, body: Buffer, into: "open" | "new" = "open") => {
  actAs(who);
  const res = await importRoute(new NextRequest(`http://localhost/api/workspace/import?into=${into}`, { method: "POST", headers: { "content-type": "application/zip" }, body: new Uint8Array(body) }));
  return { status: res.status, body: await res.json() as { id?: string; error?: string; quota?: boolean; items?: number; projects?: number } };
};
const zipOf = async (res: Response) => Buffer.from(await res.arrayBuffer());
const rowsOf = async (id: string) => ({
  items: await db.select().from(schema.inspoItem).where(eq(schema.inspoItem.organizationId, id)),
  projects: await db.select().from(schema.project).where(eq(schema.project.organizationId, id)),
  links: await db.select().from(schema.projectItem).where(eq(schema.projectItem.organizationId, id)),
  systems: await db.select().from(schema.projectSystem).where(eq(schema.projectSystem.organizationId, id)),
  areas: await db.select().from(schema.systemArea).where(eq(schema.systemArea.organizationId, id)),
  comments: await db.select().from(schema.inspoComment).where(eq(schema.inspoComment.organizationId, id)),
  areaComments: await db.select().from(schema.systemAreaComment).where(eq(schema.systemAreaComment.organizationId, id)),
  files: await db.select().from(schema.storedFile).where(eq(schema.storedFile.organizationId, id)),
});
const countsOf = async (id: string) => Object.fromEntries(Object.entries(await rowsOf(id)).map(([k, v]) => [k, v.length]));
const SOURCE_COUNTS = { items: 3, projects: 1, links: 2, systems: 1, areas: 1, comments: 2, areaComments: 1, files: 4 };

test("owners and admins export the workspace as a zip with its files; a member may not", async () => {
  const refused = await exportAs(member);
  expect(refused.status, "a member is refused").toBe(403);

  const res = await exportAs(admin);
  expect(res.status, "an admin exports").toBe(200);
  expect(res.headers.get("content-type")).toBe("application/zip");
  expect(res.headers.get("content-disposition")).toMatch(/criterio-.*\.zip"/);
  const entries = await openZip(bufferSource(await zipOf(res)));
  expect([...entries.keys()].sort(), "the rows and every file they point at, nothing of another workspace's").toEqual(
    ["files/brand/p/logo.png", "files/comments/shot.png", "files/media/pic.png", "files/thumbs/site.png", "workspace.json"]);
  expect((await entries.get("files/media/pic.png")!.read()).equals(png), "a file comes out byte for byte").toBe(true);
  const json = JSON.parse((await entries.get("workspace.json")!.read()).toString("utf8"));
  expect(json.files).toHaveLength(4);
  expect(json.items).toHaveLength(3);
});

test("the zip round-trips as a new team: the same references, projects, comments and files, all with new ids", async () => {
  const exported = await zipOf(await exportAs(payer));
  const { status, body } = await importAs(payer, exported, "new");
  expect(status, JSON.stringify(body)).toBe(201);
  const id = body.id!;
  imported.push(id);

  const [ws] = await db.select().from(schema.organization).where(eq(schema.organization.id, id));
  expect(ws, "a new team on the payer's plan").toMatchObject({ kind: "team", billingAccountId: `${tag}-agency`, name: `${tag} Source` });
  expect(await db.select({ userId: schema.member.userId, role: schema.member.role }).from(schema.member).where(eq(schema.member.organizationId, id)),
    "the importer is its one member, its owner").toEqual([{ userId: payer.id, role: "owner" }]);

  const got = await rowsOf(id);
  expect(Object.fromEntries(Object.entries(got).map(([k, v]) => [k, v.length])), "the same counts as the source").toEqual(SOURCE_COUNTS);

  // Nothing links back: no row names the source workspace, its ids, or its people other than the importer
  const text = JSON.stringify(got);
  for (const old of ["site", "pic", "foreign", "p", "c1", "c2", "ac"]) expect(text, `no source id: ${old}`).not.toContain(`"${tag}-${old}"`);
  expect(text, "no path or id of the source workspace").not.toContain(SRC);
  expect(text, "no other person").not.toContain(admin.id);
  expect(got.files.every((f) => f.key.startsWith(`inspo/${id}/`) && files.has(f.key)), "files copied into the new folder").toBe(true);

  const site = got.items.find((i) => i.name === "site")!, pic = got.items.find((i) => i.name === "pic")!, foreign = got.items.find((i) => i.name === "foreign")!;
  expect(site.thumbnailUrl).toBe(`/api/files/inspo/${id}/thumbs/site.png`);
  expect(pic.web).toBe(`/api/files/inspo/${id}/media/pic.png`);
  expect(foreign.thumbnailUrl, "another workspace's file is not pointed at").toBeNull();
  expect(got.items.every((i) => i.createdBy === payer.id && i.tagStatus === "done")).toBe(true);
  expect(got.projects[0].brief, "the brief names the new reference").toEqual({ clientItemId: site.id });
  expect(got.systems[0].brand).toEqual({ logo: { key: `inspo/${id}/brand/p/logo.png` } });
  expect(got.areas[0]).toMatchObject({ evidence: [{ itemId: site.id, take: "the ink" }], decidedBy: null });

  const thread = got.comments.find((c) => !c.parentId)!, reply = got.comments.find((c) => c.parentId)!;
  expect(thread, "a comment is the importer's, led by its author's name").toMatchObject({ authorId: payer.id, authorName: payer.name, body: "Ana: Love the ink", reactions: [], itemId: site.id });
  expect(thread.attachments).toEqual([{ url: `/api/files/inspo/${id}/comments/shot.png`, w: 1, h: 1 }]);
  expect(reply).toMatchObject({ parentId: thread.id, body: "Bea: Agreed" });
  expect(got.areaComments[0]).toMatchObject({ authorId: payer.id, body: "Ana: Warmer?", about: { itemId: site.id } });

  // And it exports again to the same zip shape
  actAs({ ...payer, workspaceId: id });
  const again = await openZip(bufferSource(await zipOf(await exportRoute(new NextRequest(`http://localhost/api/workspace/export?id=${id}`)))));
  expect(again.size, "the same five entries").toBe(5);
});

test("the zip round-trips into the workspace that is open, and a second time adds only what is not there yet", async () => {
  const exported = await zipOf(await exportAs(payer));
  const into = { ...payer, workspaceId: DEST };
  const first = await importAs(into, exported);
  expect(first, "added to the open workspace").toEqual({ status: 201, body: { id: DEST, name: `${tag} Dest`, items: 3, projects: 1 } });
  expect(await countsOf(DEST), "the same counts as the source").toEqual(SOURCE_COUNTS);
  const got = await rowsOf(DEST);
  expect(JSON.stringify(got), "no path or id of the source workspace").not.toContain(SRC);
  const site = got.items.find((i) => i.name === "site")!;
  expect(got.comments.find((c) => !c.parentId), "comments are the importer's, led by their author's name").toMatchObject({ authorId: payer.id, body: "Ana: Love the ink", itemId: site.id });
  expect(got.items.find((i) => i.name === "foreign")!.thumbnailUrl, "another workspace's file is dropped").toBeNull();

  // Again: the references, their threads and their files are the ones already there; the project takes a free name
  const second = await importAs(into, exported);
  expect(second.body, JSON.stringify(second.body)).toMatchObject({ items: 0, projects: 1 });
  expect(await countsOf(DEST)).toEqual({ ...SOURCE_COUNTS, projects: 2, links: 4, systems: 2, areas: 2, areaComments: 2 });
  const projects = (await rowsOf(DEST)).projects.map((p) => p.name).sort();
  expect(projects, "a name that is taken gets the first free one").toEqual(["Landing", "Landing (1)"]);
});

test("an import as a new team that the plan cannot hold is refused with the upgrade notice, and nothing is made", async () => {
  const exported = await zipOf(await exportAs(payer));
  const before = await db.select({ id: schema.member.organizationId }).from(schema.member).where(eq(schema.member.userId, solo.id));
  const { status, body } = await importAs(solo, exported, "new");
  expect(status).toBe(402);
  expect(body, "the plan's limit, with the plan that lifts it").toMatchObject({ quota: true });
  expect(await db.select({ id: schema.member.organizationId }).from(schema.member).where(eq(schema.member.userId, solo.id)), "no workspace made").toEqual(before);
});

test("Free imports into its open workspace: refused up front, saying what does not fit, then in once there is room", async () => {
  const exported = await zipOf(await exportAs(payer));
  const now = new Date();
  await db.insert(schema.project).values({ id: `${tag}-solo-p`, organizationId: solo.workspaceId, name: "Mine", createdBy: solo.id, createdAt: now, updatedAt: now });
  const refused = await importAs(solo, exported);
  expect(refused.status).toBe(402);
  expect(refused.body, "the upgrade notice, with how much does not fit").toMatchObject({ quota: true, upgrade: "duo" });
  expect(refused.body.error).toMatch(/brings 1 project and the Free plan has no room for more/);
  expect(await countsOf(solo.workspaceId), "nothing written").toMatchObject({ items: 0, projects: 1, links: 0, comments: 0, files: 0 });
  expect([...files.keys()].some((k) => k.startsWith(`inspo/${solo.workspaceId}/`)), "no file written").toBe(false);

  await db.delete(schema.project).where(eq(schema.project.id, `${tag}-solo-p`));
  const { status, body } = await importAs(solo, exported);
  expect(status, JSON.stringify(body)).toBe(201);
  expect(await countsOf(solo.workspaceId), "within Free's 12 references and its project").toEqual(SOURCE_COUNTS);
});

test("an export with more files than one import copies in time is refused before anything is written", async () => {
  const from = `${tag}-big`, n = MAX_IMPORT_FILES + 1, now = new Date().toISOString();
  const items = Array.from({ length: n }, (_, i) => ({ id: `${tag}-big${i}`, name: `f${i}`, web: `/api/files/inspo/${from}/media/f${i}.png`, author: "x", date: "2026-11-20", createdAt: now, updatedAt: now }));
  const json = { version: 1, workspace: { id: from, name: "Big" }, items, projects: [], projectItems: [], systems: [], systemAreas: [], comments: { items: [], areas: [] }, revisions: { design: [], areas: [] } };
  const big = zip([...items.map((_, i) => ({ name: `files/media/f${i}.png`, data: png })), { name: "workspace.json", data: Buffer.from(JSON.stringify(json)) }]);
  const before = await countsOf(DEST);
  const { status, body } = await importAs({ ...payer, workspaceId: DEST }, big);
  expect(status).toBe(413);
  expect(body.error).toContain(`${n} files`);
  expect(await countsOf(DEST), "nothing written").toEqual(before);
});

test("only whoever manages the open workspace imports into it, only its payer as a new team, and only a Criterio export", async () => {
  const exported = await zipOf(await exportAs(payer));
  const before = await countsOf(SRC);
  const asMember = await importAs(member, exported);
  expect(asMember.status, "a member who cannot manage it").toBe(403);
  const asAdmin = await importAs(admin, exported, "new");
  expect(asAdmin.status, "an admin who does not pay, as a new team").toBe(403);
  expect(await countsOf(SRC), "nothing written").toEqual(before);
  const bad = await importAs(payer, zip([{ name: "notes.txt", data: Buffer.from("hello") }]));
  expect(bad.status).toBe(400);
  expect(bad.body.error).toMatch(/not an export/);
});

test("the payer lets a client's workspace go: a free account its owner owns, an email to them, nothing to the payer", async () => {
  reached.length = 0;
  actAs({ ...admin, workspaceId: SRC });
  expect((await letWorkspaceGo(CLIENT)).ok, "an admin who does not pay cannot").toBe(false);
  actAs(payer);
  expect((await letWorkspaceGo(SRC)).ok, "the payer's own team is not a client's").toBe(false);

  const r = await letWorkspaceGo(CLIENT);
  expect(r).toEqual({ ok: true, data: undefined });
  const [ws] = await db.select({ accountId: schema.organization.billingAccountId }).from(schema.organization).where(eq(schema.organization.id, CLIENT));
  const [account] = await db.select().from(schema.billingAccount).where(eq(schema.billingAccount.id, ws.accountId));
  expect(account, "on Free, paid by the workspace's owner").toMatchObject({ plan: "free", ownerUserId: client.id, name: `${tag} Client` });
  expect(await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.billingAccountId, `${tag}-agency`)),
    "the agency keeps its own").toContainEqual({ id: SRC });

  const mails = reached.filter(([what]) => what === "mail").map(([, m]) => m as Mail & { to: string[] });
  expect(mails.map((m) => m.to), "one email, to the client's owner").toEqual([[client.email]]);
  expect(mails[0], "the agency's paid Vault locks on Free").toMatchObject({ template: "let-go-vault", locale: "en", vars: { WORKSPACE: `${tag} Client`, ACCOUNT: `${tag} Studio` } });

  expect((await letWorkspaceGo(CLIENT)).ok, "once gone, it is not the agency's to let go again").toBe(false);
});
