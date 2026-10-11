// SaaS plans. No payment gateway yet: the plan lives in billing_account.plan, one account for one or
// more workspaces, and is changed by hand with `npx tsx scripts/set-plan.ts <slug> <plan>`.
// Quotas are monthly (calendar month), counted on the ai_usage table across the account's workspaces.
// The marketing site's /pricing/ shows a copy (marketing-site/src/plans.ts): change both, or
// tests/marketing-site-copy.test.ts fails. The same goes for the plans' text in lib/i18n/<locale>/plans.ts.

export type PlanKey = "free" | "personal" | "studio" | "agency";

/** Searches: the free plan has a hard monthly cap; paid plans are fair use, with an internal ceiling nobody is cut off at */
export type SearchAllowance = { kind: "capped"; perMonth: number } | { kind: "fairUse"; ceiling: number };

// Each plan's name and text (headline and list of what it includes) live in
// lib/i18n/<locale>/plans.ts, keyed by plan key: the free one is "Free" or "Gratis".
export interface Plan {
  key: PlanKey;
  /** Same figures in EUR and USD, without VAT. Annual = 2 months free */
  price: { month: number; year: number };
  /** People in each workspace. null = unlimited. Personal is 1, so it can't invite */
  members: number | null;
  /** Workspaces one billing account can hold. null = unlimited */
  workspaces: number | null;
  /** What a person asks of the model in a month (see AI_ACTIONS in lib/quota.ts) */
  aiActionsPerMonth: number | null;
  searches: SearchAllowance;
  /** References the library holds, the sample project's left out (lib/sample-items.ts) */
  itemsMax: number | null;
  /** Bytes of the workspace's own files (stored_file) */
  storageMaxBytes: number | null;
}

/** A paid plan: no cap on references or storage, and searches are fair use up to 10 times its AI actions */
const paid = (key: PlanKey, month: number, members: number, workspaces: number, aiActionsPerMonth: number): Plan => ({
  key, price: { month, year: month * 10 }, members, workspaces, aiActionsPerMonth,
  searches: { kind: "fairUse", ceiling: 10 * aiActionsPerMonth }, itemsMax: null, storageMaxBytes: null,
});

export const PLANS: Plan[] = [
  {
    key: "free", price: { month: 0, year: 0 }, members: 1, workspaces: 1, aiActionsPerMonth: 30,
    searches: { kind: "capped", perMonth: 30 }, itemsMax: 200, storageMaxBytes: 1024 ** 3,
  },
  paid("personal", 15, 1, 1, 300),
  paid("studio", 49, 5, 1, 500),
  paid("agency", 149, 15, 10, 2000),
];

export const DEFAULT_PLAN: PlanKey = "free";

export function planOf(key: string | null | undefined): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}

/** A plan someone pays for */
export const isPaid = (p: Pick<Plan, "price">) => p.price.month > 0;

export const isPlanKey = (k: string): k is PlanKey => PLANS.some((p) => p.key === k);

/** Contact email to change plan while there's no gateway */
export const PLANS_CONTACT = "hola@criterio.design";
