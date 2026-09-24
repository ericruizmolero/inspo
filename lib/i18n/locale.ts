// The app language. English by default (international), Spanish second.
// The language lives in the `lang` cookie, written by proxy.ts on every page request.
// No /en or /es prefix in the URL: the app sits behind login and has no SEO.
// To share a link that forces a language, use `?lang=en`.
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LANG_COOKIE = "lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);
export const toLocale = (v: unknown): Locale => (isLocale(v) ? v : DEFAULT_LOCALE);

/** Intl format for each language. International English: en-GB, "3 Oct" rather than "Oct 3". */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", es: "es-ES" };

/**
 * First language we recognize from the Accept-Language header.
 * Two languages: no quality negotiation needed, the first one to appear wins.
 */
export function localeFromHeader(header: string | null | undefined): Locale | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    if (!tag || tag === "*") continue;
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}

/** The `lang` cookie inside a raw Cookie header, if it holds a language we have. */
export function localeFromCookieHeader(cookie: string | null | undefined): Locale | null {
  if (!cookie) return null;
  const m = new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]+)`).exec(cookie);
  return isLocale(m?.[1]) ? m[1] : null;
}

/**
 * The language a brand-new account starts with: the one the person was already
 * using on /login. Without it the row would get the column default ("en") and,
 * as the account's language beats the cookie once signed in, someone who signed
 * up in Spanish would land inside the app in English.
 *
 * Cookie first (same browser as /login). Then Accept-Language: the magic link
 * may open in another browser (the mail app's), and Apple returns by a cross-site
 * POST that does not carry the cookie. Then English.
 */
export function localeForNewUser(headers: Headers | null | undefined): Locale {
  return localeFromCookieHeader(headers?.get("cookie")) ?? localeFromHeader(headers?.get("accept-language")) ?? DEFAULT_LOCALE;
}
