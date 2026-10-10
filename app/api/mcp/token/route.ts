// The token endpoint of the MCP connector's authorization server (lib/mcp/oauth.ts): a code for tokens, or a
// refresh token for new ones.
import { CORS, originOf } from "@/lib/mcp/auth";
import { OAuthError, exchangeCode, refreshTokens } from "@/lib/mcp/oauth";
import { readForm } from "@/lib/mcp/form";
import { recordFailure } from "@/lib/log";
import { allow, ipOf } from "@/lib/rate-limit";

const headers = { ...CORS, "Cache-Control": "no-store", Pragma: "no-cache" };

export async function POST(req: Request) {
  // Per address, as registration is: a code is exchanged once and a refresh comes every hour or so per connection
  if (!(await allow(`oauth:token:${ipOf(req.headers)}`, 120, 60_000))) {
    return Response.json({ error: "temporarily_unavailable", error_description: "too many requests" }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  }
  const f = await readForm(req);
  try {
    if (f.grant_type === "authorization_code") {
      return Response.json(await exchangeCode({ code: f.code, clientId: f.client_id, clientSecret: f.client_secret, redirectUri: f.redirect_uri, codeVerifier: f.code_verifier, resource: f.resource }, originOf(req)), { headers });
    }
    if (f.grant_type === "refresh_token") {
      return Response.json(await refreshTokens({ refreshToken: f.refresh_token, clientId: f.client_id, clientSecret: f.client_secret }), { headers });
    }
    throw new OAuthError("unsupported_grant_type", "authorization_code or refresh_token");
  } catch (e) {
    if (e instanceof OAuthError) return Response.json({ error: e.code, error_description: e.message }, { status: e.status, headers });
    void recordFailure("mcp", `token ${f.grant_type}`, e);
    return Response.json({ error: "server_error" }, { status: 500, headers });
  }
}
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
