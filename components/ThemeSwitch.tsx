"use client";

import { useEffect, useState } from "react";
import { applyThemePref, readThemePref, resolveTheme, type ThemePref } from "@/lib/theme";
import { useT } from "./I18nProvider";

const OPTS: ThemePref[] = ["system", "light", "dark"];

/** System / Light / Dark segmented control. Applies the theme instantly and remembers it in this browser. */
export default function ThemeSwitch() {
  const { t } = useT();
  // Starts on "system" so server and client render the same; the real preference is read on mount.
  const [pref, setPref] = useState<ThemePref>("system");
  useEffect(() => { setPref(readThemePref()); }, []);

  // If it follows the system and the system changes, it updates live
  useEffect(() => {
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onChange = () => { document.documentElement.dataset.theme = resolveTheme("system"); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const choose = (v: ThemePref) => { setPref(v); applyThemePref(v); };

  return (
    <span className="theme-seg" role="radiogroup" aria-label={t.settings.theme}>
      {OPTS.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={pref === o}
          className={`theme-seg__opt${pref === o ? " is-active" : ""}`}
          onClick={() => choose(o)}
          title={t.theme[o]}
        >
          <span>{t.theme[o]}</span>
        </button>
      ))}
    </span>
  );
}
