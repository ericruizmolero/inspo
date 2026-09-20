import { NextRequest } from "next/server";
import { requireCtx, isResponse, canManage } from "@/lib/workspace";
import { listComments, addComment, deleteComment } from "@/lib/comments";

export const runtime = "nodejs";

// GET            → { [itemId]: InspoComment[] } de todo el workspace
export async function GET() {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    return Response.json(await listComments(ctx.workspace.id));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// POST { itemId, body } → InspoComment
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const { itemId, body } = (await req.json().catch(() => ({}))) as { itemId?: string; body?: string };
  if (!itemId || typeof body !== "string" || !body.trim()) {
    return Response.json({ error: "Faltan datos" }, { status: 400 });
  }
  try {
    const c = await addComment(ctx.workspace.id, { itemId, authorId: ctx.user.id, authorName: ctx.user.name || ctx.user.email.split("@")[0], body });
    return Response.json(c, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

// DELETE ?id=… → propio, o cualquiera si administra el workspace
export async function DELETE(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "Falta id" }, { status: 400 });
  const ok = await deleteComment(ctx.workspace.id, id, ctx.user.id, canManage(ctx.workspace.role));
  if (!ok) return Response.json({ error: "No se puede borrar ese comentario" }, { status: 403 });
  return Response.json({ ok: true });
}
