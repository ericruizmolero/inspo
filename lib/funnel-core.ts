// The activation funnel as numbers: who signed up each week and how many of them reached each step since. Pure, so
// /admin/funnel, the partners' Monday email (lib/funnel.ts) and the tests count the same way. The rows come from
// tables the app already writes; lib/funnel.ts reads them.

/** In the order they are walked. A step counts whoever reached it, whether or not they reached the one before */
export const FUNNEL_STEPS = ["signedUp", "firstRef", "out", "requested", "paid"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

/** One person who signed up, and which steps they have reached by now */
export interface FunnelPerson {
  signedUpAt: Date;
  /** Saved a reference of their own (a template's left out) */
  firstRef: boolean;
  /** criterio.md left the app: exported, shared by link or read over MCP (the first steps' "out", lib/first-steps.ts) */
  out: boolean;
  /** Asked for a plan from Settings, Plan (plan_request), whatever came of it */
  requested: boolean;
  /** Owns an account on a paid plan with no end date: a gift, which has one, is not paying */
  paid: boolean;
}

export type FunnelCounts = Record<FunnelStep, number>;

/** One cohort: the people who signed up in the week that starts on `week` (Monday, YYYY-MM-DD, UTC) */
export interface FunnelWeek { week: string; counts: FunnelCounts }

export interface Funnel {
  /** Every cohort in the period, newest first, the weeks nobody signed up included */
  weeks: FunnelWeek[];
  total: FunnelCounts;
}

const DAY = 24 * 60 * 60 * 1000;

/** Monday 00:00 UTC of the week `d` falls in */
export function weekStart(d: Date): Date {
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return new Date(day - ((d.getUTCDay() + 6) % 7) * DAY);
}

export const weekKey = (d: Date) => weekStart(d).toISOString().slice(0, 10);

const zero = (): FunnelCounts => ({ signedUp: 0, firstRef: 0, out: 0, requested: 0, paid: 0 });

function add(c: FunnelCounts, p: FunnelPerson): void {
  c.signedUp++;
  for (const step of FUNNEL_STEPS) if (step !== "signedUp" && p[step]) c[step]++;
}

/** The cohorts of the weeks from `since` to `until`, and their sum. People outside those weeks are left out */
export function funnelOf(people: FunnelPerson[], since: Date, until: Date): Funnel {
  const weeks = new Map<string, FunnelCounts>();
  for (let w = weekStart(since).getTime(); w <= until.getTime(); w += 7 * DAY) weeks.set(new Date(w).toISOString().slice(0, 10), zero());
  const total = zero();
  for (const p of people) {
    const counts = weeks.get(weekKey(p.signedUpAt));
    if (!counts) continue;
    add(counts, p);
    add(total, p);
  }
  return { weeks: [...weeks].map(([week, counts]) => ({ week, counts })).reverse(), total };
}

/** The share of the step before that reached `step`, 0 to 1; null for the first step or when nobody reached the one before */
export function conversion(c: FunnelCounts, step: FunnelStep): number | null {
  const i = FUNNEL_STEPS.indexOf(step);
  if (i === 0) return null;
  const before = c[FUNNEL_STEPS[i - 1]];
  return before ? c[step] / before : null;
}

/** The waitlist since it opened: who joined it, who of them got an invite, who of those made an account */
export interface WaitlistFunnel { listed: number; invited: number; joined: number }
