// Two servers at once. The app runs on several instances, and a DESIGN.md generation or a page capture on any of
// them writes to a store they all share. Each test loads the module twice with the registry reset in between, so
// the two copies share nothing in memory, only storage and the database, as two instances do.
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { db, schema } from "@/lib/db";
import { webKeyOf } from "@/lib/url";
import { actAs, storage, type Actor } from "./harness";
import type { DesignTokens, ExtractResult } from "@/lib/design-extract";
import type { GenerateResult } from "@/lib/design-md";
import type { DesignSpec } from "@/types/design";

const shared = vi.hoisted(() => ({
  calls: { extract: 0, generate: 0, usage: 0 },
  jpeg: async () => (await import("sharp")).default({ create: { width: 8, height: 8, channels: 3, background: "#336699" } }).jpeg().toBuffer(),
}));
const { calls, jpeg } = shared;

vi.mock("@/lib/design-extract", () => ({
  extractDesign: async (): Promise<ExtractResult> => {
    calls.extract++;
    // The second request arrives while this one is still reading the site
    await new Promise((r) => setTimeout(r, 150));
    const img = await jpeg();
    return { tokens: { copy: { h1: "", headings: [], ctas: [] } } as unknown as DesignTokens, screenshot: img, fullShot: img, cover: img, scroll: img, logo: null, logoSvg: null, icons: [], fontFiles: [] };
  },
}));
vi.mock("@/lib/design-md", () => ({
  generateDesignMd: async (): Promise<GenerateResult> => {
    calls.generate++;
    return { spec: {} as DesignSpec, markdown: "# Site", model: "test/model", provider: null, requestId: null, costUsd: 0.01, ms: 1, usage: { input: 1, output: 1, cacheRead: 0, reasoning: 0 }, fallbackFrom: null, prompt: "design_md@1" };
  },
}));
vi.mock("@/lib/usage", async (importOriginal) => ({ ...(await importOriginal<object>()), recordUsage: async () => { calls.usage++; } }));

/** The same module twice, each copy with a memory of its own, as two instances have */
async function twice<T>(load: () => Promise<T>): Promise<[T, T]> {
  vi.resetModules();
  const a = await load();
  vi.resetModules();
  const b = await load();
  return [a, b];
}

const tag = `conc${randomBytes(4).toString("hex")}`;
const site = (n: string) => `https://${tag}-${n}.example.com`;
const owner: Actor = { id: `${tag}-user`, name: `${tag} owner`, email: `${tag}@example.test`, workspaceId: `${tag}-team` };

beforeAll(async () => {
  const now = new Date();
  await db.insert(schema.user).values({ id: owner.id, name: owner.name, email: owner.email, emailVerified: true, createdAt: now, updatedAt: now });
  await db.insert(schema.organization).values([
    { id: `${tag}-team`, name: `${tag} team`, slug: `${tag}-team`, kind: "team", plan: "agency", createdAt: now },
    { id: `${tag}-personal`, name: `${tag} personal`, slug: `${tag}-personal`, kind: "personal", plan: "agency", createdAt: now },
  ]);
  await db.insert(schema.member).values([
    { id: `${tag}-m1`, organizationId: `${tag}-team`, userId: owner.id, role: "owner", createdAt: now },
    { id: `${tag}-m2`, organizationId: `${tag}-personal`, userId: owner.id, role: "owner", createdAt: now },
  ]);
  const web = site("same");
  await db.insert(schema.inspoItem).values({ id: `${tag}-item`, organizationId: `${tag}-team`, name: "Same", web, webKey: webKeyOf(web), date: now.toISOString().slice(0, 10), author: owner.name, createdBy: owner.id, tagStatus: "done", createdAt: now, updatedAt: now });
  process.env.OPENROUTER_API_KEY = "test";
  storage.readMs = 30;
});

afterAll(async () => {
  storage.readMs = 0;
  delete process.env.OPENROUTER_API_KEY;
  actAs(null);
  await db.delete(schema.organization).where(inArray(schema.organization.id, [`${tag}-team`, `${tag}-personal`]));
  await db.delete(schema.user).where(eq(schema.user.id, owner.id));
  // Shared across workspaces, so no cascade reaches them
  await db.delete(schema.designDoc).where(like(schema.designDoc.url, `https://${tag}%`));
  await db.delete(schema.pageShot).where(like(schema.pageShot.url, `https://${tag}%`));
});

test("two instances save the DESIGN.md of two sites at once and the library lists both", async () => {
  const [s1, s2] = await twice(() => import("@/lib/design-store"));
  const [a, b] = [site("a"), site("b")];
  const entry = (url: string) => ({ url, markdown: `# ${url}`, generatedAt: new Date().toISOString(), model: "test/model" });
  const img = await jpeg();
  const images = { fullShot: img, cover: img, scroll: img };
  await Promise.all([s1.saveDesignMd(entry(a), images), s2.saveDesignMd(entry(b), images)]);

  const [s3] = await twice(() => import("@/lib/design-store"));
  const index = await s3.designDocsFor([a, b]);
  expect(Object.keys(index).sort(), "a library with both sites lists both DESIGN.md").toEqual([a, b].sort());
});

test("two instances capture two sites at once and the board shows both", async () => {
  const [p1, p2] = await twice(() => import("@/lib/page-shots"));
  const { shotKey } = await import("@/lib/screenshot");
  const [a, b] = [site("c"), site("d")];
  const img = await jpeg();
  await Promise.all([p1.savePageShot(a, shotKey(a), img), p2.savePageShot(b, shotKey(b), img)]);

  const [p3] = await twice(() => import("@/lib/page-shots"));
  const shots = await p3.pageShotsFor([a, b]);
  expect(Object.keys(shots).sort(), "a board with both sites shows both captures").toEqual([a, b].sort());
});

test("the same site asked from two instances is read, generated and charged once", async () => {
  const [r1, r2] = await twice(() => import("@/app/api/design-md/route"));
  actAs(owner);
  const web = site("same");
  const ask = () => new NextRequest(`http://localhost/api/design-md?url=${encodeURIComponent(web)}`);
  const [res1, res2] = await Promise.all([r1.GET(ask()), r2.GET(ask())]);
  expect([res1.status, res2.status], "both get the DESIGN.md").toEqual([200, 200]);
  expect(calls.extract, "the site is read once").toBe(1);
  expect(calls.generate, "the model is called once").toBe(1);
  expect(calls.usage, "the workspace is charged once").toBe(1);
});
