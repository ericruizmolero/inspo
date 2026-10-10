// Two things on every request: set the locale and the optimistic session check.
// Without a session cookie there's no way into the app; real authorization (workspace, role)
// happens in each page and route handler.
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, DEFAULT_LOCALE, isLocale, localeFromHeader } from "@/lib/i18n/locale";
import { INVITE_COOKIE, INVITE_COOKIE_MAX_AGE } from "@/lib/invite-cookie";

// The home page (/) is public too: signed out it shows the start canvas (app/page.tsx)
// and the first action opens the sign-in dialog. Everything else needs a session.
// /extension/privacy: the extension's privacy page, linked from the Chrome Web Store
// /privacy and /terms: the legal pages, read before there is an account (lib/legal.ts)
// /api/ext/: the browser extension gets in with its key (lib/ext-keys.ts), not a cookie
// /api/cron/: the scheduler has no session; each route checks CRON_SECRET itself
// /api/access/mode: whether signup is invite-only, asked by the landing page and the extension
// /api/health: BetterStack's uptime checks, which say only ok and timings
// /unsubscribe and /api/unsubscribe: the one-click link at the foot of a team email; the signature is the proof (lib/notify.ts)
// /s/: a project's brand shared by link; the token in the path is the proof (lib/share.ts)
// /mcp, /api/mcp/ and /.well-known/: the MCP connector and its OAuth endpoints; an AI client gets in with a bearer
// token (lib/mcp/auth.ts), never a cookie. /mcp/authorize is not here: approving an app takes a session
const PUBLIC = [/^\/$/, /^\/api\/access\/mode$/, /^\/login(\/|$)/, /^\/api\/auth(\/|$)/, /^\/api\/ext\//, /^\/api\/cron\//, /^\/api\/health(\/|$)/, /^\/api\/dev-login(\/|$)/, /^\/invite\//, /^\/extension\/privacy(\/|$)/, /^\/(privacy|terms)(\/|$)/, /^\/unsubscribe(\/|$)/, /^\/api\/unsubscribe(\/|$)/, /^\/s\//, /^\/mcp$/, /^\/api\/mcp\//, /^\/\.well-known\//];

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

// Scripts run only when the server put them in the page: Next adds this request's nonce to its own, and
// 'strict-dynamic' lets those load the rest. An injected <script> or SVG has no nonce, so it never runs.
// Styles and images are left open. This header replaces the one next.config.ts sets, so it carries the same
// frame-ancestors: nobody frames a page, and the MCP consent not even we do.
// Development needs 'unsafe-eval' (React rebuilds server error stacks with eval).
function csp(nonce: string, pathname: string): string {
  const dev = process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : "";
  const frames = pathname === "/mcp/authorize" ? "'none'" : "'self'";
  return `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev}; object-src 'none'; base-uri 'self'; frame-ancestors ${frames}`;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Pages only: a route handler answers data or files, and those carry their own headers
  const page = !pathname.startsWith("/api/") && pathname !== "/mcp" && !pathname.startsWith("/.well-known/");
  const nonce = page ? btoa(crypto.randomUUID()) : null;
  const policy = nonce ? csp(nonce, pathname) : null;
  // Every log line and stored failure of this request carries its id (lib/log.ts). On Vercel it is Vercel's own,
  // so our lines and its request log match; the response sends it back for a report to quote
  const requestId = request.headers.get("x-vercel-id") ?? crypto.randomUUID();
  // Next reads the nonce from the request's CSP while rendering; the browser enforces the response's
  const next = () => {
    const headers = new Headers(request.headers);
    headers.set("x-request-id", requestId);
    headers.set("x-request-path", pathname);
    if (policy) {
      headers.set("x-nonce", nonce!);
      headers.set("Content-Security-Policy", policy);
    }
    const res = NextResponse.next({ request: { headers } });
    if (policy) res.headers.set("Content-Security-Policy", policy);
    res.headers.set("x-request-id", requestId);
    return res;
  };
  // /api calls don't pick a locale: they inherit it from the cookie the browser already sends.
  // Nor does an AI client talking to the MCP connector, which keeps no cookies
  const lang = pathname.startsWith("/api/") || pathname === "/mcp" || pathname.startsWith("/.well-known/") ? null : langToSet(request);

  // /login?invite=<code>: the code waits in a cookie for the account's creation (lib/invite-cookie.ts).
  // SameSite none in production: Apple returns by a cross-site POST, which a lax cookie would miss
  const invite = pathname === "/login" ? request.nextUrl.searchParams.get("invite")?.trim().slice(0, 100) : null;

  // The cookie goes on the response no matter what, including the redirect to login
  const withLang = <T extends NextResponse>(res: T): T => {
    if (lang) res.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: LANG_COOKIE_MAX_AGE, sameSite: "lax" });
    if (invite) {
      const prod = process.env.NODE_ENV === "production";
      res.cookies.set(INVITE_COOKIE, invite, { path: "/", maxAge: INVITE_COOKIE_MAX_AGE, httpOnly: true, secure: prod, sameSite: prod ? "none" : "lax" });
    }
    return res;
  };

  if (PUBLIC.some((re) => re.test(pathname))) return withLang(next());

  if (getSessionCookie(request)) return withLang(next());

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
  // logo.png: the header logo, on the signed-out home and /login too
  // polish/: the tracks of Polish's sound control, plain static files
  // icon.png: the page's <link rel="icon"> points at it; favicon services (Google's, which Claude uses for the
  // connector's logo) fetch it with no session
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|icon-512.png|logo.png|opengraph-image|twitter-image|directory/|showcase/|polish/).*)"],
};
