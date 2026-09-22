// Resolución del idioma en el servidor.
//
// Con sesión manda el idioma guardado en la cuenta: así una cuenta en castellano sigue
// en castellano al entrar desde un ordenador nuevo con el navegador en inglés.
//
// Sin sesión manda la cookie, que escribe proxy.ts con este orden: `?lang` si viene en
// la URL, si no el primer idioma de Accept-Language que tengamos, si no inglés.
import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { getSession } from "../session";
import { db, schema } from "../db";
import { LANG_COOKIE, DEFAULT_LOCALE, toLocale, isLocale, type Locale } from "./locale";
import en, { type Dict } from "./en";
import es from "./es";

export * from "./locale";
export * from "./format";
export type { Dict };

const DICTS: Record<Locale, Dict> = { en, es };

/** El idioma de esta petición. */
export const getLocale = cache(async (): Promise<Locale> => {
  const session = await getSession().catch(() => null);
  if (session) {
    // El idioma se lee de la fila, no del objeto de sesión: Better Auth cachea la sesión
    // en una cookie durante 5 minutos (lib/auth.ts), así que el idioma que trae dentro
    // puede ser el de antes de cambiarlo. Es una consulta por clave primaria.
    const [row] = await db.select({ language: schema.user.language }).from(schema.user).where(eq(schema.user.id, session.user.id)).limit(1);
    if (isLocale(row?.language)) return row.language;
  }
  // Sin sesión manda la cookie, que escribe proxy.ts desde `?lang` o Accept-Language
  // Fuera de una petición (scripts de scripts/) no hay cookies: idioma por defecto
  try {
    return toLocale((await cookies()).get(LANG_COOKIE)?.value);
  } catch {
    return DEFAULT_LOCALE;
  }
});

export const dictOf = (locale: Locale): Dict => DICTS[locale];

/** Idioma + diccionario de esta petición, para páginas y route handlers. */
export async function getT(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: DICTS[locale] };
}

/** Idioma de un usuario que no es quien hace la petición: a quién le llega el correo. */
export function localeOfUser(language: unknown): Locale {
  return toLocale(language);
}

/** Los errores del servidor en el idioma de esta petición. */
export async function getErrors() {
  return (await getT()).t.errors;
}
