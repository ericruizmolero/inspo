import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { findByWeb, setThumbnail } from "@/lib/items";
import { ensurePost, postThumb } from "@/lib/posts";
import { normalizeWebUrl, postOf } from "@/lib/url";
import { getErrors } from "@/lib/i18n";

// Copying a post's video into storage can take a while
export const maxDuration = 120;

// POST { web } → { post, thumb } for a post on X that is in the workspace.
// The first call imports it (reads it, copies its photos, frame and video); later ones read what was saved.
// If the item has no thumbnail yet, the post's picture becomes it.
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const body = (await req.json().catch(() => ({}))) as { web?: string };
  const web = normalizeWebUrl(body.web ?? "");
  if (!web || !postOf(web)) return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });
  const row = await findByWeb(ctx.workspace.id, web);
  if (!row) return Response.json({ error: (await getErrors()).urlNotInWorkspace }, { status: 404 });

  const post = await ensurePost(web);
  if (!post) return Response.json({ post: null, thumb: null });
  let thumb = row.thumbnailUrl;
  if (!thumb) {
    thumb = postThumb(post);
    if (thumb) await setThumbnail(ctx.workspace.id, web, thumb);
  }
  return Response.json({ post, thumb });
}
