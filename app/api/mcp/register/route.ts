// Dynamic client registration (RFC 7591): an AI client introduces itself before sending anyone to sign in.
// Open to anyone, as the MCP spec has it; a registered app opens nothing until a person approves it.
import { CORS } from "@/lib/mcp/auth";
import { OAuthError, registerClient } from "@/lib/mcp/oauth";

const headers = { ...CORS, "Cache-Control": "no-store" };

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 16 * 1024) return Response.json({ error: "invalid_client_metadata", error_description: "too large" }, { status: 400, headers });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: "invalid_client_metadata", error_description: "not JSON" }, { status: 400, headers }); }
  try {
    return Response.json(await registerClient(body), { status: 201, headers });
  } catch (e) {
    if (e instanceof OAuthError) return Response.json({ error: e.code, error_description: e.message }, { status: e.status, headers });
    console.error("mcp register", e);
    return Response.json({ error: "server_error" }, { status: 500, headers });
  }
}
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
