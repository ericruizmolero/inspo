import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/workspace";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, isLocale } from "@/lib/i18n/locale";

export const runtime = "nodejs";

// POST { lang } → cambia el idioma. La cookie es lo que lee cada página; con sesión
// se guarda además en la cuenta, que es lo que decide el idioma de sus correos.
export async function POST(req: Request) {
  const { lang } = (await req.json().catch(() => ({}))) as { lang?: unknown };
  if (!isLocale(lang)) return Response.json({ error: "Unknown language" }, { status: 400 });

  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: LANG_COOKIE_MAX_AGE, sameSite: "lax" });

  const session = await getSession();
  if (session) {
    await db.update(schema.user).set({ language: lang, updatedAt: new Date() }).where(eq(schema.user.id, session.user.id));
  }
  return Response.json({ lang });
}
