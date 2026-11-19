import { vaultShare } from "@/lib/vault";
import { vaultCard } from "@/lib/vault-og";

// The card a link to a Vault piece's preview shows where it is pasted (lib/vault-og.tsx), one per published entry.
// Public, as the preview it stands for (proxy.ts PUBLIC): whoever unfurls a link has no session
export async function GET(_req: Request, ctx: RouteContext<"/api/vault/[entry]/og">) {
  const e = await vaultShare((await ctx.params).entry);
  if (!e) return new Response("not found", { status: 404 });
  return vaultCard(e);
}
