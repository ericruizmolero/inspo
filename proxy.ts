// Two things on every request: set the locale and the optimistic session check.
// Without a session cookie there's no way into the app; real authorization (workspace, role)
// happens in each page and route handler.
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, DEFAULT_LOCALE, isLocale, localeFromHeader } from "@/lib/i18n/locale";

// The home page (/) is public too: signed out it shows the start canvas (app/page.tsx)
// and the first action opens the sign-in dialog. Everything else needs a session.
// /extension/privacy: the extension's privacy page, linked from the Chrome Web Store
// /api/ext/: the browser extension gets in with its key (lib/ext-keys.ts), not a cookie
// /api/live/a/: the live view's frame has an opaque origin and sends no cookies; a signed token in the path is its proof (lib/live-html.ts)
const PUBLIC = [/^\/$/, /^\/login(\/|$)/, /^\/api\/auth(\/|$)/, /^\/api\/ext\//, /^\/api\/live\/a\//, /^\/api\/dev-login(\/|$)/, /^\/invite\//, /^\/extension\/privacy(\/|$)/];

// Auto-login in development (see lib/auth.ts): with no cookie, /api/dev-login is used instead of /login
const DEV_AUTO_LOGIN = process.env.NODE_ENV !== "production" && !!process.env.DEV_LOGIN_EMAIL;

/**
 * This request's locale, if it has to be written to the cookie.
 * `?lang=en` wins and is saved (so a shared link arrives in its language).
 * With no cookie, Accept-Language is used. With a cookie already set, nothing changes.
 */
function langToSet(request: NextRequest): string | null {
  const asked = request.nextUrl.searchParams.get("lang");
  if (isLocale(asked)) return asked;
  if (request.cookies.get(LANG_COOKIE)) return null;
  return localeFromHeader(request.headers.get("accept-language")) ?? DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // /api calls don't pick a locale: they inherit it from the cookie the browser already sends
  const lang = pathname.startsWith("/api/") ? null : langToSet(request);

  // The cookie goes on the response no matter what, including the redirect to login
  const withLang = <T extends NextResponse>(res: T): T => {
    if (lang) res.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: LANG_COOKIE_MAX_AGE, sameSite: "lax" });
    return res;
  };

  if (PUBLIC.some((re) => re.test(pathname))) return withLang(NextResponse.next());

  if (getSessionCookie(request)) return withLang(NextResponse.next());

  if (pathname.startsWith("/api/")) {
    // Signed out there's no user locale: answer with the cookie it brings, or English
    const l = request.cookies.get(LANG_COOKIE)?.value;
    const message = l === "es" ? "No has iniciado sesión" : "You are not signed in";
    return NextResponse.json({ error: message }, { status: 401 });
  }
  const login = new URL(DEV_AUTO_LOGIN ? "/api/dev-login" : "/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + request.nextUrl.search);
  return withLang(NextResponse.redirect(login));
}

export const config = {
  // directory/: static directory thumbnails, also shown signed out from the home page
  // opengraph-image and twitter-image: WhatsApp and friends request the share card without a session
  // showcase/: the fixed images beside /login, shown signed out
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon0.svg|icon1.png|apple-icon.png|icon-512.png|opengraph-image|twitter-image|thumbs/|design-md/|shots/|fonts/|directory/|showcase/).*)"],
};
