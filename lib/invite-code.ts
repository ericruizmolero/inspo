// The invite code between /login?invite=<code> and the account's creation (lib/auth.ts reads it), by two roads.
// The magic link carries it on its own URL, so the account finds it in whatever browser and however late the link
// is opened. Google, Apple and X come back without it: for them the code waits in a cookie that proxy.ts sets.
export const INVITE_COOKIE = "criterio_invite";
export const INVITE_COOKIE_MAX_AGE = 30 * 60;
/** The query parameter, on /login and on the magic link alike */
export const INVITE_PARAM = "invite";

/** A code as someone hands it in: trimmed and bounded, or null */
export function cleanInvite(raw: unknown): string | null {
  return (typeof raw === "string" && raw.trim().slice(0, 100)) || null;
}

export function inviteFromCookieHeader(cookie: string | null | undefined): string | null {
  const m = cookie ? new RegExp(`(?:^|; )${INVITE_COOKIE}=([^;]+)`).exec(cookie) : null;
  return m ? cleanInvite(decodeURIComponent(m[1])) : null;
}

/** The code a request to Better Auth carries: on its URL (the magic link) first, else in the cookie */
export function inviteOf(url: string | null | undefined, cookie: string | null | undefined): string | null {
  let onUrl: string | null = null;
  try { onUrl = url ? cleanInvite(new URL(url).searchParams.get(INVITE_PARAM)) : null; } catch { /* not a URL */ }
  return onUrl ?? inviteFromCookieHeader(cookie);
}

/** The magic link with the code on it. Without a code, the link as it was */
export function withInvite(link: string, code: string | null): string {
  if (!code) return link;
  const u = new URL(link);
  u.searchParams.set(INVITE_PARAM, code);
  return u.toString();
}
