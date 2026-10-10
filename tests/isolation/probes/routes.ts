import { expect } from "vitest";
import { and, count, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { files } from "../../harness";
import type { Fixture } from "../fixture";
import { asB, bearer, expectDenied, expectNoSecret, expectPageRefused, itemRow, params, request, withKeys, type Surface } from "../probe";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const onBoard = async (projectId: string) =>
  (await db.select({ n: count() }).from(schema.projectItem).where(eq(schema.projectItem.projectId, projectId)))[0].n;

const projectsOf = async (organizationId: string) =>
  (await db.select({ n: count() }).from(schema.project).where(eq(schema.project.organizationId, organizationId)))[0].n;

/** One JSON-RPC message to /mcp with this bearer token */
async function rpc(token: string, method: string, params: Record<string, unknown> = {}) {
  const { POST } = await import("@/app/mcp/route");
  const res = await POST(request("/mcp", { method: "POST", headers: bearer(token), body: { jsonrpc: "2.0", id: 1, method, params } }));
  return { status: res.status, body: (await res.json()) as { result?: { content?: { text: string }[]; isError?: boolean }; error?: { message: string } } };
}

/** A tool, called by B through both kinds of token: an MCP access token and an extension key */
async function tool(fx: Fixture, name: string, args: Record<string, unknown>) {
  const out = [];
  for (const token of [fx.b.mcpToken, fx.b.extKey]) {
    const { status, body } = await rpc(token, "tools/call", { name, arguments: args });
    expect(status, `${name} answers`).toBe(200);
    expectNoSecret(fx, body, `${name} through a ${token === fx.b.extKey ? "key" : "token"} names nothing of A's`);
    out.push(body.result!);
  }
  return out;
}

const refusedTool = async (fx: Fixture, name: string, args: Record<string, unknown>) => {
  for (const r of await tool(fx, name, args)) expect(r.isError, `${name} on A's project is an error`).toBe(true);
};

export const routes: Record<string, Surface> = {
  // ─── Library ────────────────────────────────────────────────────────────────
  "route:app/api/comments/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/comments/route");
      asB(fx);
      const res = await GET();
      expect(res.status, "B's own comments load").toBe(200);
      expectNoSecret(fx, await res.json(), "B's comments carry none of A's");
      asB(fx, fx.a.team);
      expectNoSecret(fx, await (await GET()).text(), "a session naming A's team as active falls back to B's own");
    },
  },
  "route:app/api/library/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/library/route");
      asB(fx);
      await expectDenied(fx, await GET(request(`/api/library?ws=${fx.a.team}`)), "B asks for A's library");
      const own = await GET(request(`/api/library?ws=${fx.b.team}`));
      expect(own.status, "B's own library loads").toBe(200);
      expectNoSecret(fx, await own.text(), "B's library holds none of A's");
    },
  },
  "route:app/api/library/page/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/library/page/route");
      // A cursor past everything: the page after it starts from the newest reference
      const top = Buffer.from(JSON.stringify(["9999-12-31", "9999-12-31 00:00:00+00", "~"])).toString("base64url");
      asB(fx);
      await expectDenied(fx, await GET(request(`/api/library/page?ws=${fx.a.team}&cursor=${top}`)), "B asks for a page of A's library");
      const own = await GET(request(`/api/library/page?ws=${fx.b.team}&cursor=${top}`));
      expect(own.status, "B's own page loads").toBe(200);
      expectNoSecret(fx, await own.text(), "B's page holds none of A's");
      asB(fx, fx.a.team);
      await expectDenied(fx, await GET(request(`/api/library/page?ws=${fx.a.team}&cursor=${top}`)), "a session naming A's team as active is still refused A's pages");
    },
  },
  "route:app/api/pulse/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/pulse/route");
      // A look from an hour ago: everything written since comes back
      const ask = { stamp: "", since: new Date(Date.now() - 60 * 60 * 1000).toISOString(), bell: "x", beat: { segmentId: "a".repeat(24), visitId: "b".repeat(24), area: "board", path: "/" } };
      asB(fx);
      await expectDenied(fx, await POST(request("/api/pulse", { method: "POST", body: { ...ask, ws: fx.a.team } })), "B asks for A's changes");
      const own = await POST(request("/api/pulse", { method: "POST", body: { ...ask, ws: fx.b.team } }));
      expect(own.status, "B's own pulse answers").toBe(200);
      expectNoSecret(fx, await own.text(), "B's changes carry none of A's");
      asB(fx, fx.a.team);
      await expectDenied(fx, await POST(request("/api/pulse", { method: "POST", body: { ...ask, ws: fx.a.team } })), "a session naming A's team as active is still refused A's changes");
    },
  },
  "route:app/api/tags/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/tags/route");
      asB(fx);
      const res = await GET(request(`/api/tags?web=${encodeURIComponent(fx.a.web)}`));
      expect(await res.json(), "A's address reads as unknown").toEqual({ jobs: {}, tags: {} });
    },
  },
  "route:app/api/tags/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/tags/route");
      asB(fx);
      const before = await itemRow(fx.a.item);
      await withKeys(async () => expectDenied(fx, await POST(request("/api/tags", { method: "POST", body: { web: fx.a.web } })), "B retags A's item"));
      expect((await itemRow(fx.a.item)).tagStatus, "A's tag job is untouched").toBe(before.tagStatus);
    },
  },
  "route:app/api/search/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/search/route");
      asB(fx);
      const res = await withKeys(async () => POST(request("/api/search", { method: "POST", body: { q: "anything at all", webs: [fx.a.web, fx.b.web] } })));
      expectNoSecret(fx, await res.text(), "a search naming A's address");
      // The isolation test fails if A's item reached Jev (recorded by tests/setup.ts)
    },
  },
  "route:app/api/search/semantic/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/search/semantic/route");
      asB(fx);
      const res = await withKeys(async () => POST(request("/api/search/semantic", { method: "POST", body: { q: "anything at all" } })));
      const { scores } = (await res.json()) as { scores: Record<string, number> };
      expect(Object.keys(scores), "the nearest items are B's alone, though A's item has the query's own vector").not.toContain(fx.a.web);
    },
  },
  "route:app/api/post/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/post/route");
      asB(fx);
      await expectDenied(fx, await POST(request("/api/post", { method: "POST", body: { web: fx.a.post } })), "B imports A's post");
    },
  },
  "route:app/api/shot/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/shot/route");
      asB(fx);
      await expectDenied(fx, await GET(request(`/api/shot?url=${encodeURIComponent(fx.a.web)}`)), "B asks for a capture of A's site");
    },
  },
  "route:app/api/design-md/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/design-md/route");
      asB(fx);
      await withKeys(async () => {
        await expectDenied(fx, await GET(request(`/api/design-md?url=${encodeURIComponent(fx.a.web)}`)), "B reads A's DESIGN.md and its revisions");
        await expectDenied(fx, await GET(request(`/api/design-md?url=${encodeURIComponent(fx.a.web)}&force=1`)), "B regenerates A's DESIGN.md");
      });
    },
  },
  "route:app/api/design-md/route.ts#DELETE": {
    probe: async (fx) => {
      const { DELETE } = await import("@/app/api/design-md/route");
      asB(fx);
      const res = await DELETE(request(`/api/design-md?url=${encodeURIComponent(fx.a.web)}`, { method: "DELETE" }));
      expect(await res.json(), "a stop is keyed by B's own workspace: it reaches no generation of A's").toEqual({ stopped: false });
    },
  },

  // ─── Files: thumbnails, media, comment screenshots ─────────────────────────
  "route:app/api/files/[...key]/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/files/[...key]/route");
      asB(fx);
      for (const [what, key] of Object.entries(fx.a.keys)) {
        await expectDenied(fx, await GET(request(`/api/files/${key}`), params({ key: key.split("/") })), `B loads A's ${what} file`);
      }
    },
  },
  "route:app/api/thumbnail/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/thumbnail/route");
      asB(fx);
      const form = new FormData();
      form.set("file", new File([Buffer.from(png.split(",")[1], "base64")], "x.png", { type: "image/png" }));
      form.set("webUrl", fx.a.web);
      const before = files.size;
      await expectDenied(fx, await POST(request("/api/thumbnail", { method: "POST", body: form })), "B sets a thumbnail on A's item");
      expect(files.size, "nothing was uploaded").toBe(before);
      expect((await itemRow(fx.a.item)).thumbnailUrl, "A's thumbnail is untouched").toBe(`/api/files/${fx.a.keys.thumb}`);
    },
  },
  "route:app/api/thumbnail/route.ts#DELETE": {
    probe: async (fx) => {
      const { DELETE } = await import("@/app/api/thumbnail/route");
      asB(fx);
      await DELETE(request(`/api/thumbnail?webUrl=${encodeURIComponent(fx.a.web)}`, { method: "DELETE" }));
      expect((await itemRow(fx.a.item)).thumbnailUrl, "A's thumbnail is untouched").toBe(`/api/files/${fx.a.keys.thumb}`);
    },
  },
  "route:app/api/comments/upload/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/comments/upload/route");
      asB(fx);
      const form = new FormData();
      form.set("file", new File([Buffer.from(png.split(",")[1], "base64")], "x.png", { type: "image/png" }));
      const { url } = (await (await POST(request("/api/comments/upload", { method: "POST", body: form }))).json()) as { url: string };
      expect(url, "an upload lands under B's own folder").toContain(`/inspo/${fx.b.team}/comments/`);
    },
  },
  "route:app/api/comments/upload/route.ts#DELETE": {
    probe: async (fx) => {
      const { DELETE } = await import("@/app/api/comments/upload/route");
      asB(fx);
      await expectDenied(fx, await DELETE(request(`/api/comments/upload?url=${encodeURIComponent(`/api/files/${fx.a.keys.comment}`)}`, { method: "DELETE" })), "B deletes A's comment screenshot");
      expect(files.has(fx.a.keys.comment), "A's screenshot is still stored").toBe(true);
    },
  },
  "route:app/api/media/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/media/route");
      asB(fx);
      const { url } = (await (await POST(request("/api/media", { method: "POST", body: { type: "image/png", size: 10 } }))).json()) as { url: string };
      expect(url, "an upload is keyed under B's own folder").toContain(`/inspo/${fx.b.team}/media/`);
    },
  },

  // ─── Extension API: B's key against A ──────────────────────────────────────
  "route:app/api/ext/v1/me/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/ext/v1/me/route");
      await expectDenied(fx, await GET(request("/api/ext/v1/me", { headers: bearer(fx.b.extKey, { "x-workspace": fx.a.team }) })), "B's key picks A's team");
      const own = await GET(request("/api/ext/v1/me", { headers: bearer(fx.b.extKey) }));
      expect(own.status, "B's key works for B").toBe(200);
      expect(JSON.stringify(await own.json()), "B's workspaces do not include A's").not.toContain(fx.a.team);
    },
  },
  "route:app/api/ext/v1/me/route.ts#DELETE": {
    probe: async (fx) => {
      const { DELETE } = await import("@/app/api/ext/v1/me/route");
      await expectDenied(fx, await DELETE(request("/api/ext/v1/me", { method: "DELETE", headers: bearer(fx.b.extKey, { "x-workspace": fx.a.team }) })), "B's key, naming A's team, revokes");
      const [key] = await db.select({ revokedAt: schema.extKey.revokedAt }).from(schema.extKey).where(eq(schema.extKey.id, fx.a.extKeyId));
      expect(key.revokedAt, "A's key is still live").toBeNull();
    },
  },
  "route:app/api/ext/v1/projects/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/ext/v1/projects/route");
      await expectDenied(fx, await GET(request("/api/ext/v1/projects", { headers: bearer(fx.b.extKey, { "x-workspace": fx.a.team }) })), "B's key lists A's projects");
      expectNoSecret(fx, await (await GET(request("/api/ext/v1/projects", { headers: bearer(fx.b.extKey) }))).json(), "B's projects hold none of A's");
    },
  },
  "route:app/api/ext/v1/projects/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/ext/v1/projects/route");
      const before = await projectsOf(fx.a.team);
      await expectDenied(fx, await POST(request("/api/ext/v1/projects", { method: "POST", headers: bearer(fx.b.extKey, { "x-workspace": fx.a.team }), body: { name: "board" } })), "B's key makes a project in A's team");
      expect(await projectsOf(fx.a.team), "A has no new project").toBe(before);
    },
  },
  "route:app/api/ext/v1/items/lookup/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/ext/v1/items/lookup/route");
      const url = `/api/ext/v1/items/lookup?url=${encodeURIComponent(fx.a.web)}`;
      await expectDenied(fx, await GET(request(url, { headers: bearer(fx.b.extKey, { "x-workspace": fx.a.team }) })), "B's key looks up in A's team");
      expect(await (await GET(request(url, { headers: bearer(fx.b.extKey) }))).json(), "A's address is unknown to B").toEqual({ exists: false });
    },
  },
  "route:app/api/ext/v1/items/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/ext/v1/items/route");
      const before = await onBoard(fx.a.project);
      await expectDenied(fx, await POST(request("/api/ext/v1/items", { method: "POST", headers: bearer(fx.b.extKey, { "x-workspace": fx.a.team }), body: { url: `${fx.b.web}/new` } })), "B's key saves into A's team");
      const res = await POST(request("/api/ext/v1/items", { method: "POST", headers: bearer(fx.b.extKey), body: { url: fx.b.web, projectId: fx.a.project } }));
      expectNoSecret(fx, await res.text(), "B saves its own address naming A's project");
      expect(await onBoard(fx.a.project), "A's board is unchanged").toBe(before);
    },
  },
  "route:app/api/ext/v1/media/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/ext/v1/media/route");
      const before = await onBoard(fx.a.project);
      const body = { kind: "image", src: png, page: `${fx.b.web}/page`, projectId: fx.a.project, areas: ["color"] };
      await expectDenied(fx, await POST(request("/api/ext/v1/media", { method: "POST", headers: bearer(fx.b.extKey, { "x-workspace": fx.a.team }), body })), "B's key saves an image into A's team");
      const res = await POST(request("/api/ext/v1/media", { method: "POST", headers: bearer(fx.b.extKey), body }));
      expect(res.status, "B saves its own image").toBe(200);
      expect(await onBoard(fx.a.project), "naming A's project files nothing there").toBe(before);
      const [color] = await db.select({ evidence: schema.systemArea.evidence }).from(schema.systemArea)
        .where(and(eq(schema.systemArea.projectId, fx.a.project), eq(schema.systemArea.area, "color")));
      expect(color.evidence, "A's color area gained no evidence").toEqual([]);
    },
  },
  "route:app/api/ext/v1/items/batch/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/ext/v1/items/batch/route");
      const before = await onBoard(fx.a.project);
      const body = { items: [{ url: `${fx.b.web}/words`, text: "words" }, { url: fx.b.web }], projectId: fx.a.project };
      await expectDenied(fx, await POST(request("/api/ext/v1/items/batch", { method: "POST", headers: bearer(fx.b.extKey, { "x-workspace": fx.a.team }), body })), "B's key imports into A's team");
      const res = await POST(request("/api/ext/v1/items/batch", { method: "POST", headers: bearer(fx.b.extKey), body }));
      expect(res.status, "B's import runs in B").toBe(200);
      expect(await onBoard(fx.a.project), "naming A's project files nothing there").toBe(before);
    },
  },

  // ─── MCP ────────────────────────────────────────────────────────────────────
  "route:app/mcp/route.ts#POST": {
    probe: async (fx) => {
      expect((await rpc("crit_at_not-a-token", "tools/list")).status, "an unknown token is turned away").toBe(401);
      for (const token of [fx.b.mcpToken, fx.b.extKey]) {
        const read = await rpc(token, "resources/read", { uri: `criterio://projects/${fx.a.project}/criterio.md` });
        expect(read.body.error, "A's criterio.md is not a resource for B").toBeDefined();
        expectNoSecret(fx, read.body, "reading A's criterio.md as a resource");
        expectNoSecret(fx, (await rpc(token, "resources/list")).body, "B's resources name none of A's projects");
      }
    },
  },
  "route:app/mcp/route.ts#GET": { exempt: "answers 401 or 405 and reads nothing: the connector only takes POST" },
  "route:app/mcp/route.ts#DELETE": { exempt: "answers 401 or 405 and reads nothing: the connector keeps no session to end" },
  "mcp:list_projects": {
    probe: async (fx) => {
      for (const r of await tool(fx, "list_projects", {})) expect(r.content?.[0].text, "B's list does not name A's projects").not.toContain(fx.a.project);
    },
  },
  "mcp:read_criterio": { probe: async (fx) => { await refusedTool(fx, "read_criterio", { project: fx.a.project }); await refusedTool(fx, "read_criterio", { project: fx.a.prefix }); } },
  "mcp:list_references": { probe: async (fx) => { await refusedTool(fx, "list_references", { project: fx.a.project }); } },
  "mcp:read_reference": {
    probe: async (fx) => {
      for (const id of [fx.a.item, fx.a.text]) for (const r of await tool(fx, "read_reference", { id })) expect(r.isError, "A's reference is not found").toBe(true);
    },
  },
  "mcp:add_reference": {
    probe: async (fx) => {
      const before = await onBoard(fx.a.project);
      await refusedTool(fx, "add_reference", { project: fx.a.project, text: "words", areas: ["color"] });
      expect(await onBoard(fx.a.project), "A's board is unchanged").toBe(before);
    },
  },
  "mcp:propose_decision": {
    probe: async (fx) => {
      const C = schema.systemAreaComment;
      const before = (await db.select({ n: count() }).from(C).where(eq(C.projectId, fx.a.project)))[0].n;
      await refusedTool(fx, "propose_decision", { project: fx.a.project, area: "color", decision: "red" });
      expect((await db.select({ n: count() }).from(C).where(eq(C.projectId, fx.a.project)))[0].n, "A's project has no new proposal").toBe(before);
    },
  },
  "mcp:create_project": {
    probe: async (fx) => {
      const before = await projectsOf(fx.a.team);
      for (const workspace of [fx.a.team, `${fx.a.prefix} team`]) await refusedTool(fx, "create_project", { name: "new", workspace });
      expect(await projectsOf(fx.a.team), "A has no new project").toBe(before);
    },
  },

  // ─── Share links ────────────────────────────────────────────────────────────
  "route:app/s/[token]/md/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/s/[token]/md/route");
      asB(fx);
      const md = await (await GET(request(`/s/${fx.a.shareToken}/md`), params({ token: fx.a.shareToken }))).text();
      expect(md, "the link hands out its own project").toContain(fx.a.secret);
      expect(md, "and nothing of the project it does not share").not.toContain(fx.a.unshared);
      await expectDenied(fx, await GET(request("/s/x/md"), params({ token: "A".repeat(22) })), "an unknown token");
    },
  },
  "route:app/s/[token]/download/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/s/[token]/download/route");
      await expectDenied(fx, await GET(request("/s/x/download"), params({ token: "A".repeat(22) })), "an unknown token");
      // The zip is built from the same view as /md (lib/share-view.ts), whose content the md probe checks
      expect((await GET(request(`/s/${fx.a.shareToken}/download`), params({ token: fx.a.shareToken }))).status, "the link's own zip").toBe(200);
    },
  },
  "route:app/s/[token]/f/[...key]/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/s/[token]/f/[...key]/route");
      const get = (key: string) => GET(request(`/s/${fx.a.shareToken}/f/${key}`), params({ token: fx.a.shareToken, key: key.split("/") }));
      expect((await get(fx.a.keys.brand)).status, "the shared project's brand file is served").toBe(200);
      await expectDenied(fx, await get(fx.a.keys.text), "the text only the unshared project holds");
      await expectDenied(fx, await get(`inspo/${fx.b.team}/media/x.png`), "another workspace's file");
      await expectDenied(fx, await GET(request("/s/x/f/k"), params({ token: "A".repeat(22), key: fx.a.keys.brand.split("/") })), "an unknown token");
    },
  },
  "route:app/s/[token]/font/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/s/[token]/font/route");
      await expectDenied(fx, await GET(request(`/s/${fx.a.shareToken}/font?u=https://example.com/f.woff2&t=forged`), params({ token: fx.a.shareToken })), "a font URL without a valid token");
      await expectDenied(fx, await GET(request("/s/x/font"), params({ token: "A".repeat(22) })), "an unknown token");
    },
  },
  "route:app/s/[token]/fonts/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/s/[token]/fonts/route");
      await expectDenied(fx, await GET(request("/s/x/fonts"), params({ token: "A".repeat(22) })), "an unknown token");
      expectNoSecret(fx, await (await GET(request(`/s/${fx.a.shareToken}/fonts`), params({ token: fx.a.shareToken }))).json(), "the link's faces");
    },
  },
  "page:app/s/[token]/page.tsx": {
    probe: async (fx) => {
      const { default: Page } = await import("@/app/s/[token]/page");
      await expectPageRefused(fx, () => Page({ params: Promise.resolve({ token: "A".repeat(22) }) } as never), "an unknown token");
      const page = await Page({ params: Promise.resolve({ token: fx.a.shareToken }) } as never);
      expect(JSON.stringify(page), "the link's page names nothing of the project it does not share").not.toContain(fx.a.unshared);
    },
  },

  // ─── Pages ──────────────────────────────────────────────────────────────────
  "page:app/(library)/i/[id]/page.tsx": {
    probe: async (fx) => {
      const { default: Page } = await import("@/app/(library)/i/[id]/page");
      asB(fx);
      // The page renders nothing: the library layout opens the item, from the active workspace's library (the library GET probe)
      expect(await Page({ params: Promise.resolve({ id: fx.a.item }) }), "A's item id renders nothing").toBeNull();
    },
  },
  "page:app/invite/[id]/page.tsx": {
    probe: async (fx) => {
      const { default: Page } = await import("@/app/invite/[id]/page");
      asB(fx);
      const page = await Page({ params: Promise.resolve({ id: fx.a.invitation }) });
      const tree = JSON.stringify(page, (_k, v) => (typeof v === "function" ? `fn:${v.name}` : v));
      expect(tree, "B is not offered A's invitation to accept").not.toContain("fn:AcceptInvitation");
      expectNoSecret(fx, tree, "A's invitation page");
    },
  },
  "page:app/admin/[section]/page.tsx": {
    probe: async (fx) => {
      const { default: Page } = await import("@/app/admin/[section]/page");
      asB(fx);
      await expectPageRefused(fx, () => Page({ params: Promise.resolve({ section: "usage" }), searchParams: Promise.resolve({}) }), "B opens the admin panel");
    },
  },
  "page:app/library/[section]/page.tsx": { exempt: "the design system's own docs (docs/design-system), the same for everyone: no workspace data" },

  // ─── Per person, not per workspace ──────────────────────────────────────────
  "route:app/api/activity/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/activity/route");
      asB(fx);
      const segmentId = `${fx.b.owner.id}-segment`;
      await POST(request("/api/activity", { method: "POST", body: { segmentId, visitId: "v", organizationId: fx.a.team } }));
      const [row] = await db.select({ org: schema.activitySegment.organizationId }).from(schema.activitySegment).where(eq(schema.activitySegment.id, segmentId));
      expect(row?.org ?? null, "B's time is never counted in A's team").toBeNull();
    },
  },
  "route:app/api/unsubscribe/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/unsubscribe/route");
      const res = await POST(request(`/api/unsubscribe?u=${fx.a.owner.id}&k=digest&s=forged`, { method: "POST" }));
      expect(res.status, "a forged link does not change A's owner's emails").toBe(400);
    },
  },
  "route:app/api/feedback/route.ts#POST": { exempt: "stores the caller's own feedback note for the app's admins; reads and changes nothing of a workspace by id" },
  "route:app/api/plan/route.ts#GET": { exempt: "takes no id: the plan of the caller's resolved workspace, which falls back to their own (the comments GET probe proves the fallback)" },
  "route:app/api/og/route.ts#GET": { exempt: "fetches a public page's og:image for any signed-in person; reads no workspace row" },
  "route:app/api/screen-studio/[id]/[file]/route.ts#GET": { exempt: "a global cache of public Screen Studio shares keyed by their public id; no workspace data" },

  // ─── Outside any workspace ──────────────────────────────────────────────────
  "route:app/api/auth/[...all]/route.ts#GET": { exempt: "Better Auth's own endpoints: its organization plugin checks membership itself" },
  "route:app/api/auth/[...all]/route.ts#POST": { exempt: "Better Auth's own endpoints: its organization plugin checks membership itself" },
  "route:app/.well-known/oauth-authorization-server/[[...rest]]/route.ts#GET": { exempt: "public OAuth discovery document" },
  "route:app/.well-known/oauth-protected-resource/[[...rest]]/route.ts#GET": { exempt: "public OAuth discovery document" },
  "route:app/.well-known/openid-configuration/route.ts#GET": { exempt: "public OAuth discovery document" },
  "route:app/api/mcp/register/route.ts#POST": { exempt: "OAuth dynamic client registration: makes a client that opens nothing until a person approves it" },
  "route:app/api/mcp/token/route.ts#POST": { exempt: "OAuth token exchange: acts only on the grant whose one-time code or refresh token is presented" },
  "route:app/api/mcp/revoke/route.ts#POST": { exempt: "OAuth revocation: acts only on the grant whose token is presented" },
  "route:app/api/cron/morning/route.ts#GET": { exempt: "cron: Bearer CRON_SECRET (lib/cron-auth.ts), no session and no workspace id from a person" },
  "route:app/api/cron/sweep/route.ts#GET": { exempt: "cron: Bearer CRON_SECRET (lib/cron-auth.ts), no session and no workspace id from a person" },
  "route:app/api/cron/usage-check/route.ts#GET": { exempt: "cron: Bearer CRON_SECRET (lib/cron-auth.ts), no session and no workspace id from a person" },
  "route:app/api/queue/jobs/route.ts#POST": { exempt: "Vercel Queue callback: handleCallback verifies the platform's signed delivery; no session and no id from a person" },
  "route:app/api/health/route.ts#GET": { exempt: "health check: reads no data" },
  "route:app/api/health/deep/route.ts#GET": { exempt: "health check: pings the database, storage and the job queue, returns no rows" },
  "route:app/api/access/mode/route.ts#GET": { exempt: "public: whether sign-up is open" },
  "route:app/api/dev-login/route.ts#GET": { exempt: "development only (DEV_LOGIN_EMAIL): signs in a fixed local account" },
  "route:app/extension/download/route.ts#GET": { exempt: "static zip of the browser extension" },
};
