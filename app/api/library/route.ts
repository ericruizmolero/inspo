import { NextRequest, NextResponse } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { loadLibrary } from "@/lib/library";

// One workspace's library, for a member of it: the client loads the other workspaces ahead of time,
// so switching shows them at once instead of waiting for a whole page refresh.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const ws = ctx.workspaces.find((w) => w.id === req.nextUrl.searchParams.get("ws"));
  if (!ws) return new NextResponse("not a member", { status: 403 });
  return NextResponse.json(await loadLibrary(ctx.user, ws), { headers: { "Cache-Control": "private, no-store" } });
}
