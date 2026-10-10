// AI usage types, with no server dependencies: imported by lib/usage.ts (DB)
// and the client panels (team settings and /admin).
//
// No text or formatting here: the server sends codes, ISO dates and numbers, and
// the client translates and formats them in its language (t.labels.action, fmtUsd, fmtDate).

export type UsageAction = "design_md" | "vision" | "jev_tag" | "jev_search" | "jev_directory" | "explain" | "revise" | "design_why" | "polish" | "auto_tag" | "query_en" | "embed" | "system" | "brand";


/** Prefix of `ref` on a model call nobody asked for by hand (the board's own re-read after filing a reference,
 *  the brand pass chained to a system pass): logged with its cost, but not one of the plan's AI actions */
export const AUTO_REF = "auto:";

/** Free re-reads of one project's board a day: each filed reference changes the board, so moving one in and out
 *  must not buy passes without end */
export const AUTO_SYSTEM_PER_DAY = 20;
/** How long after a system pass someone asked for its chained brand pass is still part of it */
export const BRAND_CHAIN_MS = 10 * 60_000;

// The request only asks for an automatic pass; the server decides from what it sees (#91)

/** A re-read is automatic when the board moved since the last run, under the day's limit */
export function autoSystemPass(asked: boolean, f: { lastStamp: string | null; stamp: string; autoToday: number }): boolean {
  return asked && f.lastStamp !== null && f.lastStamp !== f.stamp && f.autoToday < AUTO_SYSTEM_PER_DAY;
}

/** A brand pass is automatic once per counted system pass, right after it */
export function autoBrandPass(asked: boolean, f: { systemAt: Date | null; brandAt: Date | null; now: Date }): boolean {
  if (!asked || !f.systemAt || f.now.getTime() - f.systemAt.getTime() > BRAND_CHAIN_MS) return false;
  return !f.brandAt || f.brandAt < f.systemAt;
}

export interface UsageDay { date: string; usd: number; calls: number }

/** App-wide AI usage over a period (/admin panel) */
export interface UsageOverview {
  days: number;
  totalUsd: number;
  calls: number;
  /** People with at least one call */
  people: number;
  byAction: { action: string; calls: number; usd: number; units: number }[];
  /** `name` null = system call, no person behind it */
  byUser: { userId: string | null; name: string | null; email: string | null; image: string | null; usd: number; calls: number }[];
  /** `id` null = the workspace was deleted, and `name` is the one it had then (ai_usage.organization_name) */
  byWorkspace: { id: string | null; name: string | null; kind: "personal" | "team"; usd: number; calls: number }[];
  daily: UsageDay[];
}
