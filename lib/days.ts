// Calendar days in the app's time zone (Madrid), to group daily series
// in SQL and build the chart axis of the activity panel.
import { sql, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

export const TZ = "Europe/Madrid";

/** Madrid's offset from UTC, in seconds, right now (changes with daylight saving) */
export function tzOffsetSeconds(): number {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /([+-])(\d{2}):(\d{2})/.exec(part);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3]) * 60);
}

/** Today's midnight in Madrid, in UTC ms */
export function startOfTodayMs(off: number): number {
  const day = Math.floor((Date.now() / 1000 + off) / 86400);
  return (day * 86400 - off) * 1000;
}

/** Day number (since 1970) of a ms timestamp column, for GROUP BY */
export function dayOf(col: AnyColumn, off: number): SQL<number> {
  return sql<number>`cast((${col} / 1000 + ${off}) / 86400 as integer)`;
}

/** `date` is ISO (YYYY-MM-DD). The client formats the axis label in its language. */
export interface DaySlot { day: number; date: string }

/** The last N calendar days ending today: day number and ISO date */
export function daySlots(days: number, off: number): DaySlot[] {
  const todayStart = startOfTodayMs(off);
  const since = todayStart - (days - 1) * 86400000;
  const firstDay = Math.floor((since / 1000 + off) / 86400);
  const out: DaySlot[] = [];
  for (let i = 0; i < days; i++) {
    const day = firstDay + i;
    const date = new Date((day * 86400 - off) * 1000 + 12 * 3600 * 1000); // noon, safe from clock changes
    out.push({ day, date: date.toISOString().slice(0, 10) });
  }
  return out;
}
