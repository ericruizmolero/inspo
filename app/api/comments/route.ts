import { requireCtx, isResponse } from "@/lib/workspace";
import { listComments } from "@/lib/comments";


// GET → { [itemId]: InspoComment[] } de todo el workspace. Lo relee el cliente cada 20 s con un hilo
// abierto; la carga inicial llega con la página y los cambios van por app/actions/library.ts.
export async function GET() {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    return Response.json(await listComments(ctx.workspace.id));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

