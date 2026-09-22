// Auto-login solo en desarrollo: crea una sesión real para DEV_LOGIN_EMAIL sin pasar por el correo.
// 1) Pide a Better Auth un magic link (lib/auth.ts lo intercepta en vez de enviarlo).
// 2) Verifica el token en el servidor y reenvía las cookies de sesión al navegador.
// Todo con rutas relativas: detrás del proxy del preview el servidor no conoce el origen público.
import { NextResponse, type NextRequest } from "next/server";
import { auth, DEV_LOGIN_EMAIL, takeDevLink } from "@/lib/auth";
import { getErrors } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!DEV_LOGIN_EMAIL) return NextResponse.json({ error: (await getErrors()).unavailable }, { status: 404 });

  const next = request.nextUrl.searchParams.get("next");
  const callbackURL = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  // Se pasa por el handler HTTP (no por auth.api) para que Better Auth deduzca el baseURL de la petición
  const origin = new URL(request.url).origin;
  takeDevLink(); // descarta cualquier enlace viejo
  const signIn = await auth.handler(new Request(new URL("/api/auth/sign-in/magic-link", origin), {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email: DEV_LOGIN_EMAIL }),
  }));
  const link = takeDevLink();
  if (!signIn.ok || !link) {
    console.error("[dev-login] sign-in", signIn.status, await signIn.text());
    return NextResponse.json({ error: (await getErrors()).linkFailed }, { status: 500 });
  }

  // Sin callbackURL el endpoint devuelve JSON (en vez de redirigir) y aun así fija las cookies de sesión
  const verifyURL = new URL(link);
  verifyURL.searchParams.delete("callbackURL");
  const verify = await auth.handler(new Request(verifyURL, { headers: { origin } }));
  const cookies = verify.headers.getSetCookie();
  if (!verify.ok || cookies.length === 0) {
    console.error("[dev-login] verify", verify.status, await verify.text());
    return NextResponse.json({ error: (await getErrors()).sessionFailed }, { status: 500 });
  }

  const res = new NextResponse(null, { status: 302, headers: { Location: callbackURL } });
  for (const c of cookies) res.headers.append("set-cookie", c);
  return res;
}
