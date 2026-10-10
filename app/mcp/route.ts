// criterio as an MCP server (Streamable HTTP): the address a person pastes into Claude, ChatGPT or Cursor.
// A client POSTs JSON-RPC messages and gets JSON back; no stream is kept open and no session is kept between
// messages (lib/mcp/server.ts). Without a valid token the answer is a 401 that says where to sign in, which is
// what starts the client's OAuth flow (lib/mcp/oauth.ts).
import { authMcp, originOf, CORS } from "@/lib/mcp/auth";
import { handleRpc } from "@/lib/mcp/server";
import { allow } from "@/lib/rate-limit";

export const maxDuration = 300; // saving a reference names it from its site, and tags it once answered

const MAX_BODY = 512 * 1024;
/** A person's requests per minute, across instances and whichever token they come with */
const PER_MINUTE = 120;
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS, ...headers } });
const rpcError = (code: number, message: string) => ({ jsonrpc: "2.0", id: null, error: { code, message } });

function unauthorized(req: Request): Response {
  const meta = `${originOf(req)}/.well-known/oauth-protected-resource/mcp`;
  const tried = !!req.headers.get("authorization");
  return json(rpcError(-32001, "Sign in to criterio to use this connector"), 401, {
    "WWW-Authenticate": `Bearer resource_metadata="${meta}"${tried ? ', error="invalid_token", error_description="The access token is missing, expired or revoked"' : ""}`,
  });
}

export async function POST(req: Request) {
  const ctx = await authMcp(req);
  if (!ctx) return unauthorized(req);
  if (!(await allow(`mcp:${ctx.user.id}`, PER_MINUTE, 60_000))) return json(rpcError(-32000, "Too many requests in a minute. Wait a moment and go on."), 429, { "Retry-After": "60" });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json(rpcError(-32600, "Request too large"), 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json(rpcError(-32700, "Parse error"), 400); }
  const origin = originOf(req);
  // Older protocol versions may send several messages at once
  if (Array.isArray(body)) {
    if (!body.length || body.length > 20) return json(rpcError(-32600, "Invalid Request"), 400);
    const answers = [];
    for (const msg of body) { const a = await handleRpc(msg, ctx, origin); if (a) answers.push(a); }
    return answers.length ? json(answers) : new Response(null, { status: 202, headers: CORS });
  }
  const answer = await handleRpc(body as Parameters<typeof handleRpc>[0], ctx, origin);
  // A notification or a response: taken, nothing to say
  return answer ? json(answer) : new Response(null, { status: 202, headers: CORS });
}

// No stream to listen on and no session to end. Signed out, the same 401 as a POST, so a client that starts
// with a GET still finds its way to sign in.
const notOffered = async (req: Request) => (await authMcp(req)) ? json(rpcError(-32000, "Method not allowed: POST JSON-RPC messages to this address"), 405, { Allow: "POST, OPTIONS" }) : unauthorized(req);
export const GET = notOffered;
export const DELETE = notOffered;
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
