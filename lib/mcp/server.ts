// The MCP server itself: JSON-RPC 2.0 over Streamable HTTP, answered message by message with no session kept
// between them (app/mcp/route.ts is the door). It offers tools (lib/mcp/tools.ts), prompts (lib/mcp/prompts.ts) and
// each project's criterio.md as a resource. Written by hand rather than on the SDK: a stateless server is a
// switch over a dozen methods, and it stays inside the app's own request, auth and database.
import "server-only";
import { z } from "zod";
import { HttpError } from "../workspace-core";
import { logAs, recordFailure } from "../log";
import type { McpCtx } from "./auth";
import { INSTRUCTIONS, TOOLS, toolList } from "./tools";
import { promptGet, promptList } from "./prompts";
import { listProjects, readCriterio } from "./pieces";

/** The protocol versions this server speaks, newest first. A client asking for another one is offered the newest. */
const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER = { name: "criterio", title: "Criterio", version: "1.0.0" };
/** Who the server is, with its logo (icons and websiteUrl came with protocol 2025-11-25; older clients skip them) */
const serverInfo = (origin: string) => ({
  ...SERVER,
  websiteUrl: origin,
  icons: [
    { src: `${origin}/icon-512.png`, mimeType: "image/png", sizes: ["512x512"] },
    { src: `${origin}/apple-icon.png`, mimeType: "image/png", sizes: ["180x180"] },
  ],
});

type Id = string | number | null;
interface RpcRequest { jsonrpc?: string; id?: Id; method?: string; params?: Record<string, unknown> }
type RpcResponse = { jsonrpc: "2.0"; id: Id; result: unknown } | { jsonrpc: "2.0"; id: Id; error: { code: number; message: string } };

const ok = (id: Id, result: unknown): RpcResponse => ({ jsonrpc: "2.0", id, result });
const fail = (id: Id, code: number, message: string): RpcResponse => ({ jsonrpc: "2.0", id, error: { code, message } });
const text = (s: string, isError = false) => ({ content: [{ type: "text", text: s }], ...(isError ? { isError: true } : {}) });

// A person's calls per minute, per server instance: enough for an agent at work, not for a loop gone wrong.
// ponytail: in memory, so each serverless instance counts on its own. Move it to the database if abuse shows up.
const LIMIT = { calls: 120, writes: 40, windowMs: 60_000 };
const g = globalThis as { __criterioMcpCalls?: Map<string, { at: number; calls: number; writes: number }> };
const seen = (g.__criterioMcpCalls ??= new Map());
function allow(userId: string, write: boolean): boolean {
  const now = Date.now();
  let w = seen.get(userId);
  if (!w || now - w.at > LIMIT.windowMs) { w = { at: now, calls: 0, writes: 0 }; seen.set(userId, w); }
  if (seen.size > 5000) for (const [k, v] of seen) if (now - v.at > LIMIT.windowMs) seen.delete(k);
  w.calls++; if (write) w.writes++;
  return w.calls <= LIMIT.calls && w.writes <= LIMIT.writes;
}

const RESOURCE = /^criterio:\/\/projects\/([\w-]{1,60})\/criterio\.md$/;

async function callTool(params: Record<string, unknown> | undefined, ctx: McpCtx, origin: string) {
  const tool = TOOLS.find((t) => t.name === params?.name);
  if (!tool) return null;
  await logAs({ userId: ctx.user.id });
  if (!allow(ctx.user.id, !tool.annotations.readOnlyHint)) return text("Too many calls in a minute. Wait a moment and go on.", true);
  const input = tool.input.safeParse(params?.arguments ?? {});
  if (!input.success) return text(`The arguments are not right:\n${z.prettifyError(input.error)}`, true);
  try {
    const out = await tool.run(input.data, ctx, origin);
    return text(typeof out === "string" ? out : JSON.stringify(out, null, 2));
  } catch (e) {
    // What the libraries refuse on purpose (not found, already there, not allowed) is for the model to read and
    // act on; anything else is ours, and says nothing of how the app is built
    if (e instanceof HttpError) return text(e.message, true);
    void recordFailure("mcp", tool.name, e);
    return text("Something failed in criterio. Try again in a moment.", true);
  }
}

/** Answers one JSON-RPC message. Null for a notification or a response, which get no answer. */
export async function handleRpc(msg: RpcRequest, ctx: McpCtx, origin: string): Promise<RpcResponse | null> {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return msg && typeof msg === "object" && "id" in msg && !("method" in msg) ? null : fail(msg?.id ?? null, -32600, "Invalid Request");
  }
  if (msg.id === undefined) return null;
  const id = msg.id;
  const p = msg.params;
  switch (msg.method) {
    case "initialize": {
      const asked = typeof p?.protocolVersion === "string" ? p.protocolVersion : "";
      return ok(id, {
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false }, prompts: { listChanged: false }, resources: { listChanged: false, subscribe: false } },
        serverInfo: serverInfo(origin),
        instructions: INSTRUCTIONS,
      });
    }
    case "ping": return ok(id, {});
    case "tools/list": return ok(id, { tools: toolList() });
    case "tools/call": {
      const result = await callTool(p, ctx, origin);
      return result ? ok(id, result) : fail(id, -32602, `Unknown tool: ${String(p?.name)}`);
    }
    case "prompts/list": return ok(id, { prompts: promptList(ctx.user.language) });
    case "prompts/get": {
      const prompt = promptGet(String(p?.name ?? ""), p?.arguments as Record<string, unknown> | undefined, ctx.user.language);
      return prompt ? ok(id, prompt) : fail(id, -32602, `Unknown prompt: ${String(p?.name)}`);
    }
    case "resources/list": {
      const projects = await listProjects(ctx, origin);
      return ok(id, { resources: projects.map((x) => ({ uri: `criterio://projects/${x.id}/criterio.md`, name: `${x.name}: criterio.md`, title: x.name, description: x.about ?? `${x.workspace}: ${x.areas_decided} areas decided`, mimeType: "text/markdown" })) });
    }
    case "resources/templates/list": return ok(id, { resourceTemplates: [] });
    case "resources/read": {
      const uri = String(p?.uri ?? "");
      const m = RESOURCE.exec(uri);
      if (!m) return fail(id, -32002, `Resource not found: ${uri}`);
      try {
        return ok(id, { contents: [{ uri, mimeType: "text/markdown", text: await readCriterio(ctx, origin, m[1]) }] });
      } catch (e) {
        if (e instanceof HttpError) return fail(id, -32002, `Resource not found: ${uri}`);
        throw e;
      }
    }
    default: return fail(id, -32601, `Method not found: ${msg.method}`);
  }
}
