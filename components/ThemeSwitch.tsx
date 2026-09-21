"use client";

import { useEffect, useState } from "react";
import { applyThemePref, readThemePref, resolveTheme, type ThemePref } from "@/lib/theme";

const OPTS: { value: ThemePref; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

/** Segmentado Sistema / Claro / Oscuro. Aplica el tema al instante y lo recuerda en este navegador. */
export default function ThemeSwitch() {
  // Arranca en "system" para que servidor y cliente pinten lo mismo; se lee la preferencia real al montar.
  const [pref, setPref] = useState<ThemePref>("system");
  useEffect(() => { setPref(readThemePref()); }, []);

  // Si sigue al sistema y el sistema cambia, se actualiza en caliente
  useEffect(() => {
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onChange = () => { document.documentElement.dataset.theme = resolveTheme("system"); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const choose = (v: ThemePref) => { setPref(v); applyThemePref(v); };

  return (
    <span className="theme-seg" role="radiogroup" aria-label="Tema">
      {OPTS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={pref === o.value}
          className={`theme-seg__opt${pref === o.value ? " is-active" : ""}`}
          onClick={() => choose(o.value)}
          title={o.label}
        >
          <span>{o.label}</span>
        </button>
      ))}
    </span>
  );
}
