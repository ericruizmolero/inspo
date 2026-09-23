import { NextRequest } from "next/server";
import { getSession } from "@/lib/workspace";
import { handleFeedbackEvent, type FeedbackEvent } from "@/lib/feedback";
import { getErrors } from "@/lib/i18n";


const EVENTS = new Set(["annotation.add", "annotation.update", "annotation.delete", "submit"]);

// POST { event, annotation | annotations + output, url, viewport } → { ok: true, sent }
// Called by components/FeedbackTool.tsx: on adding, editing or deleting notes (they are only saved)
// and on pressing "Send to the team" ("submit"), which is the only thing that sends the email.
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return Response.json({ error: (await getErrors()).notSignedIn }, { status: 401 });
  let body: Partial<FeedbackEvent> = {};
  try { body = JSON.parse(await req.text()); } catch { return Response.json({ error: (await getErrors()).badBody }, { status: 400 }); }
  if (typeof body.event !== "string" || !EVENTS.has(body.event)) return Response.json({ error: (await getErrors()).unknownEvent }, { status: 400 });
  try {
    // Active workspace, to know which team the feedback comes from
    const organizationId = (s.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null;
    const r = await handleFeedbackEvent({ id: s.user.id, name: s.user.name, email: s.user.email }, organizationId, body as FeedbackEvent);
    return Response.json({ ok: true, ...r });
  } catch (e) {
    console.warn("feedback: could not record", e instanceof Error ? e.message : e);
    return Response.json({ error: e instanceof Error ? e.message : "Could not save the feedback" }, { status: 500 });
  }
}
