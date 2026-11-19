import { vaultPreview } from "@/lib/vault";
import { VAULT_PREVIEW_CSP, cardDoc, withIcon } from "@/lib/vault-preview";

// The live preview of a Vault entry (lib/vault-preview.ts): the piece running, as a page of its own for the
// iframe in its sheet. It runs our team's scripts, so it is served sandboxed: `sandbox allow-scripts` gives the
// document no origin, whether framed or opened by its address, so it reads no cookie, no storage and nothing of
// the app (the policy is VAULT_PREVIEW_CSP; next.config.ts sends it for this path too, in place of the app's own).
// It is public (proxy.ts lets it through with no session): a link to a piece running is passed around, and the page is
// the same for everyone. What it shows is what the piece shows in any browser; the entry's sheet and its documentation
// still take a session.
// ?card=1 is the same document as a card plays it on hover: still, and a click opens the entry; &hover=1 also plays
// the piece's own hover by itself, for a button
export async function GET(req: Request, ctx: RouteContext<"/api/vault/[entry]/preview">) {
  const doc = await vaultPreview((await ctx.params).entry);
  if (!doc) return new Response("not found", { status: 404 });
  const q = new URL(req.url).searchParams;
  return new Response(q.has("card") ? cardDoc(doc, q.has("hover")) : withIcon(doc), { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": VAULT_PREVIEW_CSP, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "public, max-age=60", "X-Robots-Tag": "noindex, nofollow" } });
}
