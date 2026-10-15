// A hint for the marketing site, not a credential: "this browser has a session in the app". proxy.ts keeps it in step
// with the session cookie on every page, for the whole parent domain, so criterio.design (marketing-site/worker)
// can send someone already signed in straight into the app instead of the landing page (meeting 13/10).
// It says nothing about who: the app never trusts it, it always checks the real session.
import { MARKETING_URL } from "@/lib/site";

export const SIGNED_IN_COOKIE = "criterio_signed_in";
export const SIGNED_IN_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/** The domain to share the hint on, or null when this host is not under the marketing site's (localhost, previews) */
export function signedInCookieDomain(host: string): string | null {
  const parent = new URL(MARKETING_URL).hostname;
  return host.endsWith(`.${parent}`) ? parent : null;
}
