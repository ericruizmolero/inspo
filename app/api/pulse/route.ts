import { NextRequest, NextResponse } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { pulse } from "@/lib/pulse";
import { touchSegment } from "@/lib/activity";
import { getErrors } from "@/lib/i18n";
import { log } from "@/lib/log";

// POST { ws, stamp, since, bell, beat } → lib/pulse.ts Pulse
// The open board's one request, every 15 s while it is seen and once on coming back: what changed in the workspace
// since its last answer, whether the bell has news, and the presence heartbeat (components/useActivity.ts) it carries.
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  let body: { ws?: unknown; stamp?: unknown; since?: unknown; bell?: unknown; beat?: { segmentId?: unknown; visitId?: unknown; area?: unknown; path?: unknown } };
  try { body = await req.json(); } catch { return Response.json({ error: (await getErrors()).badBody }, { status: 400 }); }
  const ws = ctx.workspaces.find((w) => w.id === body.ws);
  if (!ws) return new NextResponse("not a member", { status: 403 });
  const b = body.beat;
  const beat = b && typeof b.segmentId === "string" && typeof b.visitId === "string"
    ? touchSegment(ctx.user.id, { segmentId: b.segmentId, visitId: b.visitId, area: String(b.area ?? ""), path: String(b.path ?? "/"), organizationId: ws.id }, req.headers.get("user-agent"))
      // Losing a heartbeat must not cost the board its changes
      .catch((err) => log.warn("activity.not_recorded", { err }))
    : null;
  const [out] = await Promise.all([pulse(ctx.user, ws, body), beat]);
  return NextResponse.json(out, { headers: { "Cache-Control": "private, no-store" } });
}
