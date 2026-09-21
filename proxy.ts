// Comprobación optimista: sin cookie de sesión no se entra en la app.
// La autorización real (workspace, rol) se hace en cada página y route handler.
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// La portada (/) también es pública: sin sesión enseña el lienzo de inicio (app/page.tsx)
// y la primera acción abre la ventana de acceso. Todo lo demás pide sesión.
const PUBLIC = [/^\/$/, /^\/login(\/|$)/, /^\/api\/auth(\/|$)/, /^\/api\/dev-login(\/|$)/, /^\/api\/og(\/|$)/, /^\/invitacion\//];

// Auto-login en desarrollo (ver lib/auth.ts): sin cookie, en vez de /login se pasa por /api/dev-login
const DEV_AUTO_LOGIN = process.env.NODE_ENV !== "production" && !!process.env.DEV_LOGIN_EMAIL;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  if (getSessionCookie(request)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No has iniciado sesión" }, { status: 401 });
  }
  const login = new URL(DEV_AUTO_LOGIN ? "/api/dev-login" : "/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon0.svg|icon1.png|apple-icon.png|icon-512.png|thumbs/|design-md/|shots/|fonts/).*)"],
};
