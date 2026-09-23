"use client";
// English / Spanish segmented control, sibling of ThemeSwitch. Saves the choice
// (cookie, and on the account if signed in) and re-renders the server with the new locale.
import { setLanguage } from "@/app/actions/library";
import { useTransition } from "react";
import { LOCALES, type Locale } from "@/lib/i18n/locale";
import { useT } from "./I18nProvider";

// Each language uses its own name. "Español" over "Castellano": the control is
// narrow and "Castellano" gets cut off.
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
