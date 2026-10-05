"use client";
// The interface language on the client.
//
// The server only sends the locale, not the dictionary: keys with variables
// are functions (t.team.calls(3)) and a function can't cross the
// server/client boundary. So the provider loads the dictionary of this
// language itself, as its own chunk, and reads it with use(): a page only
// downloads its own language (about 20 KB gz each). The server renders the
// text, so the page paints at once; on a cold visit hydration waits for that
// one chunk, which starts loading as soon as this module runs (see below).
//
// `t` is the object itself, so access is by dot (t.team.title) and TypeScript
// flags a missing key.
import { createContext, startTransition, use, useContext, useEffect, useMemo, useState } from "react";
import type { Dict } from "@/lib/i18n/en";
import type { Locale } from "@/lib/i18n/locale";
import { isLocale } from "@/lib/i18n/locale";

const LOADERS: Record<Locale, () => Promise<{ default: Dict }>> = {
  en: () => import("@/lib/i18n/en"),
  es: () => import("@/lib/i18n/es"),
};
// One promise per language for the tab's life: use() needs the same one on every render. Once loaded it is marked
// the way React reads a settled promise (status, value), so use() returns at once instead of suspending again.
const loading = new Map<Locale, Promise<Dict>>();
function dictFor(locale: Locale): Promise<Dict> {
  let p = loading.get(locale);
  if (!p) {
    const job: Promise<Dict> = LOADERS[locale]().then((m) => { Object.assign(job, { status: "fulfilled", value: m.default }); return m.default; });
    loading.set(locale, (p = job));
  }
  return p;
}
// The root layout writes the language into <html lang>: asked for here, the chunk loads alongside the app's own,
// instead of after them once the provider first renders
if (typeof document !== "undefined" && isLocale(document.documentElement.lang)) void dictFor(document.documentElement.lang);

const I18nContext = createContext<{ locale: Locale; t: Dict } | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  // The language on screen. A switch keeps it until the new dictionary is here: suspending the root layout in the
  // middle of the router's update threw the page off its route
  const [shown, setShown] = useState(locale);
  const t = use(dictFor(shown));
  useEffect(() => {
    if (locale === shown) return;
    let live = true;
    dictFor(locale).then(() => { if (live) startTransition(() => setShown(locale)); });
    return () => { live = false; };
  }, [locale, shown]);
  const value = useMemo(() => ({ locale: shown, t }), [shown, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useT outside I18nProvider");
  return value;
}

/**
 * Message for an error thrown outside React (lib/image-client), which arrives as a code.
 * If the code is unknown, it is shown as is: it comes already translated from the server.
 */
export function messageOf(err: unknown, t: Dict, fallback: string): string {
  const raw = err instanceof Error ? err.message : "";
  if (!raw) return fallback;
  return t.errors[raw as keyof Dict["errors"]] ?? raw;
}
