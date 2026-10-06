// Some clients look for the authorization server's metadata under its OpenID name: the same answer
// (lib/mcp/metadata.ts). criterio is not an OpenID provider: no id tokens, no userinfo.
import { authorizationServer, preflight } from "@/lib/mcp/metadata";

export const GET = (req: Request) => authorizationServer(req);
export const OPTIONS = preflight;
