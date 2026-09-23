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
