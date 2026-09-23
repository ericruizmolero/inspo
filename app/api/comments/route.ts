import { requireCtx, isResponse } from "@/lib/workspace";
import { listComments } from "@/lib/comments";


// GET → { [itemId]: InspoComment[] } for the whole workspace. The client rereads it every 20 s with a thread
// open; the initial load comes with the page and changes go through app/actions/library.ts.
export async function GET() {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    return Response.json(await listComments(ctx.workspace.id));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

