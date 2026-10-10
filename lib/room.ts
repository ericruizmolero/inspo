// How much a workspace can still add under its plan: references and bytes. Pure and client-safe: lib/quota.ts
// reads the counts, the plan page and PlanMeter print them, scripts/check-usage.ts asserts them.
import { INTL_LOCALE, type Locale } from "./i18n/locale";
import { isPaid, type Plan } from "./plans";

export const GB = 1024 ** 3;

export interface Usage { items: number; bytes: number }
/** What is left to add; null = unlimited */
export interface Room { items: number | null; bytes: number | null }
export type Full = "items" | "storage";

export function roomLeft(plan: Pick<Plan, "itemsMax" | "storageMaxBytes">, used: Usage): Room {
  return {
    items: plan.itemsMax === null ? null : Math.max(0, plan.itemsMax - used.items),
    bytes: plan.storageMaxBytes === null ? null : Math.max(0, plan.storageMaxBytes - used.bytes),
  };
}

/** What runs out first if `need` is added, or null when it fits */
export function whatIsFull(room: Room, need: { items?: number; bytes?: number }): Full | null {
  if (need.items && room.items !== null && need.items > room.items) return "items";
  if (need.bytes && room.bytes !== null && need.bytes > room.bytes) return "storage";
  return null;
}

/** Gigabytes with the language's decimal mark: one decimal ("0,4"), two below a tenth so a start still shows ("0,03") */
export function fmtGb(bytes: number, locale: Locale): string {
  const gb = bytes / GB;
  const digits = gb > 0 && gb < 0.1 ? 2 : 1;
  return new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: digits }).format(gb);
}

/** Another team needs a workspace someone pays for among the ones the person owns: their personal space is the free one */
export const mayCreateTeam = (owned: Pick<Plan, "priceEur">[]): boolean => owned.some(isPaid);
