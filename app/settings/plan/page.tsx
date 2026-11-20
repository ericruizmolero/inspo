import type { Metadata } from "next";
import Link from "next/link";
import SettingsHeading from "@/components/SettingsHeading";
import ActivityPing from "@/components/ActivityPing";
import { accountOf, accountWorkspaces, canManage, getCtxOrLogin, listMembers, type Ctx } from "@/lib/workspace";
import { usageSummary } from "@/lib/usage";
import UsageCard from "../_components/UsageCard";
import PlanWorkspaces from "../_components/PlanWorkspaces";
import { countMembers, quotaStatus } from "@/lib/quota";
import { planOf } from "@/lib/plans";
import { fmtGb } from "@/lib/room";
import { getT, fmtDate, type Dict } from "@/lib/i18n";
import { FieldRow, Progress, SettingsWindow } from "@/components/criterio";
import { planAsk } from "@/lib/plan-requests";
import { fmtGiftDay } from "@/lib/i18n/format";
import PlanChoice from "../_components/PlanChoice";


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.settings.sections.plan, description: t.settings.leads.plan };
}

function Line({ label, used, limit, t, seats, fairUse, nums }: {
  label: string; used: number; limit: number | null; t: Dict; seats?: boolean;
  /** `limit` is the internal ceiling: no bar, and past it a warning instead of a refusal */
  fairUse?: boolean;
  /** The figures, when they are not a count */ nums?: string;
}) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  // A monthly quota warns once it runs out; seats are fine at the limit and only warn when over it
  const full = limit !== null && (seats ? used > limit : used >= limit);
  return (
    <FieldRow label={label} className={`pl-quota${full ? " is-full" : ""}`}>
      <div className="pl-quota__meter">
        <span className="pl-quota__nums t-ui">{nums ?? (fairUse ? t.plans.fairUse(used) : limit === null ? t.plans.noLimit(used) : t.plans.usedOf(used, limit))}</span>
        {limit !== null && !fairUse && <Progress value={pct} segments={16} label={label} className="pl-quota__progress" />}
        {fairUse && full && <p className="pl-quota__note t-small">{t.plans.fairUsePassed}</p>}
      </div>
    </FieldRow>
  );
}

/** The plan's workspaces for whoever pays, every one; for an admin of one of them, only those they are in, so one
 *  client never reads another's name. The teams of theirs another plan pays for, to move here. */
async function planWorkspaces(ctx: Ctx) {
  const ws = ctx.workspace;
  const account = (await accountOf(ws.id))!;
  const owner = account.ownerUserId === ctx.user.id;
  if (!owner && !canManage(ws.role)) return null;
  const mine = new Set(ctx.workspaces.map((w) => w.id));
  const all = await accountWorkspaces(account.id);
  const movable = owner ? ctx.workspaces.filter((w) => w.kind === "team" && w.role === "owner" && w.billingAccountId !== account.id) : [];
  const people = await Promise.all(movable.map((w) => countMembers(w.id)));
  return {
    owner, accountName: account.name,
    // A personal space wears its person until it has a logo, as in the switcher
    // A client's workspace (a team whose owner is not the payer) can be let go; only the payer sees it
    rows: (owner ? all : all.filter((w) => mine.has(w.id))).map(({ id, name, logo, kind, people, ownerUserId }) =>
      ({ id, name, people, logo: logo ?? (kind === "personal" && mine.has(id) ? ctx.user.image ?? null : null),
        client: owner && kind === "team" && !!ownerUserId && ownerUserId !== ctx.user.id })),
    movable: movable.map((w, i) => ({ id: w.id, name: w.name, logo: w.logo, people: people[i] })),
  };
}

export default async function PlanPage() {
  const [ctx, { locale, t }] = await Promise.all([getCtxOrLogin("/settings/plan"), getT()]);
  const ws = ctx.workspace;
  const [q, usage, members, account, ask] = await Promise.all([
    quotaStatus(ws), usageSummary(ws.id, 30), listMembers(ws.id), planWorkspaces(ctx), planAsk(ws.billingAccountId, ctx.user.id),
  ]);
  const agency = planOf("agency");
  const resets = fmtDate(q.resetsAt, locale, { day: "numeric", month: "long" });
  const planName = t.plans.items[q.plan].name;
  const overSeats = q.members.limit !== null && q.members.used > q.members.limit;

  return (
    <>
      <ActivityPing area="plans" organizationId={ws.id} />
      <SettingsHeading title={t.settings.sections.plan} lead={t.settings.leads.plan} />

      <div className="page__body">
        <PlanChoice current={q.plan} owner={ask.owner} payer={ask.payer} pending={ask.pending}
          giftUntil={ask.until && fmtGiftDay(ask.until, locale)} />

        <SettingsWindow title={t.plans.usageTitle}
          description={q.workspaces.used > 1 ? <>{t.plans.resets(planName, resets)}. {t.plans.aiShared(q.workspaces.used)}</> : t.plans.resets(planName, resets)}
          note={(overSeats || q.pendingInvites > 0) ? (
            <>
              {overSeats && (
                <span className="pl-over">
                  {t.plans.overSeatsBefore(q.members.used, planName, q.members.limit!)}
                  <Link href="/settings/members">{t.plans.overSeatsLink}</Link>{t.plans.overSeatsAfter}
                </span>
              )}
              {overSeats && q.pendingInvites > 0 && " "}
              {q.pendingInvites > 0 && t.plans.pendingInvites(q.pendingInvites)}
            </>
          ) : undefined}>
            <Line label={t.plans.aiThisMonth} used={q.ai.used} limit={q.ai.limit} t={t} />
            <Line label={t.plans.searchesThisMonth} used={q.searches.used} limit={q.searches.limit} t={t} fairUse={q.searches.fairUse} />
            <Line label={t.plans.checksThisMonth} used={q.checks.used} limit={q.checks.limit} t={t} fairUse={q.checks.limit === null} />
            <Line label={t.plans.people} used={q.members.used} limit={q.members.limit} t={t} seats />
            <Line label={t.plans.references} used={q.items.used} limit={q.items.limit} t={t} />
            <Line label={t.plans.projects} used={q.projects.used} limit={q.projects.limit} t={t} seats />
            <Line label={t.plans.storage} used={q.storage.used} limit={q.storage.limit} t={t}
              nums={q.storage.limit === null ? t.plans.storageNoLimit(fmtGb(q.storage.used, locale)) : t.plans.storageOf(fmtGb(q.storage.used, locale), fmtGb(q.storage.limit, locale))} />
        </SettingsWindow>

        {account && (
          <PlanWorkspaces currentId={ws.id} accountName={account.accountName} planName={planName} limit={q.workspaces.limit} used={q.workspaces.used}
            agency={{ name: t.plans.items[agency.key].name, workspaces: agency.workspaces }} rows={account.rows} movable={account.movable} owner={account.owner} />
        )}

        <UsageCard usage={usage} images={Object.fromEntries(members.map((m) => [m.userId, m.image ?? null]))} />

      </div>
    </>
  );
}
