"use client";
// Language select, next to ThemeSwitch. Saves the choice
// (cookie, and on the account if signed in) and re-renders the server with the new locale.
import { setLanguage } from "@/app/actions/library";
import { useTransition } from "react";
import { LOCALES, type Locale } from "@/lib/i18n/locale";
import { useT } from "./I18nProvider";

// Each language uses its own name
const LABEL: Record<Locale, string> = { en: "English", es: "Español" };

export default function LangSwitch() {
  const { locale, t } = useT();
  const [pending, start] = useTransition();

  const choose = (v: Locale) => {
    if (v === locale) return;
    start(async () => {
      // The action writes the cookie and Next re-renders the page in the new locale
      await setLanguage(v);
    });
  };

  return (
    <span className="select">
      <select
        aria-label={t.settings.language}
        aria-busy={pending}
        disabled={pending}
        value={locale}
        onChange={(e) => choose(e.target.value as Locale)}
      >
        {LOCALES.map((l) => <option key={l} value={l}>{LABEL[l]}</option>)}
      </select>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 4.5l3 3 3-3" />
      </svg>
    </span>
  );
}
