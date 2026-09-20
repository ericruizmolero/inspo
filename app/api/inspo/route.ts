import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { listItems, deleteItem } from "@/lib/items";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    return Response.json(await listItems(ctx.workspace.id));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE ?id=… → cualquier miembro del workspace puede quitar una tarjeta
// (misma política que las miniaturas). Se lleva también su hilo de comentarios.
export async function DELETE(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "Falta id" }, { status: 400 });
  try {
    const ok = await deleteItem(ctx.workspace.id, id);
    if (!ok) return Response.json({ error: "Esa tarjeta ya no existe" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
