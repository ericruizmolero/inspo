// Fechas y cantidades con el idioma de quien mira. La zona horaria no cambia con el
// idioma: los días de las gráficas de /admin se agrupan siempre por el día de Madrid.
import { INTL_LOCALE, type Locale } from "./locale";

type DateLike = Date | string | number;
const asDate = (v: DateLike) => (v instanceof Date ? v : new Date(v));

export function fmtDate(v: DateLike, locale: Locale, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  return asDate(v).toLocaleDateString(INTL_LOCALE[locale], opts);
}

export function fmtDateTime(v: DateLike, locale: Locale, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }): string {
  return asDate(v).toLocaleString(INTL_LOCALE[locale], opts);
}

export function fmtTime(v: DateLike, locale: Locale, opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }): string {
  return asDate(v).toLocaleTimeString(INTL_LOCALE[locale], opts);
}

/** Dólares con el separador decimal del idioma: "1,23 $" en castellano, "$1.23" en inglés. */
export function fmtUsd(n: number, locale: Locale): string {
  const digits = n > 0 && n < 0.01 ? 4 : 2;
  return new Intl.NumberFormat(INTL_LOCALE[locale], { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}
