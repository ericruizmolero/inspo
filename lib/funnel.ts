// The activation funnel read from what the app already stores (lib/funnel-core.ts counts it): /admin/funnel, and the
// partners' weekly email, sent by the morning's "mail" job (lib/job-run.ts). Server only.
import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "./db";
import { isSampleItem } from "./sample-items";
import { fixedAdmins } from "./activity";
import { mailOnce } from "./mail-once";
import type { Mail } from "./mail";
import { conversion, FUNNEL_STEPS, funnelOf, weekStart, type Funnel, type FunnelPerson, type FunnelStep, type FunnelWeek, type WaitlistFunnel } from "./funnel-core";

const DAY = 24 * 60 * 60 * 1000;
const U = schema.user, T = schema.inspoItem, M = schema.member, S = schema.projectSystem, SH = schema.systemShare;
const G = schema.mcpGrant, R = schema.planRequest, B = schema.billingAccount, W = schema.waitlistEntry;

/** Everyone who signed up in [since, until), with the steps they reached by now */
export async function funnelPeople(since: Date, until: Date): Promise<FunnelPerson[]> {
  // Raw SQL with an alias for the person: the subqueries name columns that several tables share
  const free = "free";
  const { rows } = await db.execute<{ signed_up_at: Date | string; first_ref: boolean; out: boolean; requested: boolean; paid: boolean }>(sql`select u.created_at as signed_up_at,
    exists (select 1 from ${T} where ${T.createdBy} = u.id and not ${isSampleItem()}) as first_ref,
    (exists (select 1 from ${S} join ${M} on ${M.organizationId} = ${S.organizationId} where ${M.userId} = u.id and ${S.exportedAt} is not null)
      or exists (select 1 from ${SH} join ${M} on ${M.organizationId} = ${SH.organizationId} where ${M.userId} = u.id)
      or exists (select 1 from ${G} where ${G.userId} = u.id and ${G.codeUsedAt} is not null)) as out,
    exists (select 1 from ${R} where ${R.requestedBy} = u.id) as requested,
    exists (select 1 from ${B} where ${B.ownerUserId} = u.id and ${B.plan} <> ${free} and ${B.planUntil} is null) as paid
    from ${U} u where u.created_at >= ${since.toISOString()} and u.created_at < ${until.toISOString()}`);
  return rows.map((r) => ({ signedUpAt: new Date(r.signed_up_at), firstRef: r.first_ref, out: r.out, requested: r.requested, paid: r.paid }));
}

/** The waitlist since it opened */
export async function waitlistFunnel(): Promise<WaitlistFunnel> {
  const [r] = await db.select({
    listed: sql<number>`count(*)`.mapWith(Number),
    invited: sql<number>`count(*) filter (where ${W.invitedAt} is not null)`.mapWith(Number),
    joined: sql<number>`count(*) filter (where ${W.joinedAt} is not null)`.mapWith(Number),
  }).from(W);
  return r;
}

export interface FunnelOverview { days: number; generatedAt: string; funnel: Funnel; waitlist: WaitlistFunnel }

/** /admin/funnel: the cohorts of the weeks that touch the last `days` days */
export async function funnelOverview(days: number, now = new Date()): Promise<FunnelOverview> {
  const since = weekStart(new Date(+now - (days - 1) * DAY));
  const [people, waitlist] = await Promise.all([funnelPeople(since, now), waitlistFunnel()]);
  return { days, generatedAt: now.toISOString(), funnel: funnelOf(people, since, now), waitlist };
}

const STEP_NAMES: Record<FunnelStep, string> = {
  signedUp: "Signed up",
  firstRef: "First reference saved",
  out: "criterio.md out",
  requested: "Plan requested",
  paid: "On a paid plan now",
};

const pct = (x: number | null) => (x === null ? "" : `, ${Math.round(x * 100)}% of the step before`);
const day = (week: string) => new Date(`${week}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** The partners' email: last week's sign-ups against the week before's, step by step. Ops mail, in English */
export function funnelWeekMail(last: FunnelWeek, before: FunnelWeek, url: string): Mail {
  const lines = FUNNEL_STEPS.map((step) =>
    `${STEP_NAMES[step]}: ${last.counts[step]}${pct(conversion(last.counts, step))} (week before: ${before.counts[step]}${pct(conversion(before.counts, step))})`);
  return {
    subject: `Funnel, week of ${day(last.week)}: ${last.counts.signedUp} sign-ups (${before.counts.signedUp} the week before)`,
    text: `The people who signed up in the week of ${day(last.week)}, against those of the week of ${day(before.week)}. Each step counts who reached it by this morning, so the week before had a week longer to get there.\n\n${lines.join("\n")}\n\nEvery week, and the waitlist, in ${url}/admin/funnel`,
  };
}

/** The key of a week's email: once per week reported, however many mornings the job runs */
export const funnelMailKey = (week: string) => `funnel-week:${week}`;

/**
 * The first morning job of each week (Monday's, unless it failed) emails the partners the week that ended against the one
 * before. Run again that week, it sends nothing. Returns whether this call sent it.
 */
export async function sendWeeklyFunnel(appUrl: string, now = new Date()): Promise<boolean> {
  const thisWeek = weekStart(now);
  const since = new Date(+thisWeek - 14 * DAY);
  const { weeks } = funnelOf(await funnelPeople(since, thisWeek), since, new Date(+thisWeek - 1));
  const [last, before] = weeks;
  return mailOnce(funnelMailKey(last.week), fixedAdmins(), funnelWeekMail(last, before, appUrl));
}
