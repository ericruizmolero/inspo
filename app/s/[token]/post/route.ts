import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { resolveShare } from "@/lib/share";
import { findByWeb } from "@/lib/items";
import { readPost, type Post } from "@/lib/posts";
import { normalizeWebUrl, postOf } from "@/lib/url";

const PI = schema.projectItem;

// GET ?web=<post> → { post } for a post from X on the link's board, as X serves it right now: its words, its photos
// and its video at X's own addresses. Never our copy of them, which stays inside the workspace (lib/url.ts
// staysInside): a link names the post and plays it from where it lives. If X no longer gives the post, there is
// none, and its card is its words. Only for the posts this board names.
export async function GET(req: Request, ctx: RouteContext<"/s/[token]/post">) {
  const { token } = await ctx.params;
  const headers = { "X-Robots-Tag": "noindex" };
  const share = await resolveShare(token);
  if (!share) return Response.json({ error: "not found" }, { status: 404, headers });
  const web = normalizeWebUrl(new URL(req.url).searchParams.get("web") ?? "");
  if (!web || !postOf(web)) return Response.json({ error: "bad url" }, { status: 400, headers });
  const row = await findByWeb(share.organizationId, web);
  if (!row || (share.itemIds && !share.itemIds.includes(row.id))) return Response.json({ error: "forbidden" }, { status: 403, headers });
  const [on] = await db.select({ id: PI.itemId }).from(PI)
    .where(and(eq(PI.organizationId, share.organizationId), eq(PI.projectId, share.projectId), eq(PI.itemId, row.id), isNull(PI.archivedAt))).limit(1);
  if (!on) return Response.json({ error: "forbidden" }, { status: 403, headers });

  const raw = await readPost(web);
  if (!raw) return Response.json({ post: null, thumb: null }, { headers });
  const post: Post = {
    ...raw, savedAt: "",
    media: raw.media.map((m) => (m.kind === "photo"
      ? { kind: m.kind, src: m.image.includes("?") ? m.image : `${m.image}?name=large`, w: m.w, h: m.h }
      : { kind: m.kind, src: m.video?.play ?? "", poster: m.image || undefined, w: m.w, h: m.h })),
  };
  return Response.json({ post, thumb: null }, { headers: { ...headers, "Cache-Control": "private, max-age=600" } });
}
