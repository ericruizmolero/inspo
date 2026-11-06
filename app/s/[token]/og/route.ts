import { resolveShare } from "@/lib/share";
import { loadShareBoard } from "@/lib/share-board";
import { isPublicHttpUrl } from "@/lib/extract";
import { ogImage } from "@/lib/og-image";

// GET ?id=<item> → the og:image of a site on the link's board that has no stored picture, as the app's board shows it
// (app/api/og). Only for the references this board names: the link is not a fetcher for any address.
export async function GET(req: Request, ctx: RouteContext<"/s/[token]/og">) {
  const { token } = await ctx.params;
  const share = await resolveShare(token);
  if (!share) return new Response("not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const board = await loadShareBoard(share.organizationId, share.projectId, share.mode, `/s/${token}`);
  const item = board && board.og.includes(id) ? board.items.find((i) => i.id === id) : undefined;
  if (!item || !isPublicHttpUrl(item.web)) return new Response("forbidden", { status: 403 });
  return ogImage(item.web);
}
