import { requireCtx, isResponse } from "@/lib/workspace";
import { listItems } from "@/lib/items";

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
