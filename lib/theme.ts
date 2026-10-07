/**
 * Light / dark theme.
 * The preference is stored in localStorage ("light" | "dark"; missing = follow the system)
 * and the resolved value is written to <html data-theme="light|dark">, which globals.css reads.
 */
export type ThemePref = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "inspo-theme";

/** Injected inline in <head> to set the theme before first paint. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){}})();`;

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function systemTheme(): ResolvedTheme {
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  return pref === "system" ? systemTheme() : pref;
}

/** Sets data-theme with every transition off for that frame, so the switch snaps instead of smearing
 * (buttons, tabs and cards all transition their colors). */
export function setTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  const off = document.createElement("style");
  off.textContent = "*,*::before,*::after{transition:none !important}";
  document.head.appendChild(off);
  root.dataset.theme = theme;
  void getComputedStyle(root).opacity; // reflow with the transitions off
  requestAnimationFrame(() => off.remove());
}

/** Saves the preference and applies the resolved theme to the document. */
export function applyThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {}
  setTheme(resolveTheme(pref));
}
