import { NextRequest, NextResponse } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { loadLibrary, libraryStamp } from "@/lib/library";

// The open board asks whether its workspace changed somewhere else (the extension, another tab, a teammate).
// Same stamp: a few bytes back. Another stamp: the whole library, and the board takes it in without a reload.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const ws = ctx.workspaces.find((w) => w.id === req.nextUrl.searchParams.get("ws"));
  if (!ws) return new NextResponse("not a member", { status: 403 });
  const headers = { "Cache-Control": "private, no-store" };
  const stamp = await libraryStamp(ws.id);
  if (stamp === req.nextUrl.searchParams.get("stamp")) return NextResponse.json({ stamp }, { headers });
  return NextResponse.json(await loadLibrary(ctx.user, ws), { headers });
}
