// Where the MCP connector is and who signs people in to it (lib/mcp/metadata.ts). A client asks for it at the
// root or with the connector's path after it (…/oauth-protected-resource/mcp): both answer the same.
import { protectedResource, preflight } from "@/lib/mcp/metadata";

export const GET = (req: Request) => protectedResource(req);
export const OPTIONS = preflight;
