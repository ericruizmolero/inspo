"use client";
// Language, next to ThemeSwitch: the system's SegmentedControl in its paper tone, a radio group of the two
// languages. Saves the choice (cookie, and on the account if signed in) and re-renders the server with the new locale.
import { setLanguage } from "@/app/actions/library";
import { useTransition } from "react";
import { LOCALES, type Locale } from "@/lib/i18n/locale";
import { SegmentedControl } from "@/components/criterio";
import { useT } from "./I18nProvider";

// Each language uses its own name
const LABEL: Record<Locale, string> = { en: "English", es: "Español" };

export default function LangSwitch() {
  const { locale, t } = useT();
  const [pending, start] = useTransition();

  const choose = (v: Locale) => {
    if (v === locale || pending) return;
    start(async () => {
      // The action writes the cookie and Next re-renders the page in the new locale
      await setLanguage(v);
    });
  };

  return (
    <SegmentedControl
      tone="paper"
      choice
      className="theme-seg"
      label={t.settings.language}
      active={LOCALES.indexOf(locale)}
      onChange={(i) => choose(LOCALES[i])}
      items={LOCALES.map((l) => ({ label: <span lang={l}>{LABEL[l]}</span> }))}
    />
  );
}
