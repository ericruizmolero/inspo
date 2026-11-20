// SaaS plans. No payment gateway yet: the plan lives in billing_account.plan, one account for one or
// more workspaces. Its owner asks for one in Settings, Plan and a partner sets it in /admin/plans
// (lib/plan-requests.ts), or by hand with `npx tsx scripts/set-plan.ts <slug> <plan>`.
// Quotas are monthly (calendar month), counted on the ai_usage table across the account's workspaces.
// The marketing site's /pricing/ shows a copy (marketing-site/src/plans.ts): change both, or
// tests/marketing-site-copy.test.ts fails. The same goes for the plans' text in lib/i18n/<locale>/plans.ts.

export type PlanKey = "free" | "duo" | "studio" | "agency";

/** Searches: the free plan has a hard monthly cap; paid plans are fair use, with an internal ceiling nobody is cut off at */
export type SearchAllowance = { kind: "capped"; perMonth: number } | { kind: "fairUse"; ceiling: number };

// Each plan's name and text (headline and list of what it includes) live in
// lib/i18n/<locale>/plans.ts, keyed by plan key: the free one is "Free" or "Gratis".
export interface Plan {
  key: PlanKey;
  /** Same figures in EUR and USD, without VAT. Annual = 2 months free */
  price: { month: number; year: number };
  /** People in each workspace. null = unlimited. Every plan is collaborative: the smallest ones are 2 */
  members: number | null;
  /** Workspaces one billing account can hold. null = unlimited */
  workspaces: number | null;
  /** What a person asks of the model in a month (see AI_ACTIONS in lib/quota.ts) */
  aiActionsPerMonth: number | null;
  searches: SearchAllowance;
  /** References the library holds, the sample project's left out (lib/sample-items.ts) */
  itemsMax: number | null;
  /** Projects in each workspace, templates left out. null = unlimited */
  projectsMax: number | null;
  /** Bytes of the workspace's own files (stored_file) */
  storageMaxBytes: number | null;
  /** The Vault's code: "sample" reads only the pieces marked free (vault_item.access), "full" reads every piece */
  vault: "sample" | "full";
}

/** A paid plan: no cap on references, projects or storage, the whole Vault, and searches are fair use up to 10 times its AI actions */
const paid = (key: PlanKey, month: number, members: number, workspaces: number, aiActionsPerMonth: number): Plan => ({
  key, price: { month, year: month * 10 }, members, workspaces, aiActionsPerMonth,
  searches: { kind: "fairUse", ceiling: 10 * aiActionsPerMonth }, itemsMax: null, projectsMax: null, storageMaxBytes: null, vault: "full",
});

export const PLANS: Plan[] = [
  {
    key: "free", price: { month: 0, year: 0 }, members: 2, workspaces: 1, aiActionsPerMonth: 30,
    searches: { kind: "capped", perMonth: 30 }, itemsMax: 12, projectsMax: 1, storageMaxBytes: 1024 ** 3, vault: "sample",
  },
  paid("duo", 19, 2, 1, 300),
  paid("studio", 69, 5, 1, 500),
  paid("agency", 199, 15, 10, 2000),
];

/** Landing checks open a browser on our side, so the free plan has a monthly cap; paid plans are fair use (the hourly limit) */
export const FREE_CHECKS_PER_MONTH = 10;

export const DEFAULT_PLAN: PlanKey = "free";

export function planOf(key: string | null | undefined): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}

/** A plan someone pays for */
export const isPaid = (p: Pick<Plan, "price">) => p.price.month > 0;

export const isPlanKey = (k: string): k is PlanKey => PLANS.some((p) => p.key === k);

/** The plans an account can ask to move up to from `from`: the dearer ones */
export const plansAbove = (from: PlanKey): Plan[] => PLANS.filter((p) => p.price.month > planOf(from).price.month);

/** What a plan can run out of. Each one is a QuotaError (lib/workspace-core.ts) when it does */
export type PlanLimit = "ai" | "searches" | "members" | "items" | "projects" | "storage" | "workspaces" | "checks";

/** How much of each limit a plan gives: null is no cap */
const ROOM: Record<PlanLimit, (p: Plan) => number | null> = {
  ai: (p) => p.aiActionsPerMonth,
  searches: (p) => (p.searches.kind === "capped" ? p.searches.perMonth : null),
  members: (p) => p.members,
  items: (p) => p.itemsMax,
  projects: (p) => p.projectsMax,
  storage: (p) => p.storageMaxBytes,
  workspaces: (p) => p.workspaces,
  checks: (p) => (isPaid(p) ? null : FREE_CHECKS_PER_MONTH),
};

/** The cheapest plan above `from` that gives more of `limit`: the one the upgrade notice names. null at the top */
export function planThatLifts(limit: PlanLimit, from: PlanKey): PlanKey | null {
  const had = ROOM[limit](planOf(from));
  if (had === null) return null;
  return plansAbove(from).find((p) => { const room = ROOM[limit](p); return room === null || room > had; })?.key ?? null;
}
