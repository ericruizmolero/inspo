import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { db, pool, schema } from "@/lib/db";
import { signedFilePath } from "@/lib/file-links";
import * as storage from "@/lib/storage";
import { readCriterio } from "@/lib/mcp/pieces";
import { handleRpc } from "@/lib/mcp/server";
import sharp from "sharp";
import { webKeyOf } from "@/lib/url";
import { GET } from "@/app/api/files/[...key]/route";
import { GET as measured } from "@/app/api/system/measured/route";
import { proxy } from "@/proxy";
import robots from "@/app/robots";
import { actAs, files } from "./harness";
import { cleanupTeam, seedTeam, type Team } from "./library/seed";

let team: Team;
beforeAll(async () => { team = await seedTeam(); });
afterAll(async () => { if (team) await cleanupTeam(team); await pool.end(); });

const KEY = "inspo/ws-outside/media/1760000000000-abc.png";
const OTHER = "inspo/ws-outside/media/1760000000000-other.png";
const DAY = 86400_000;

const get = (path: string) => {
  const key = path.slice("/api/files/".length).split("?")[0];
  return GET(new NextRequest(`http://localhost${path}`), { params: Promise.resolve({ key: key.split("/") }) });
};

test("a signed link reads its own file with no session, and nothing else does", async () => {
  actAs(null);
  files.set(KEY, { body: Buffer.from("png bytes"), contentType: "image/png" });
  files.set(OTHER, { body: Buffer.from("other bytes"), contentType: "image/png" });

  const signed = signedFilePath(KEY);
  const sign = vi.spyOn(storage, "signedFileUrl").mockResolvedValue({ url: "https://bucket.test/elsewhere", maxAge: 3600 });
  const ok = await get(signed);
  sign.mockRestore();
  expect(ok.status, "the signed link is served from this host, not redirected to the bucket's").toBe(200);
  expect(await ok.text()).toBe("png bytes");

  expect((await get(`/api/files/${KEY}`)).status, "no signature still needs a session").toBe(401);
  expect(signed, "the signature leads the path: a fetcher that drops the query keeps it").toMatch(/^\/api\/files\/~\d+\.[0-9a-f]{32}\/inspo\//);
  const token = signed.split("/")[3].slice(1);
  expect((await get(`/api/files/${KEY}?t=${token}`)).status, "a link made before, with the signature as ?t=, still opens").toBe(200);
  expect((await get(`/api/files/~${token}/${OTHER}`)).status, "a signature does not open another key").toBe(401);
  expect((await get(`/api/files/${OTHER}?t=${token}`)).status, "nor as ?t=").toBe(401);
  const [until, sig] = token.split(".");
  expect((await get(`/api/files/${KEY}?t=${Number(until) + 365}.${sig}`)).status, "a moved last day breaks the signature").toBe(401);
  expect((await get(signedFilePath(KEY, Date.now() - 31 * DAY))).status, "a link past its last day is refused").toBe(401);
  expect((await get(signedFilePath(KEY, Date.now() - 29 * DAY))).status, "a link inside its days still works").toBe(200);
});

test("criterio.md, read over MCP or copied in the app, links its uploaded image where no session can load it", async () => {
  const key = `inspo/${team.ws.id}/media/1760000000000-upload.png`;
  files.set(key, { body: Buffer.from("upload bytes"), contentType: "image/png" });
  const now = new Date(), web = `/api/files/${key}`, projectId = `${team.tag}-p`;
  await db.insert(schema.inspoItem).values({
    id: `${team.tag}-img`, organizationId: team.ws.id, name: "upload", web, webKey: webKeyOf(web), date: now.toISOString().slice(0, 10),
    author: team.user.name, createdBy: team.user.id, note: "", tagStatus: "done", createdAt: now, updatedAt: now,
  });
  await db.insert(schema.project).values({ id: projectId, organizationId: team.ws.id, name: "outside", createdAt: now, updatedAt: now });
  await db.insert(schema.projectItem).values({ projectId, itemId: `${team.tag}-img`, organizationId: team.ws.id, createdAt: now });

  actAs({ id: team.user.id, name: team.user.name, email: team.user.email, workspaceId: team.ws.id });
  const res = await measured(new NextRequest(`http://localhost/api/system/measured?projectId=${projectId}`));
  const copied = ((await res.json()) as { links: Record<string, string> }).links[web];
  expect(copied, "the app's copy gets a public link for the upload").toMatch(/^\/api\/files\/~\d+\.[0-9a-f]{32}\/inspo\/.+\.png$/);
  actAs(null);
  expect((await get(copied)).status, "that link loads with no session").toBe(200);

  const md = await readCriterio({ user: team.user, workspaces: [team.ws], via: "Claude" }, "https://app.test", projectId);
  const links = [...md.matchAll(/https:\/\/app\.test(\/api\/files\/[^\s)]+)/g)].map((m) => m[1]);
  expect(links.length, "criterio.md links the upload").toBeGreaterThan(0);
  actAs(null);
  for (const path of links) {
    const res = await get(path);
    expect(res.status, `${path} loads with no session`).toBe(200);
    expect(await res.text()).toBe("upload bytes");
  }
});

test("read_reference over MCP hands the client its picture inside the answer", async () => {
  const key = `inspo/${team.ws.id}/media/1760000000000-big.png`;
  const png = await sharp({ create: { width: 1600, height: 900, channels: 3, background: "#c33" } }).png().toBuffer();
  files.set(key, { body: png, contentType: "image/png" });
  const now = new Date(), web = `/api/files/${key}`, id = `${team.tag}-big`;
  await db.insert(schema.inspoItem).values({
    id, organizationId: team.ws.id, name: "big", web, webKey: webKeyOf(web), date: now.toISOString().slice(0, 10),
    author: team.user.name, createdBy: team.user.id, note: "", tagStatus: "done", createdAt: now, updatedAt: now,
  });

  const res = await handleRpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "read_reference", arguments: { id } } },
    { user: team.user, workspaces: [team.ws], via: "Claude" }, "https://app.test");
  const content = (res as { result: { content: { type: string; text?: string; data?: string; mimeType?: string }[] } }).result.content;
  expect(JSON.parse(content[0].text!).id, "the reference's facts come first").toBe(id);
  const image = content.find((c) => c.type === "image");
  expect(image, "the picture is attached").toBeDefined();
  const meta = await sharp(Buffer.from(image!.data!, "base64")).metadata();
  expect(`image/${meta.format}`, "its type is the one it says").toBe(image!.mimeType);
});

test("the proxy lets a signed link through to the route with no session cookie, and nothing unsigned", () => {
  const passes = (path: string) => proxy(new NextRequest(`http://localhost${path}`)).status !== 401;
  expect(passes(signedFilePath(KEY)), "a signed link reaches the route, which checks it").toBe(true);
  expect(passes(`/api/files/${KEY}`), "an unsigned one is stopped at the door").toBe(false);
  expect(passes(`/api/files/${KEY}?t=1.0`), "the older ?t= form reaches the route too").toBe(true);
  expect(passes(`/api/library?t=1`), "a t elsewhere opens nothing").toBe(false);
  expect(passes(`/api/library/~1.0/x`), "nor a ~ elsewhere").toBe(false);
});

test("claude.ai's reader, which passes on only text, gets a signed picture in words; anyone else gets the picture", async () => {
  actAs(null);
  const key = `inspo/${team.ws.id}/media/1760000000000-told.png`;
  const png = await sharp({ create: { width: 300, height: 200, channels: 4, background: "#2c3325" } }).png().toBuffer();
  files.set(key, { body: png, contentType: "image/png" });
  const now = new Date(), web = `/api/files/${key}`;
  await db.insert(schema.inspoItem).values({
    id: `${team.tag}-told`, organizationId: team.ws.id, name: "01 Identity@2x", web, webKey: webKeyOf(web), date: now.toISOString().slice(0, 10),
    author: team.user.name, createdBy: team.user.id, note: "", tagStatus: "done", createdAt: now, updatedAt: now,
    tagsJson: { visual: "A brand guideline page presenting a logo system.", summary: "", colors: [{ hex: "#ece5d6", share: 0.45, family: "beige" }], style: "minimal", sector: "studio", styleP: 1, sectorP: 1, tags: {} } as never,
  });
  const path = signedFilePath(key);
  const as = (ua: string) => GET(new NextRequest(`http://localhost${path}`, { headers: { "user-agent": ua } }), { params: Promise.resolve({ key: path.slice("/api/files/".length).split("/") }) });

  const claude = await as("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)");
  expect(claude.headers.get("content-type")).toMatch(/^text\/markdown/);
  expect(claude.headers.get("x-robots-tag"), "never listed by a search engine").toContain("noindex");
  const md = await claude.text();
  expect(md).toContain("# 01 Identity@2x");
  expect(md).toContain("(300 × 200 px)");
  expect(md).toContain("A brand guideline page presenting a logo system.");
  expect(md).toContain("#ece5d6 45%");

  const browser = await as("Mozilla/5.0 (Macintosh) Safari/605.1.15");
  expect(browser.headers.get("content-type")).toBe("image/png");
  expect(browser.headers.get("vary"), "a cache keeps the two answers apart").toBe("User-Agent");
  expect(Buffer.from(await browser.arrayBuffer()).equals(png)).toBe(true);
});

test("robots.txt lets fetchers reach file links and nothing else under /api/", () => {
  const rules = robots().rules as { allow: string[]; disallow: string[] };
  expect(rules.allow).toContain("/api/files/");
  expect(rules.disallow).toContain("/api/");
});
