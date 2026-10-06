// What an AI client reads to find its way in, before it has any token: where the connector is and who signs
// people in to it (RFC 9728), and how that authorization server works (RFC 8414). Both are this app.
import "server-only";
import { CORS, originOf } from "./auth";
import { SCOPE } from "./oauth";

const json = (body: unknown) => Response.json(body, { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } });

/** /.well-known/oauth-protected-resource: the connector, and where to get a token for it */
export function protectedResource(req: Request): Response {
  const origin = originOf(req);
  return json({
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    scopes_supported: [SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "Criterio",
  });
}

/** /.well-known/oauth-authorization-server: the endpoints of lib/mcp/oauth.ts */
export function authorizationServer(req: Request): Response {
  const origin = originOf(req);
  return json({
    issuer: origin,
    authorization_endpoint: `${origin}/mcp/authorize`,
    token_endpoint: `${origin}/api/mcp/token`,
    registration_endpoint: `${origin}/api/mcp/register`,
    revocation_endpoint: `${origin}/api/mcp/revoke`,
    scopes_supported: [SCOPE],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    revocation_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    authorization_response_iss_parameter_supported: true,
  });
}

export const preflight = () => new Response(null, { status: 204, headers: CORS });
