// AI usage types, with no server dependencies: imported by lib/usage.ts (DB)
// and the client panels (team settings and /admin).
//
// No text or formatting here: the server sends codes, ISO dates and numbers, and
// the client translates and formats them in its language (t.labels.action, fmtUsd, fmtDate).

export type UsageAction = "design_md" | "vision" | "jev_tag" | "jev_search" | "jev_directory" | "explain" | "revise";


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
  /** `name` null = the workspace no longer exists */
  byWorkspace: { id: string; name: string | null; kind: "personal" | "team"; usd: number; calls: number }[];
  daily: UsageDay[];
}
