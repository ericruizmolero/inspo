import { resolveShare } from "@/lib/share";
import { loadShareView } from "@/lib/share-view";
import { getLocale } from "@/lib/i18n";
import { requestOrigin } from "@/lib/share-origin";
import { fileStem } from "@/lib/brand-export";

// GET → criterio.md as this link hands it out, as plain Markdown: for an agent to fetch, or a person to save.
// ?download=1 asks the browser to save it.
export async function GET(req: Request, ctx: RouteContext<"/s/[token]/md">) {
  const { token } = await ctx.params;
  const share = await resolveShare(token);
  if (!share) return new Response("not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  const view = await loadShareView(share.organizationId, share.projectId, share.mode, await getLocale(), `/s/${token}`, await requestOrigin());
  if (!view) return new Response("not found", { status: 404 });
  const download = new URL(req.url).searchParams.has("download");
  return new Response(view.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileStem(view.name)}-criterio.md"`,
    },
  });
}
