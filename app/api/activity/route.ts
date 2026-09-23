import { NextRequest } from "next/server";
import { getSession } from "@/lib/workspace";
import { touchSegment, type Heartbeat } from "@/lib/activity";
import { getErrors } from "@/lib/i18n";


// POST { segmentId, visitId, area, path, organizationId? } → { ok: true }
// Client presence heartbeat (components/useActivity.ts). Arrives every 20 s with the
// tab visible and on area change or close; also via sendBeacon, which is why
// plain text is accepted as well as JSON.
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return Response.json({ error: (await getErrors()).notSignedIn }, { status: 401 });
  let body: Partial<Heartbeat> = {};
  try { body = JSON.parse(await req.text()); } catch { return Response.json({ error: (await getErrors()).badBody }, { status: 400 }); }
  if (typeof body.segmentId !== "string" || typeof body.visitId !== "string") return Response.json({ error: (await getErrors()).missingData }, { status: 400 });
  try {
    const r = await touchSegment(s.user.id, {
      segmentId: body.segmentId, visitId: body.visitId,
      area: typeof body.area === "string" ? body.area : "library",
      path: typeof body.path === "string" ? body.path : "/",
      organizationId: typeof body.organizationId === "string" ? body.organizationId : null,
    }, req.headers.get("user-agent"));
    if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
    return Response.json({ ok: true });
  } catch (e) {
    // Losing a heartbeat must not make noise on the client
    console.warn("activity: could not record", e instanceof Error ? e.message : e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
