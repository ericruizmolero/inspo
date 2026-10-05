import { resolveShare } from "@/lib/share";
import { getBrand } from "@/lib/brand-store";
import { brandZip } from "@/lib/brand-zip";
import { loadShareView } from "@/lib/share-view";
import { getLocale } from "@/lib/i18n";
import { requestOrigin } from "@/lib/share-origin";

export const maxDuration = 60;

// GET → the brand's zip, with criterio.md as this link hands it out
export async function GET(_req: Request, ctx: RouteContext<"/s/[token]/download">) {
  const { token } = await ctx.params;
  const share = await resolveShare(token);
  if (!share) return new Response("not found", { status: 404 });
  const view = await loadShareView(share.organizationId, share.projectId, share.mode, await getLocale(), `/s/${token}`, await requestOrigin());
  if (!view) return new Response("not found", { status: 404 });
  const { file, fileName } = await brandZip(await getBrand(share.organizationId, share.projectId), view.name, view.markdown);
  return new Response(new Uint8Array(file), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });
}
