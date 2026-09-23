// Server-side language resolution.
//
// With a session, the language saved on the account wins: a Spanish account stays
// in Spanish when signing in from a new computer with an English browser.
//
// Without a session, the cookie wins, written by proxy.ts in this order: `?lang` if in
// the URL, else the first Accept-Language we support, else English.
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

/** The language of this request. */
export const getLocale = cache(async (): Promise<Locale> => {
  const session = await getSession().catch(() => null);
  if (session) {
    // Read the language from the row, not the session object: Better Auth caches the session
    // in a cookie for 5 minutes (lib/auth.ts), so the language inside it
    // can be the one from before a change. It is a primary key lookup.
    const [row] = await db.select({ language: schema.user.language }).from(schema.user).where(eq(schema.user.id, session.user.id)).limit(1);
    if (isLocale(row?.language)) return row.language;
  }
  // Without a session the cookie wins, written by proxy.ts from `?lang` or Accept-Language
  // Outside a request (scripts in scripts/) there are no cookies: default language
  try {
    return toLocale((await cookies()).get(LANG_COOKIE)?.value);
  } catch {
    return DEFAULT_LOCALE;
  }
});

export const dictOf = (locale: Locale): Dict => DICTS[locale];

/** Language + dictionary of this request, for pages and route handlers. */
export async function getT(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: DICTS[locale] };
}

/** Language of a user other than the requester: who receives the email. */
export function localeOfUser(language: unknown): Locale {
  return toLocale(language);
}

/** Server errors in the language of this request. */
export async function getErrors() {
  return (await getT()).t.errors;
}
