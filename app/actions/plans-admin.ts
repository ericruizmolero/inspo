"use server";
// /admin/plans: a partner sets the plan an account asked for, or declines it. The logic is lib/plan-requests.ts.
import { decidePlanRequest, type PlanDecision } from "@/lib/plan-requests";
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
