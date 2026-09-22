"use client";
// Segmentado English / Castellano, hermano de ThemeSwitch. Guarda la elección
// (cookie, y en la cuenta si hay sesión) y repinta el servidor con el idioma nuevo.
import { setLanguage } from "@/app/actions/library";
import { useTransition } from "react";
import { LOCALES, type Locale } from "@/lib/i18n/locale";
import { useT } from "./I18nProvider";

// Cada idioma se llama a sí mismo. "Español" y no "Castellano": el control es
// estrecho y "Castellano" se corta.
const LABEL: Record<Locale, string> = { en: "English", es: "Español" };

export default function LangSwitch() {
  const { locale, t } = useT();
  const [pending, start] = useTransition();

  const choose = (v: Locale) => {
    if (v === locale) return;
    start(async () => {
      // La acción escribe la cookie y Next vuelve a pintar la página con el idioma nuevo
      await setLanguage(v);
    });
  };

  return (
    <span className="theme-seg" role="radiogroup" aria-label={t.settings.language} aria-busy={pending}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          className={`theme-seg__opt${locale === l ? " is-active" : ""}`}
          onClick={() => choose(l)}
          title={LABEL[l]}
        >
          <span>{LABEL[l]}</span>
        </button>
      ))}
    </span>
  );
}
