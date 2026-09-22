import { NextRequest } from "next/server";
import { getSession } from "@/lib/workspace";
import { handleFeedbackEvent, type FeedbackEvent } from "@/lib/feedback";
import { getErrors } from "@/lib/i18n";


const EVENTS = new Set(["annotation.add", "annotation.update", "annotation.delete", "submit"]);

// POST { event, annotation | annotations + output, url, viewport } → { ok: true, sent }
// Lo llama components/FeedbackTool.tsx: al añadir, editar o borrar notas (solo se guardan)
// y al pulsar "Enviar al equipo" ("submit"), que es lo único que manda el correo.
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return Response.json({ error: (await getErrors()).notSignedIn }, { status: 401 });
  let body: Partial<FeedbackEvent> = {};
  try { body = JSON.parse(await req.text()); } catch { return Response.json({ error: (await getErrors()).badBody }, { status: 400 }); }
  if (typeof body.event !== "string" || !EVENTS.has(body.event)) return Response.json({ error: (await getErrors()).unknownEvent }, { status: 400 });
  try {
    // Workspace activo, para saber desde qué equipo llega el feedback
    const organizationId = (s.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null;
    const r = await handleFeedbackEvent({ id: s.user.id, name: s.user.name, email: s.user.email }, organizationId, body as FeedbackEvent);
    return Response.json({ ok: true, ...r });
  } catch (e) {
    console.warn("feedback: no se pudo registrar", e instanceof Error ? e.message : e);
    return Response.json({ error: e instanceof Error ? e.message : "No se pudo guardar el feedback" }, { status: 500 });
  }
}
