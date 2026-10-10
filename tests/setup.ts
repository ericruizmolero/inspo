// Every test runs the app's own handlers, actions and queries against Postgres (DATABASE_URL). What is mocked is
// the edge: who is signed in (tests/harness.ts actAs), the request's headers, and anything that leaves the
// machine. Local R2 keys write to the production bucket, so storage is a map in memory and the keys are dropped.
import { vi } from "vitest";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });
for (const k of Object.keys(process.env)) {
  if (/^(R2_|OPENROUTER|RESEND|TYPESAFE|BLOB_|VERCEL|ANTHROPIC|OPENAI|BROWSERLESS|SENTRY|EMBED_)/.test(k)) delete process.env[k];
}
// Tests write rows: never to a database on another machine
const dbHost = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "") ? new URL(process.env.DATABASE_URL!).hostname : "127.0.0.1";
if (!["localhost", "127.0.0.1", "[::1]"].includes(dbHost)) throw new Error(`Tests only run against a local Postgres; DATABASE_URL points at ${dbHost}`);

vi.mock("@/lib/session", async () => {
  const h = await import("./harness");
  return { getSession: async () => h.currentSession() };
});

vi.mock("next/headers", async () => {
  const h = await import("./harness");
  return { headers: async () => h.requestHeaders(), cookies: async () => h.cookieJar, draftMode: async () => ({ isEnabled: false }) };
});

vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<object>()), after: () => {} }));
// A client component from a package: only a reference from the server (vitest.config.mts stubs the app's own)
vi.mock("next/link", () => ({ default: function Link() { return null; } }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: <T>(fn: T) => fn }));

vi.mock("next/navigation", async () => {
  const { NavigationThrow } = await import("./harness");
  return {
    redirect: (url: string) => { throw new NavigationThrow("redirect", url); },
    permanentRedirect: (url: string) => { throw new NavigationThrow("redirect", url); },
    notFound: () => { throw new NavigationThrow("notFound"); },
    forbidden: () => { throw new NavigationThrow("forbidden"); },
    unauthorized: () => { throw new NavigationThrow("unauthorized"); },
  };
});

vi.mock("@/lib/storage", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/storage")>();
  const { files, storage } = await import("./harness");
  const get = async (key: string) => {
    // What the bucket held when asked, arriving a round trip later
    const f = files.get(key);
    if (storage.readMs) await new Promise((r) => setTimeout(r, storage.readMs));
    return f ? { body: f.body, contentType: f.contentType, size: f.body.byteLength } : null;
  };
  return {
    ...real,
    usingR2: () => false,
    putFile: async (key: string, body: Buffer, contentType: string) => { files.set(key, { body, contentType }); return real.fileUrl(key); },
    getFile: get,
    openFile: async (key: string) => {
      const f = await get(key);
      return f ? { stream: new Blob([new Uint8Array(f.body)]).stream(), contentType: f.contentType, size: f.size } : null;
    },
    fileExists: async (key: string) => files.has(key),
    signedFileUrl: async () => null,
    uploadUrl: async () => null,
    listFiles: async (prefix: string) => [...files.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key, uploadedAt: new Date() })),
    deleteFiles: async (keys: string[]) => { for (const k of keys) files.delete(k); },
    getJson: async (key: string) => { const f = await get(key); return f ? JSON.parse(f.body.toString("utf8")) : null; },
    putJson: async (key: string, data: unknown) => { files.set(key, { body: Buffer.from(JSON.stringify(data)), contentType: "application/json" }); },
  };
});

// llmEnabled, embedEnabled and jevEnabled stay real: they read the keys, which a probe sets (probe.ts withKeys) to
// get past "no key" and reach the ownership check behind it
vi.mock("@/lib/llm", async (importOriginal) => {
  const { blocked } = await import("./harness");
  return { ...(await importOriginal<object>()), llm: (i: unknown) => blocked("llm", i) };
});

vi.mock("@/lib/jev", async (importOriginal) => {
  const { reached } = await import("./harness");
  return {
    ...(await importOriginal<object>()),
    matchQuery: async (_q: string, items: { id?: string }[]) => { reached.push(["jev", items.map((i) => i.id)]); return {}; },
  };
});

vi.mock("@/lib/mail", async (importOriginal) => {
  const { blocked } = await import("./harness");
  return { ...(await importOriginal<object>()), sendMail: (to: unknown) => blocked("mail", to) };
});

vi.mock("@/lib/screenshot", async (importOriginal) => {
  const { blocked } = await import("./harness");
  return {
    ...(await importOriginal<object>()),
    captureHero: (url: string) => blocked("screenshot", url),
    getOrCaptureShot: (url: string) => blocked("screenshot", url),
    capturePage: (url: string) => blocked("screenshot", url),
    captureNewPage: (url: string) => blocked("screenshot", url),
  };
});

vi.mock("@/lib/safe-fetch", async (importOriginal) => {
  const { blocked } = await import("./harness");
  return { ...(await importOriginal<object>()), safeFetch: (url: unknown) => blocked("fetch", String(url)) };
});

vi.mock("@/lib/jobs", async (importOriginal) => {
  const { reached } = await import("./harness");
  return {
    ...(await importOriginal<object>()),
    enqueue: async (jobs: unknown) => { reached.push(["queue", jobs]); },
    enqueueEmbed: async (ids: unknown) => { reached.push(["queue", ids]); },
    scheduleSweep: async () => {},
  };
});

// embedItems and staleEmbedding read and write by id with no workspace filter (#115): record which ids reach them.
// Every query is the vector the fixture gives A's item, so a search that is not filtered by workspace finds it.
vi.mock("@/lib/embed", async (importOriginal) => {
  const { blocked, reached, UNIT_VECTOR } = await import("./harness");
  return {
    ...(await importOriginal<object>()),
    embedTexts: (input: unknown) => blocked("embed", input),
    queryVector: async () => UNIT_VECTOR,
    embedItems: async (ids: string[]) => { reached.push(["embedItems", ids]); return 0; },
    staleEmbedding: async (id: string) => { reached.push(["staleEmbedding", id]); },
  };
});

vi.mock("puppeteer-core", async () => {
  const { blocked } = await import("./harness");
  const launch = () => blocked("chromium");
  return { default: { launch, connect: launch }, launch, connect: launch };
});

vi.mock("@vercel/queue", async () => {
  const { blocked } = await import("./harness");
  return { send: (topic: unknown) => blocked("queue", topic), handleCallback: (fn: unknown) => fn };
});

const realFetch = globalThis.fetch;
vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (["localhost", "127.0.0.1"].includes(url.hostname)) return realFetch(input, init);
  const { blocked } = await import("./harness");
  return blocked("fetch", url.href);
});
