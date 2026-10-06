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

/** Saves the preference and applies the resolved theme to the document. */
export function applyThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {}
  document.documentElement.dataset.theme = resolveTheme(pref);
}

/** How long a change of theme made by hand takes (globals.css reads the same figure for the cross-fade) */
export const THEME_SWITCH_MS = 600;

/**
 * A change of theme somebody asked for with a click: the whole page crosses from one to the other at once, as one
 * picture (a view transition), instead of each piece changing colour on its own clock. Where the browser cannot,
 * or the person asked for less motion, it just changes.
 */
export function switchTheme(pref: ThemePref) {
  const root = document.documentElement;
  const same = resolveTheme(pref) === root.dataset.theme;
  if (same || !document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return applyThemePref(pref);
  root.dataset.themeSwitch = "";
  const done = () => { delete root.dataset.themeSwitch; };
  document.startViewTransition(() => applyThemePref(pref)).finished.then(done, done);
}
