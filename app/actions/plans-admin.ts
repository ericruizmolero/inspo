"use server";
// /admin/plans: a partner sets the plan an account asked for, or declines it, or sets any account's plan with no
// request. The logic is lib/plan-requests.ts and lib/plan-change.ts.
import { decidePlanRequest, type PlanDecision } from "@/lib/plan-requests";
import { changePlan } from "@/lib/plan-change";
import { isPlanKey } from "@/lib/plans";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";
import { appBase, asAdmin } from "@/lib/admin-action";

const isId = (x: unknown): x is string => typeof x === "string" && x.length > 0 && x.length < 100;

async function decide(requestId: string, decision: PlanDecision) {
  return asAdmin(async (s) => {
    if (!isId(requestId)) throw new HttpError(400, (await getErrors()).badBody);
    return decidePlanRequest(requestId, decision, s.user.id, await appBase());
  });
}

/** Switches the asked-for plan on for the whole account and emails whoever asked */
export async function setRequestedPlan(requestId: string) {
  return decide(requestId, "done");
}

/** Closes the request; the plan stays as it is */
export async function declinePlanRequest(requestId: string) {
  return decide(requestId, "declined");
}

/** A plan's last day from the date field: the end of that day (UTC), null for no end, undefined when it is no future day */
function lastDay(until: unknown): Date | null | undefined {
  if (until === null) return null;
  if (typeof until !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(until)) return undefined;
  const d = new Date(`${until}T23:59:59Z`);
  return Number.isNaN(d.getTime()) || d <= new Date() ? undefined : d;
}

/**
 * Puts an account on `plan`, through changePlan like every other change, with `until` (YYYY-MM-DD, the plan's last
 * day) or with no end. A free plan has no end to give.
 */
export async function setAccountPlan(accountId: string, plan: string, until: string | null) {
  return asAdmin(async () => {
    const last = lastDay(until);
    if (!isId(accountId) || typeof plan !== "string" || !isPlanKey(plan) || last === undefined || (last && plan === "free")) {
      throw new HttpError(400, (await getErrors()).badBody);
    }
    return changePlan({ accountId, plan, until: last, cause: "partner", appUrl: await appBase() });
  });
}
