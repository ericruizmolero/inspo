import { NextRequest, NextResponse } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { loadPage } from "@/lib/library";
import { HttpError } from "@/lib/workspace-core";

// GET ?ws=&cursor= → the next page of a workspace's library (lib/library.ts loadPage), for a member of it. The board
// asks for the pages after the first one by one as soon as it is open, until the cursor comes back null.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const ws = ctx.workspaces.find((w) => w.id === req.nextUrl.searchParams.get("ws"));
  if (!ws) return new NextResponse("not a member", { status: 403 });
  const cursor = req.nextUrl.searchParams.get("cursor");
  if (!cursor) return Response.json({ error: "cursor missing" }, { status: 400 });
  try {
    return NextResponse.json(await loadPage(ws.id, cursor), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
