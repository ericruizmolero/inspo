// Días naturales en la zona horaria de la app (Madrid), para agrupar series
// diarias en SQL y construir el eje de las gráficas del panel de actividad.
import { sql, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

export const TZ = "Europe/Madrid";

/** Desfase de Madrid respecto a UTC, en segundos, ahora mismo (cambia con el horario de verano) */
export function tzOffsetSeconds(): number {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /([+-])(\d{2}):(\d{2})/.exec(part);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3]) * 60);
}

/** Medianoche de hoy en Madrid, en ms UTC */
export function startOfTodayMs(off: number): number {
  const day = Math.floor((Date.now() / 1000 + off) / 86400);
  return (day * 86400 - off) * 1000;
}

/** Número de día (desde 1970) de una columna de timestamp en ms, para GROUP BY */
export function dayOf(col: AnyColumn, off: number): SQL<number> {
  return sql<number>`cast((${col} / 1000 + ${off}) / 86400 as integer)`;
}

/** `date` es ISO (YYYY-MM-DD). La etiqueta del eje la formatea el cliente, con su idioma. */
export interface DaySlot { day: number; date: string }

/** Los N últimos días naturales acabando hoy: número de día y fecha ISO */
export function daySlots(days: number, off: number): DaySlot[] {
  const todayStart = startOfTodayMs(off);
  const since = todayStart - (days - 1) * 86400000;
  const firstDay = Math.floor((since / 1000 + off) / 86400);
  const out: DaySlot[] = [];
  for (let i = 0; i < days; i++) {
    const day = firstDay + i;
    const date = new Date((day * 86400 - off) * 1000 + 12 * 3600 * 1000); // mediodía, a salvo de cambios de hora
    out.push({ day, date: date.toISOString().slice(0, 10) });
  }
  return out;
}
