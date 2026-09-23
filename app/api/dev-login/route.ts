// Auto-login in development only: creates a real session for DEV_LOGIN_EMAIL without going through email.
// 1) Asks Better Auth for a magic link (lib/auth.ts intercepts it instead of sending it).
// 2) Verifies the token on the server and forwards the session cookies to the browser.
// All with relative paths: behind the preview proxy the server does not know the public origin.
import { NextResponse, type NextRequest } from "next/server";
import { auth, DEV_LOGIN_EMAIL, takeDevLink } from "@/lib/auth";
import { getErrors } from "@/lib/i18n";


export async function GET(request: NextRequest) {
  if (!DEV_LOGIN_EMAIL) return NextResponse.json({ error: (await getErrors()).unavailable }, { status: 404 });

  const next = request.nextUrl.searchParams.get("next");
  const callbackURL = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  // Goes through the HTTP handler (not auth.api) so Better Auth infers the baseURL from the request
  const origin = new URL(request.url).origin;
  takeDevLink(); // discards any old link
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

  // Without callbackURL the endpoint returns JSON (instead of redirecting) and still sets the session cookies
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
