import { NextResponse } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { isAdmin } from "@/lib/activity";
import { readVault } from "@/lib/vault";
import { getLocale } from "@/lib/i18n";

// One entry of the Vault. Its documentation (the code) is for partners here: everyone else's agent reads it through
// the connector (lib/mcp/vault.ts), where it is used
export async function GET(_req: Request, ctx: RouteContext<"/api/vault/[entry]">) {
  const session = await requireCtx();
  if (isResponse(session)) return session;
  const partner = await isAdmin(session.user.email);
  const found = await readVault((await ctx.params).entry, { drafts: partner, code: partner, locale: await getLocale() });
  if (!found) return new NextResponse("not found", { status: 404 });
  const { imageKey: _key, ...entry } = found;
  void _key;
  return NextResponse.json(entry, { headers: { "Cache-Control": "private, no-store" } });
}
