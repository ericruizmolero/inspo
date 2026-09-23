// SaaS plans. No payment gateway yet: the plan lives in the organization's
// metadata and is changed by hand with `npx tsx scripts/set-plan.ts <slug> <plan>`.
// Quotas are monthly (calendar month) and counted on the ai_usage table.

export type PlanKey = "solo" | "studio" | "agency";

// Each plan's text (headline and list of what it includes) lives in
// lib/i18n/<locale>/plans.ts, keyed by plan key.
export interface Plan {
  key: PlanKey;
  name: string;
  priceEur: number;
  /** null = unlimited */
  members: number | null;
  designMdPerMonth: number | null;
  searchesPerMonth: number | null;
}

export const PLANS: Plan[] = [
  {
    key: "solo", name: "Solo", priceEur: 0,
    members: 1, designMdPerMonth: 3, searchesPerMonth: 30,
  },
  {
    key: "studio", name: "Studio", priceEur: 29,
    members: 5, designMdPerMonth: 25, searchesPerMonth: null,
  },
  {
    key: "agency", name: "Agency", priceEur: 79,
    members: 15, designMdPerMonth: 100, searchesPerMonth: null,
  },
];

export const DEFAULT_PLAN: PlanKey = "solo";

export function planOf(key: string | null | undefined): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}

export const isPlanKey = (k: string): k is PlanKey => PLANS.some((p) => p.key === k);

/** Contact email to change plan while there's no gateway */
export const PLANS_CONTACT = "hola@savvia.studio";
