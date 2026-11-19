import { vaultPreview } from "@/lib/vault";
import { VAULT_PREVIEW_CSP, cardDoc, withIcon, withShare } from "@/lib/vault-preview";
import { SITE } from "@/lib/site";

// The live preview of a Vault entry (lib/vault-preview.ts): the piece running, as a page of its own for the
// iframe in its sheet. It runs our team's scripts, so it is served sandboxed: `sandbox allow-scripts` gives the
// document no origin, whether framed or opened by its address, so it reads no cookie, no storage and nothing of
// the app (the policy is VAULT_PREVIEW_CSP; next.config.ts sends it for this path too, in place of the app's own).
// It is public (proxy.ts lets it through with no session): a link to a piece running is passed around, and the page is
// the same for everyone. What it shows is what the piece shows in any browser; the entry's sheet and its documentation
// still take a session.
// Opened by its address it carries its name, what it is and a card of its own (./og) for wherever the link is pasted.
// ?card=1 is the same document as a card plays it on hover: still, and a click opens the entry; &hover=1 also plays
// the piece's own hover by itself, for a button
export async function GET(req: Request, ctx: RouteContext<"/api/vault/[entry]/preview">) {
  const found = await vaultPreview((await ctx.params).entry);
  if (!found) return new Response("not found", { status: 404 });
  const { doc } = found;
  const q = new URL(req.url).searchParams;
  const at = `${SITE}/api/vault/${encodeURIComponent(found.slug)}`;
  return new Response(q.has("card") ? cardDoc(doc, q.has("hover")) : withIcon(withShare(doc, { title: found.title, description: found.summary, url: `${at}/preview`, image: `${at}/og?v=${found.version}` })), { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": VAULT_PREVIEW_CSP, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "public, max-age=60", "X-Robots-Tag": "noindex, nofollow" } });
}
