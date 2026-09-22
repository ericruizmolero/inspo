"use client";
// El idioma de la interfaz en el cliente.
//
// El servidor solo manda el idioma, no el diccionario: las claves que llevan
// variables son funciones (t.team.calls(3)) y una función no cruza la frontera
// servidor/cliente. Así que los dos diccionarios se importan aquí y se elige uno.
// Cuesta unos KB de bundle y a cambio la interpolación es una llamada normal.
//
// `t` es el propio objeto, así que se accede con punto (t.team.title) y TypeScript
// avisa de la clave que falta.
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
 * Mensaje de un error lanzado fuera de React (lib/image-client), que llega como código.
 * Si no es un código conocido, se enseña tal cual: ya viene traducido del servidor.
 */
export function messageOf(err: unknown, t: Dict, fallback: string): string {
  const raw = err instanceof Error ? err.message : "";
  if (!raw) return fallback;
  return t.errors[raw as keyof Dict["errors"]] ?? raw;
}
