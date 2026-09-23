"use client";
// The interface language on the client.
//
// The server only sends the locale, not the dictionary: keys with variables
// are functions (t.team.calls(3)) and a function can't cross the
// server/client boundary. So both dictionaries are imported here and one is picked.
// It costs a few KB of bundle, and in return interpolation is a plain call.
//
// `t` is the object itself, so access is by dot (t.team.title) and TypeScript
// flags a missing key.
import { createContext, useContext, useMemo } from "react";
import type { Dict } from "@/lib/i18n/en";
import type { Locale } from "@/lib/i18n/locale";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import en from "@/lib/i18n/en";
import es from "@/lib/i18n/es";

const DICTS: Record<Locale, Dict> = { en, es };

const I18nContext = createContext<{ locale: Locale; t: Dict }>({ locale: DEFAULT_LOCALE, t: en });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: DICTS[locale] }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useT = () => useContext(I18nContext);

/**
 * Message for an error thrown outside React (lib/image-client), which arrives as a code.
 * If the code is unknown, it is shown as is: it comes already translated from the server.
 */
export function messageOf(err: unknown, t: Dict, fallback: string): string {
  const raw = err instanceof Error ? err.message : "";
  if (!raw) return fallback;
  return t.errors[raw as keyof Dict["errors"]] ?? raw;
}
