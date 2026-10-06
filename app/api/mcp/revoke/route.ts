// Token revocation (RFC 7009): a client that disconnects ends its own grant. Always 200, whatever the token was.
import { CORS } from "@/lib/mcp/auth";
import { revokeToken } from "@/lib/mcp/oauth";
import { readForm } from "@/lib/mcp/form";

export async function POST(req: Request) {
  const f = await readForm(req);
  await revokeToken(f.token).catch((e) => console.error("mcp revoke", e));
  return new Response(null, { status: 200, headers: { ...CORS, "Cache-Control": "no-store" } });
}
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
