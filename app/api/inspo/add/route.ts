import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { addItem } from "@/lib/items";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    const body = await req.json();
    const { empresa, web, tipo, comentarios, subcomentarios } = body as Record<string, string | undefined>;
    if (!empresa?.trim() || !web?.trim()) {
      return Response.json({ error: "empresa y web son obligatorios" }, { status: 400 });
    }
    try { new URL(web.trim()); } catch { return Response.json({ error: "La URL no es válida" }, { status: 400 }); }

    const item = await addItem(ctx.workspace.id, {
      empresa, web, tipo, comentarios, subcomentarios,
      autor: ctx.user.name || ctx.user.email,
      createdBy: ctx.user.id,
    });
    return Response.json({ ok: true, item });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: msg.includes("ya está") ? 409 : 500 });
  }
}
