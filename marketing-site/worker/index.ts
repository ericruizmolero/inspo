// www.criterio.design redirects to criterio.design, path and query kept. Someone already signed in to the app who opens
// the home page goes straight into the app (meeting 13/10). English is the default for everyone: / is never redirected
// to /es/ by country or browser language (Alberto, 10-11); Spanish is only for whoever opens /es/. Everything else is the static site.
const APP_URL = "https://app.criterio.design";
// The app keeps this cookie on .criterio.design while the browser has a session (lib/signed-in-cookie.ts in the app)
const SIGNED_IN = /(?:^|;\s*)criterio_signed_in=1(?:;|$)/;
const HOMES = new Set(["/", "/es", "/es/"]);

export default {
  async fetch(request: Request, env: { ASSETS: { fetch(request: Request): Promise<Response> } }): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }
    // ?landing shows the landing page anyway
    if (HOMES.has(url.pathname) && !url.searchParams.has("landing") && SIGNED_IN.test(request.headers.get("cookie") ?? "")) {
      return Response.redirect(`${APP_URL}/`, 302);
    }
    return env.ASSETS.fetch(request);
  },
};
