// A plan's limit, as the browser gets it. The server answers a QuotaError (lib/workspace-core.ts) with these fields
// next to its `error`: from a route (402), a server action ({ ok: false }) and Better Auth's invitation hooks alike.
// The upgrade notice (components/PlanLimitNotice.tsx) is the one place that shows it.
import { isPlanKey, type PlanKey } from "./plans";

export interface PlanLimitFields { quota: true; upgrade: PlanKey | null }

/** A failure that is a plan's limit: its message, and the plan that lifts it */
export class PlanLimitError extends Error {
  constructor(message: string, readonly upgrade: PlanKey | null) { super(message); }
}

type Failure = { error?: unknown; message?: unknown; quota?: unknown; upgrade?: unknown };

/** The plan's limit `x` stands for, if it is one: a PlanLimitError, or a failure's body with `quota: true` */
export function planLimitOf(x: unknown): PlanLimitError | null {
  if (x instanceof PlanLimitError) return x;
  if (!x || typeof x !== "object") return null;
  const f = x as Failure;
  if (f.quota !== true) return null;
  const message = typeof f.error === "string" ? f.error : typeof f.message === "string" ? f.message : "";
  return new PlanLimitError(message, typeof f.upgrade === "string" && isPlanKey(f.upgrade) ? f.upgrade : null);
}

/** The error a failed answer stands for: a PlanLimitError for a plan's limit, a plain Error otherwise */
export function failureOf(body: unknown, fallback = "Error"): Error {
  const limit = planLimitOf(body);
  if (limit) return limit;
  const error = body && typeof body === "object" ? (body as Failure).error : undefined;
  return new Error(typeof error === "string" && error ? error : fallback);
}
