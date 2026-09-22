import { NextRequest } from "next/server";
import { getSession } from "@/lib/workspace";
import { APP_URL } from "@/lib/auth";
import { isAdmin, addAdmin, removeAdmin, listAdmins } from "@/lib/activity";
import { sendMail, adminAccessMail, localeForEmail } from "@/lib/mail";
import { getErrors } from "@/lib/i18n";


// Quién puede ver el panel de actividad. Solo puede tocarlo quien ya tiene acceso.
async function guard() {
  const s = await getSession();
  if (!s) return Response.json({ error: (await getErrors()).notSignedIn }, { status: 401 });
  if (!(await isAdmin(s.user.email))) return Response.json({ error: (await getErrors()).noPanelAccess }, { status: 403 });
  return s;
}

// GET → AdminEntry[]
export async function GET() {
  const s = await guard();
  if (s instanceof Response) return s;
  return Response.json(await listAdmins());
}

// POST { email } → { email, added, mailed } y avisa por correo al nuevo
export async function POST(req: NextRequest) {
  const s = await guard();
  if (s instanceof Response) return s;
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (typeof email !== "string" || !email.trim()) return Response.json({ error: (await getErrors()).missingEmail }, { status: 400 });
  try {
    const r = await addAdmin(email, s.user.name || s.user.email);
    let mailed = false;
    if (r.added) {
      const base = APP_URL || new URL(req.url).origin;
      // El correo va en el idioma de quien recibe el acceso, no en el de quien lo da
      const m = adminAccessMail(`${base}/admin`, s.user.name || s.user.email, await localeForEmail(r.email));
      try { await sendMail(r.email, m.subject, m.html, m.text); mailed = true; }
      catch (e) { console.warn("accesos: no se pudo avisar por correo", e instanceof Error ? e.message : e); }
    }
    return Response.json({ ...r, mailed }, { status: r.added ? 201 : 200 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

// DELETE ?email=… → { ok: true }. No puedes quitarte a ti mismo ni a los fijos.
export async function DELETE(req: NextRequest) {
  const s = await guard();
  if (s instanceof Response) return s;
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) return Response.json({ error: (await getErrors()).missingEmail }, { status: 400 });
  if (email === s.user.email.toLowerCase()) return Response.json({ error: (await getErrors()).cannotRemoveSelf }, { status: 400 });
  try {
    await removeAdmin(email);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
