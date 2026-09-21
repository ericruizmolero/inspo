/**
 * Tema claro / oscuro.
 * La preferencia se guarda en localStorage ("light" | "dark"; ausente = seguir al sistema)
 * y el valor resuelto se escribe en <html data-theme="light|dark">, que es lo que lee globals.css.
 */
export type ThemePref = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "inspo-theme";

/** Se inyecta inline en <head> para fijar el tema antes del primer pintado. */
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

/** Guarda la preferencia y aplica el tema resuelto al documento. */
export function applyThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {}
  document.documentElement.dataset.theme = resolveTheme(pref);
}
