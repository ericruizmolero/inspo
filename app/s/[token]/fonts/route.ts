import { resolveShare } from "@/lib/share";
import { getBrand } from "@/lib/brand-store";
import { siteFacesOf } from "@/lib/brand-fonts";

export const maxDuration = 30;

// GET → { faces: { <faceId>: { weight, style, src }[] } }: the files of the brand's faces its client's site serves,
// through this link's font route
export async function GET(_req: Request, ctx: RouteContext<"/s/[token]/fonts">) {
  const { token } = await ctx.params;
  const share = await resolveShare(token);
  if (!share) return Response.json({ faces: {} }, { status: 404 });
  const brand = await getBrand(share.organizationId, share.projectId);
  const faces = await siteFacesOf(brand, (src) => src.replace(/^\/api\/system\/font\?/, `/s/${token}/font?`));
  return Response.json({ faces }, { headers: { "Cache-Control": "private, max-age=600" } });
}
