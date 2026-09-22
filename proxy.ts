// Dos cosas en cada petición: fijar el idioma y la comprobación optimista de sesión.
// Sin cookie de sesión no se entra en la app; la autorización real (workspace, rol)
// se hace en cada página y route handler.
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, DEFAULT_LOCALE, isLocale, localeFromHeader } from "@/lib/i18n/locale";

// La portada (/) también es pública: sin sesión enseña el lienzo de inicio (app/page.tsx)
// y la primera acción abre la ventana de acceso. Todo lo demás pide sesión.
// /api/ext/: la extensión del navegador entra con su llave (lib/ext-keys.ts), no con cookie
const PUBLIC = [/^\/$/, /^\/login(\/|$)/, /^\/api\/auth(\/|$)/, /^\/api\/ext\//, /^\/api\/dev-login(\/|$)/, /^\/invitacion\//];

// Auto-login en desarrollo (ver lib/auth.ts): sin cookie, en vez de /login se pasa por /api/dev-login
const DEV_AUTO_LOGIN = process.env.NODE_ENV !== "production" && !!process.env.DEV_LOGIN_EMAIL;

/**
 * Idioma de esta petición, si hay que escribirlo en la cookie.
 * `?lang=en` manda y se guarda (así un enlace compartido llega en su idioma).
 * Sin cookie, se mira Accept-Language. Con cookie ya puesta, no se toca nada.
 */
function langToSet(request: NextRequest): string | null {
  const asked = request.nextUrl.searchParams.get("lang");
  if (isLocale(asked)) return asked;
  if (request.cookies.get(LANG_COOKIE)) return null;
  return localeFromHeader(request.headers.get("accept-language")) ?? DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Las llamadas a /api no eligen idioma: lo heredan de la cookie que ya trae el navegador
  const lang = pathname.startsWith("/api/") ? null : langToSet(request);

  // La cookie va en la respuesta pase lo que pase, también en el redirect al login
  const withLang = <T extends NextResponse>(res: T): T => {
    if (lang) res.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: LANG_COOKIE_MAX_AGE, sameSite: "lax" });
    return res;
  };

  if (PUBLIC.some((re) => re.test(pathname))) return withLang(NextResponse.next());

  if (getSessionCookie(request)) return withLang(NextResponse.next());

  if (pathname.startsWith("/api/")) {
    // Sin sesión no hay idioma de usuario: se responde con la cookie que traiga, o inglés
    const l = request.cookies.get(LANG_COOKIE)?.value;
    const message = l === "es" ? "No has iniciado sesión" : "You are not signed in";
    return NextResponse.json({ error: message }, { status: 401 });
  }
  const login = new URL(DEV_AUTO_LOGIN ? "/api/dev-login" : "/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + request.nextUrl.search);
  return withLang(NextResponse.redirect(login));
}

export const config = {
  // recursos/: miniaturas estáticas del directorio, que se ve también sin sesión desde la portada
  // opengraph-image y twitter-image: la tarjeta de compartir la piden WhatsApp y compañía sin sesión
  // showcase/: las imágenes fijas del lateral de /login, que se ve sin sesión
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon0.svg|icon1.png|apple-icon.png|icon-512.png|opengraph-image|twitter-image|thumbs/|design-md/|shots/|fonts/|recursos/|showcase/).*)"],
};
