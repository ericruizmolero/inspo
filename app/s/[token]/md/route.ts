import { resolveShare } from "@/lib/share";
import { loadShareView } from "@/lib/share-view";
import { getLocale } from "@/lib/i18n";
import { requestOrigin } from "@/lib/share-origin";
import { fileStem } from "@/lib/brand-export";
import { isCriterioPart, partMd } from "@/lib/criterio-md";

// GET → criterio.md as this link hands it out, as plain Markdown: for an agent to fetch, or a person to save.
// ?download=1 asks the browser to save it. ?part=decisions or an area's name (color, voice…) gives only that part: an agent
// reads the cheapest page that answers its task instead of the whole file.
export async function GET(req: Request, ctx: RouteContext<"/s/[token]/md">) {
  const { token } = await ctx.params;
  const share = await resolveShare(token);
  if (!share) return new Response("not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  const view = await loadShareView(share.organizationId, share.projectId, share.mode, await getLocale(), `/s/${token}`, await requestOrigin());
  if (!view) return new Response("not found", { status: 404 });
  const q = new URL(req.url).searchParams;
  const part = q.get("part") ?? "all";
  if (!isCriterioPart(part)) return new Response("unknown part", { status: 400 });
  const download = q.has("download");
  return new Response(part === "all" ? view.markdown : partMd(view.blocks, part), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileStem(view.name)}-criterio.md"`,
    },
  });
}
