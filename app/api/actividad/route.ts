import { NextRequest } from "next/server";
import { getSession } from "@/lib/workspace";
import { touchSegment, type Heartbeat } from "@/lib/activity";
import { getErrors } from "@/lib/i18n";

export const runtime = "nodejs";

// POST { segmentId, visitId, area, path, organizationId? } → { ok: true }
// Latido de presencia del cliente (components/useActivity.ts). Llega cada 20 s con la
// pestaña visible y al cambiar de zona o cerrar; también por sendBeacon, de ahí que
// se acepte texto plano además de JSON.
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return Response.json({ error: (await getErrors()).notSignedIn }, { status: 401 });
  let body: Partial<Heartbeat> = {};
  try { body = JSON.parse(await req.text()); } catch { return Response.json({ error: (await getErrors()).badBody }, { status: 400 }); }
  if (typeof body.segmentId !== "string" || typeof body.visitId !== "string") return Response.json({ error: (await getErrors()).missingData }, { status: 400 });
  try {
    const r = await touchSegment(s.user.id, {
      segmentId: body.segmentId, visitId: body.visitId,
      area: typeof body.area === "string" ? body.area : "biblioteca",
      path: typeof body.path === "string" ? body.path : "/",
      organizationId: typeof body.organizationId === "string" ? body.organizationId : null,
    }, req.headers.get("user-agent"));
    if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
    return Response.json({ ok: true });
  } catch (e) {
    // Perder un latido no debe hacer ruido en el cliente
    console.warn("actividad: no se pudo registrar", e instanceof Error ? e.message : e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
