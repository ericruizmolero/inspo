"use client";

import { useEffect, useState } from "react";
import { applyThemePref, readThemePref, resolveTheme, setTheme, type ThemePref } from "@/lib/theme";
import { SegmentedControl } from "@/components/criterio";
import { useT } from "./I18nProvider";

const OPTS: ThemePref[] = ["system", "light", "dark"];

/** System / Light / Dark as the system's SegmentedControl (paper tone, a radio group). Applies the theme
 *  instantly and remembers it in this browser. */
export default function ThemeSwitch() {
  const { t } = useT();
  // Starts on "system" so server and client render the same; the real preference is read on mount.
  const [pref, setPref] = useState<ThemePref>("system");
  useEffect(() => { setPref(readThemePref()); }, []);

  // If it follows the system and the system changes, it updates live
  useEffect(() => {
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onChange = () => { setTheme(resolveTheme("system")); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const choose = (v: ThemePref) => { setPref(v); applyThemePref(v); };

  return (
    <SegmentedControl
      tone="paper"
      choice
      className="theme-seg"
      label={t.settings.theme}
      active={OPTS.indexOf(pref)}
      onChange={(i) => choose(OPTS[i])}
      items={OPTS.map((o) => ({ label: <span>{t.theme[o]}</span>, title: t.theme[o] }))}
    />
  );
}
