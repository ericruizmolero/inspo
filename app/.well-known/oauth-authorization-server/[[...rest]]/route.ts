// How the connector's authorization server works (lib/mcp/metadata.ts)
import { authorizationServer, preflight } from "@/lib/mcp/metadata";

export const GET = (req: Request) => authorizationServer(req);
export const OPTIONS = preflight;
