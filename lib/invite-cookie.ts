// The invite code between /login?invite=<code> (proxy.ts sets it) and the account's creation (lib/auth.ts reads it).
// A cookie and not the URL, so it survives the magic link opened in another tab and the round trip through Google.
export const INVITE_COOKIE = "criterio_invite";
export const INVITE_COOKIE_MAX_AGE = 30 * 60;

export function inviteFromCookieHeader(cookie: string | null | undefined): string | null {
  const m = cookie ? new RegExp(`(?:^|; )${INVITE_COOKIE}=([^;]+)`).exec(cookie) : null;
  return m ? decodeURIComponent(m[1]) : null;
}
