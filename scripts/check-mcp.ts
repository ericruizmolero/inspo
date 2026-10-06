// Walks the MCP connector end to end against a running LOCAL dev server: registers a client (RFC 7591), approves
// it for the dev user as the consent page would, exchanges the code for tokens, speaks MCP (initialize, tools,
// prompts, resources) and reads a project's criterio.md. With --write it also saves a reference, a text
// and a proposal in a project called "Prueba MCP" (made if missing), as Claude would. Cleans up its client and
// grant at the end; what --write saved stays, as it would in the app. Not a test framework: look at the output.
//   npm run check:mcp -- [--write] [server url, default http://localhost:3837]
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { approve, registerClient } from "../lib/mcp/oauth";
import { listWorkspaces } from "../lib/workspace-core";

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const U = (args.find((a) => /^https?:/.test(a)) ?? "http://localhost:3837").replace(/\/+$/, "");

type Json = Record<string, unknown>;
const ok = (label: string, pass: boolean, detail = "") => { console.log(`${pass ? "ok " : "FAIL"} ${label}${detail ? `: ${detail}` : ""}`); if (!pass) process.exitCode = 1; };

async function main() {
  if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/criterio")) throw new Error("check:mcp only runs against the local database");
  const email = (process.env.DEV_LOGIN_EMAIL ?? "").trim().toLowerCase();
  const [user] = email ? await db.select({ id: schema.user.id, name: schema.user.name }).from(schema.user).where(eq(schema.user.email, email)).limit(1) : [];
  if (!user) throw new Error("DEV_LOGIN_EMAIL is not set, or that user is not in the local database");
  const workspaces = await listWorkspaces(user.id);

  // 1. What a client finds before it has a token
  const first = await fetch(`${U}/mcp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const metaUrl = /resource_metadata="([^"]+)"/.exec(first.headers.get("www-authenticate") ?? "")?.[1];
  ok("401 with resource metadata", first.status === 401 && !!metaUrl, metaUrl);
  const pr = (await (await fetch(metaUrl!)).json()) as Json;
  const as = (await (await fetch(`${(pr.authorization_servers as string[])[0]}/.well-known/oauth-authorization-server`)).json()) as Json;
  ok("metadata", pr.resource === `${U}/mcp` && typeof as.token_endpoint === "string", `${as.authorization_endpoint}`);

  // 2. Registration, as the client does it over HTTP
  const redirect = "http://127.0.0.1:43210/callback";
  const regRes = await fetch(as.registration_endpoint as string, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_name: "check:mcp", redirect_uris: [redirect], token_endpoint_auth_method: "none" }) });
  const reg = (await regRes.json()) as Json;
  ok("register", regRes.status === 201 && typeof reg.client_id === "string", String(reg.client_id));
  const clientId = reg.client_id as string;

  // 3. The person says yes: here through the library, as app/actions/mcp.ts does on the consent page
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const back = await approve({ clientId, clientName: "check:mcp", redirectUri: redirect, codeChallenge: challenge, state: "s" }, user.id, U);
  const code = new URL(back).searchParams.get("code")!;
  ok("approve", !!code && new URL(back).searchParams.get("iss") === U);

  // 4. Tokens
  const form = (o: Record<string, string>) => fetch(as.token_endpoint as string, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(o) }).then(async (r) => ({ status: r.status, body: (await r.json()) as Json }));
  const bad = await form({ grant_type: "authorization_code", code, client_id: clientId, redirect_uri: redirect, code_verifier: "a".repeat(43) });
  ok("wrong verifier refused", bad.status === 400 && bad.body.error === "invalid_grant");
  const tok = await form({ grant_type: "authorization_code", code, client_id: clientId, redirect_uri: redirect, code_verifier: verifier, resource: `${U}/mcp` });
  ok("exchange", tok.status === 200 && typeof tok.body.access_token === "string", `expires in ${tok.body.expires_in}s`);
  let access = tok.body.access_token as string;
  const fresh = await form({ grant_type: "refresh_token", refresh_token: tok.body.refresh_token as string, client_id: clientId });
  ok("refresh rotates", fresh.status === 200 && fresh.body.access_token !== access);
  const dead = await fetch(`${U}/mcp`, { method: "POST", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }) });
  ok("old access token dead", dead.status === 401);
  access = fresh.body.access_token as string;

  // 5. MCP
  const rpc = async (method: string, params?: unknown) => {
    const r = await fetch(`${U}/mcp`, { method: "POST", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
    return (await r.json()) as { result?: Json; error?: Json };
  };
  const call = async (name: string, a: unknown) => { const r = await rpc("tools/call", { name, arguments: a }); const c = (r.result?.content as { text: string }[] | undefined)?.[0]?.text ?? JSON.stringify(r.error); return { text: c, isError: !!r.result?.isError || !!r.error }; };
  const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "check", version: "0" } });
  ok("initialize", (init.result?.serverInfo as Json)?.name === "criterio", `protocol ${init.result?.protocolVersion}`);
  const tools = ((await rpc("tools/list")).result?.tools as Json[]) ?? [];
  ok("tools/list", tools.length >= 8, tools.map((t) => t.name).join(", "));
  const prompts = ((await rpc("prompts/list")).result?.prompts as Json[]) ?? [];
  ok("prompts/list", prompts.length === 4, prompts.map((p) => p.name).join(", "));
  const projects = JSON.parse((await call("list_projects", {})).text) as Json[];
  ok("list_projects", Array.isArray(projects), `${projects.length} projects in ${workspaces.map((w) => w.name).join(", ")}`);
  if (projects[0]) {
    const md = await call("read_criterio", { project: projects[0].id, section: "decisions" });
    ok("read_criterio", !md.isError && md.text.startsWith("# "), `${projects[0].name}: ${md.text.length} chars`);
    const refs = await call("list_references", { project: projects[0].name });
    ok("list_references", !refs.isError, `${(JSON.parse(refs.text).references as unknown[]).length} references`);
    const res = await rpc("resources/read", { uri: `criterio://projects/${projects[0].id}/criterio.md` });
    ok("resources/read", typeof (res.result?.contents as Json[])?.[0]?.text === "string");
  }
  const nope = await call("read_criterio", { project: "a project that does not exist" });
  ok("unknown project is a tool error", nope.isError, nope.text.slice(0, 60));

  if (WRITE) {
    const name = "Prueba MCP";
    let project = projects.find((p) => p.name === name);
    if (!project) {
      const made = await call("create_project", { name, about: "Proyecto de prueba del conector MCP. Se puede borrar.", workspace: workspaces.find((w) => w.kind === "team")?.name ?? workspaces[0].name });
      ok("create_project", !made.isError, made.text.replace(/\s+/g, " ").slice(0, 80));
      project = JSON.parse(made.text) as Json;
    }
    const ref = await call("add_reference", { project: project.id, url: "https://linear.app", note: "Prueba del conector: densidad sin ruido.", areas: ["layout"] });
    ok("add_reference (url)", !ref.isError, ref.text.replace(/\s+/g, " ").slice(0, 100));
    const txt = await call("add_reference", { project: project.id, text: "# Tono\n\nHablamos de tú. Frases cortas.", note: "Prueba del conector", areas: ["voice"] });
    ok("add_reference (text)", !txt.isError, txt.text.replace(/\s+/g, " ").slice(0, 100));
    const prop = await call("propose_decision", { project: project.id, area: "voice", decision: `Hablamos de tú, con frases cortas. (prueba ${Date.now()})`, why: "Prueba del conector", never: ["Tratar de usted"], reason: "check:mcp --write" });
    ok("propose_decision", !prop.isError && prop.text.includes('"proposed": true'));
    const empty = await call("propose_decision", { project: project.id, area: "voice", decision: "   " });
    ok("an empty decision is refused", empty.isError, empty.text.slice(0, 40));
  }

  // 6. Gone: the grant and the client this run made
  await db.delete(schema.mcpClient).where(eq(schema.mcpClient.id, clientId));
  const after = await fetch(`${U}/mcp`, { method: "POST", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }) });
  ok("token dead once the client is gone", after.status === 401);
  await pool.end();
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
