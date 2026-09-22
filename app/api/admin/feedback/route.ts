import { NextRequest } from "next/server";
import { getSession } from "@/lib/workspace";
import { isAdmin } from "@/lib/activity";
import { deleteFeedbackNotes } from "@/lib/feedback";
import { getErrors } from "@/lib/i18n";


// Borrar feedback desde el panel de actividad. Solo quien ve /admin.
// DELETE { ids: string[] } → { ok: true, deleted }. Los ids son los de feedback_note (un envío = varias notas).
export async function DELETE(req: NextRequest) {
  const s = await getSession();
  if (!s) return Response.json({ error: (await getErrors()).notSignedIn }, { status: 401 });
  if (!(await isAdmin(s.user.email))) return Response.json({ error: (await getErrors()).noPanelAccess }, { status: 403 });
  const { ids } = (await req.json().catch(() => ({}))) as { ids?: unknown };
  const list = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 500) : [];
  if (!list.length) return Response.json({ error: (await getErrors()).nothingToDelete }, { status: 400 });
  const deleted = await deleteFeedbackNotes(list);
  return Response.json({ ok: true, deleted });
}
