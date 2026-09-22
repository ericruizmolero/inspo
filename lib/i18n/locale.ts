// El idioma de la app. Inglés por defecto (internacional), castellano como segundo.
// El idioma vive en la cookie `lang`, que escribe proxy.ts en cada petición de página.
// No hay prefijo /en ni /es en la URL: la app está detrás del login y no tiene SEO.
// Para compartir un enlace forzando idioma vale `?lang=en`.
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LANG_COOKIE = "lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);
export const toLocale = (v: unknown): Locale => (isLocale(v) ? v : DEFAULT_LOCALE);

/** Formato de Intl para cada idioma. Inglés internacional: en-GB, "3 Oct" y no "Oct 3". */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", es: "es-ES" };

/**
 * Primer idioma que reconocemos de la cabecera Accept-Language.
 * Dos idiomas: no hace falta negociación por calidad, gana el primero que aparece.
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
