// Every door a reference comes in by (the app's actions, the extension one at a time or by the batch, the MCP
// connector, the agent) writes the row and answers the caller the way it did before lib/add.ts gathered them (#115).
// What each door does differently is pinned here on purpose: a change to one of these lines is a change of behavior.
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { db, schema } from "@/lib/db";
import { createExtKey } from "@/lib/ext-keys";
import { getErrors } from "@/lib/i18n";
import { importedTextUrl, ownsTextFile } from "@/lib/text-refs";
import { webKeyOf } from "@/lib/url";
import { actAs, reached } from "../harness";
import { bearer, request, withKeys } from "../isolation/probe";
import { cleanupTeam, seedTeam, type Team } from "./seed";

let team: Team;
let project: string;
let key: string;
const site = (n: string) => `https://${team.tag}-${n}.example.com`;

beforeAll(async () => {
  team = await seedTeam();
  project = `${team.tag}-project`;
  const now = new Date();
  await db.insert(schema.project).values({ id: project, organizationId: team.ws.id, name: "Board", createdBy: team.user.id, createdAt: now, updatedAt: now });
  ({ key } = await createExtKey(team.user.id, team.ws.id, "Raycast"));
});
afterAll(async () => { actAs(null); if (team) await cleanupTeam(team); });

const T = schema.inspoItem;
const rowOf = async (web: string) => (await db.select().from(T).where(and(eq(T.organizationId, team.ws.id), eq(T.webKey, webKeyOf(web)))))[0];
const filedIn = async (itemId: string) => (await db.select({ p: schema.projectItem.projectId }).from(schema.projectItem).where(eq(schema.projectItem.itemId, itemId))).map((r) => r.p);
/** What reached the queue since `from`: tag jobs and embed batches */
const queued = (from: number) => reached.slice(from).filter(([what]) => what === "queue").map(([, job]) => job);
const tagJob = (itemId: string) => ({ kind: "tag", organizationId: team.ws.id, itemId, userId: team.user.id });

test("the app's action saves a site with the name given, files it where asked, tags it at once and refuses the same address twice", async () => {
  actAs({ ...team.user, workspaceId: team.ws.id } as Parameters<typeof actAs>[0]);
  const { addInspo } = await import("@/app/actions/library");
  const web = site("action");
  const from = reached.length;
  const res = await withKeys(() => addInspo({ web, name: "  Studio  ", note: "why", projectId: project }));
  expect(res.ok, "saved").toBe(true);
  const item = res.ok ? res.data : null!;
  const row = await rowOf(web);
  expect({ id: row.id, name: row.name, type: row.type, note: row.note, author: row.author, createdBy: row.createdBy, via: row.via, thumbnailUrl: row.thumbnailUrl })
    .toEqual({ id: item.id, name: "Studio", type: "inspiration", note: "why", author: team.user.name, createdBy: team.user.id, via: null, thumbnailUrl: null });
  expect(item, "the action answers the item as the row reads").toMatchObject({ name: "Studio", web, type: "inspiration", note: "why", addedBy: team.user.name });
  expect(await filedIn(row.id)).toEqual([project]);
  expect(queued(from), "the tag job goes before the action answers").toEqual([tagJob(row.id)]);

  const again = await addInspo({ web: `${web}/` });
  expect(again, "the same address is a 409, not a second row").toEqual({ ok: false, error: (await getErrors()).urlAlreadyHere });
});

test("the app's action saves a pasted text as a file of the workspace, with its first lines as its tags, and sends it to be embedded", async () => {
  actAs({ ...team.user, workspaceId: team.ws.id } as Parameters<typeof actAs>[0]);
  const { addText } = await import("@/app/actions/text");
  const from = reached.length;
  const res = await withKeys(() => addText({ title: "Notes", text: "First line.\n\nSecond.", projectId: project }));
  expect(res.ok).toBe(true);
  const item = res.ok ? res.data : null!;
  expect(ownsTextFile(team.ws.id, item.web), "its address is a text file of this workspace").toBe(true);
  const row = await rowOf(item.web);
  expect({ name: row.name, type: row.type, tagStatus: row.tagStatus, summary: row.tagsJson?.summary }).toEqual({ name: "Notes", type: "inspiration", tagStatus: "done", summary: "First line. Second." });
  expect(await filedIn(row.id)).toEqual([project]);
  expect(queued(from), "a text is embedded, never tagged").toEqual([[row.id]]);
});

test("the extension saves a site named from its page or the tab title, files it in the project picked, and tags it only after answering", async () => {
  const { POST } = await import("@/app/api/ext/v1/items/route");
  const web = site("ext");
  const from = reached.length;
  const res = await withKeys(() => POST(request("/api/ext/v1/items", { method: "POST", headers: bearer(key), body: { url: web, title: "Tab title", note: "from the popup", projectId: project } })));
  expect(res.status).toBe(200);
  const body = await res.json();
  const row = await rowOf(web);
  expect(body).toEqual({ ok: true, existed: false, item: expect.objectContaining({ id: row.id, name: "Tab title", web, type: "inspiration", note: "from the popup", addedBy: team.user.name }) });
  expect({ author: row.author, createdBy: row.createdBy, via: row.via }).toEqual({ author: team.user.name, createdBy: team.user.id, via: null });
  expect(await filedIn(row.id)).toEqual([project]);
  expect(queued(from), "nothing is queued before the answer: the tag job waits for after()").toEqual([]);

  const again = await POST(request("/api/ext/v1/items", { method: "POST", headers: bearer(key), body: { url: web } }));
  expect(await again.json(), "the same address answers the item it already has").toEqual({ ok: true, existed: true, item: expect.objectContaining({ id: row.id, name: "Tab title" }) });
});

test("the extension lands a site in the project this person last filed in when the popup picked none", async () => {
  const { POST } = await import("@/app/api/ext/v1/items/route");
  const web = site("ext-active");
  const res = await POST(request("/api/ext/v1/items", { method: "POST", headers: bearer(key), body: { url: web } }));
  expect(res.status).toBe(200);
  expect(await filedIn((await rowOf(web)).id)).toEqual([project]);
});

test("a batch from the extension answers one status per address, in order, and files and tags what it saved", async () => {
  const { POST } = await import("@/app/api/ext/v1/items/batch/route");
  const [a, page, b] = [site("batch-a"), site("batch-page"), site("batch-b")];
  const from = reached.length;
  const items = [
    { url: a, title: "A" },
    { url: page, text: "# Heading\n\nwords" },
    { url: b, image: "https://cdn.example.com/x.png" },
    { url: `${a}/` },
    { url: "not a url" },
  ];
  const res = await withKeys(() => POST(request("/api/ext/v1/items/batch", { method: "POST", headers: bearer(key), body: { items, source: "bookmarks", projectId: project } })));
  expect(res.status).toBe(200);
  const { results } = await res.json();
  const rowA = await rowOf(a);
  const text = await rowOf(importedTextUrl(team.ws.id, page));
  expect(results).toEqual([
    { url: a, status: "added", id: rowA.id },
    { url: page, status: "added", id: text.id },
    { url: b, status: "error" },
    { url: `${a}/`, status: "existed" },
    { url: "not a url", status: "invalid" },
  ]);
  expect({ name: rowA.name, type: rowA.type, author: rowA.author, createdBy: rowA.createdBy }).toEqual({ name: "A", type: "inspiration", author: team.user.name, createdBy: team.user.id });
  expect({ name: text.name, source: text.source, summary: text.tagsJson?.summary }, "a text takes its page as source and its first line as title").toEqual({ name: "Heading", source: page, summary: "Heading, words" });
  expect(await filedIn(rowA.id)).toEqual([project]);
  expect(await filedIn(text.id)).toEqual([project]);
  expect(queued(from), "the text is embedded, the site is tagged").toEqual([[text.id], [tagJob(rowA.id)]]);

  const again = await POST(request("/api/ext/v1/items/batch", { method: "POST", headers: bearer(key), body: { items: [{ url: a }, { url: page, text: "# Heading\n\nwords" }] } }));
  expect((await again.json()).results, "sent again, both exist, and the ids come back").toEqual([{ url: a, status: "existed", id: rowA.id }, { url: page, status: "existed", id: text.id }]);
});

test("the MCP connector saves a site signed with the app it came from, files it with its areas, and a second time only comments", async () => {
  const { POST } = await import("@/app/mcp/route");
  const call = (args: Record<string, unknown>) => POST(request("/mcp", { method: "POST", headers: bearer(key), body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "add_reference", arguments: args } } }));
  const said = async (res: Response) => JSON.parse(((await res.json()) as { result: { content: { text: string }[] } }).result.content[0].text);
  const web = site("mcp");
  const from = reached.length;
  const out = await withKeys(async () => said(await call({ project, url: web, title: "Given title", note: "backs the palette", areas: ["color"] })));
  const row = await rowOf(web);
  expect(out).toEqual({ id: row.id, name: "Given title", project: "Board", areas: ["color"], url: expect.stringContaining(`?in=${project}&view=system`) });
  expect({ author: row.author, createdBy: row.createdBy, via: row.via, note: row.note }).toEqual({ author: team.user.name, createdBy: team.user.id, via: "Raycast", note: "backs the palette" });
  expect(await filedIn(row.id)).toEqual([project]);
  const [area] = await db.select({ evidence: schema.systemArea.evidence }).from(schema.systemArea).where(and(eq(schema.systemArea.projectId, project), eq(schema.systemArea.area, "color")));
  expect((area.evidence as { itemId: string }[]).map((e) => e.itemId)).toEqual([row.id]);
  expect(queued(from), "the tag job waits for after()").toEqual([]);

  const again = await said(await call({ project, url: web, note: "also the type" }));
  expect(again).toEqual({ id: row.id, name: "Given title", project: "Board", already_in_library: true, url: expect.any(String) });
  const comments = await db.select({ body: schema.inspoComment.body }).from(schema.inspoComment).where(eq(schema.inspoComment.itemId, row.id));
  expect(comments, "the note on a reference already here goes in its thread").toEqual([{ body: "also the type" }]);

  const text = await said(await call({ project, text: "# Why\n\nbecause" }));
  const textRow = await rowOf((await db.select({ web: T.web }).from(T).where(eq(T.id, text.id)))[0].web);
  expect({ name: textRow.name, via: textRow.via, summary: textRow.tagsJson?.summary }).toEqual({ name: "Why", via: "Raycast", summary: "Why, because" });
});

test("the agent saves a site by its address into the project named and tags it at once", async () => {
  actAs({ ...team.user, workspaceId: team.ws.id } as Parameters<typeof actAs>[0]);
  const { requireCtx } = await import("@/lib/workspace");
  const { runActions } = await import("@/lib/agent");
  const ctx = await requireCtx();
  if (ctx instanceof Response) throw new Error("no session");
  const web = site("agent");
  const from = reached.length;
  const { done, patch } = await withKeys(() => runActions(ctx, [{ kind: "add_url", url: web, project }], { organizationId: team.ws.id, userId: team.user.id }, "en"));
  const row = await rowOf(web);
  expect(done).toEqual([{ kind: "add_url", ok: true, project: "Board", name: row.name, items: [row.id] }]);
  expect(patch.added?.map((i) => i.id)).toEqual([row.id]);
  expect({ author: row.author, createdBy: row.createdBy, type: row.type }).toEqual({ author: team.user.name, createdBy: team.user.id, type: "inspiration" });
  expect(await filedIn(row.id)).toEqual([project]);
  expect(queued(from)).toEqual([tagJob(row.id)]);

  const [twice] = (await runActions(ctx, [{ kind: "add_url", url: web, project: null }], { organizationId: team.ws.id }, "en")).done;
  expect(twice, "the same address is refused as the action refuses it").toEqual({ kind: "add_url", ok: false, error: (await getErrors()).urlAlreadyHere });
});
