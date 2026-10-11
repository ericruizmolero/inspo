import type { Metadata } from "next";
import Link from "next/link";
import SettingsHeading from "@/components/SettingsHeading";
import ActivityPing from "@/components/ActivityPing";
import { accountOf, accountWorkspaces, canManage, getCtxOrLogin, listMembers, type Ctx } from "@/lib/workspace";
import { usageSummary } from "@/lib/usage";
import UsageCard from "../_components/UsageCard";
import PlanWorkspaces from "../_components/PlanWorkspaces";
import { countMembers, quotaStatus } from "@/lib/quota";
import { PLANS, PLANS_CONTACT, isPaid, planOf } from "@/lib/plans";
import { fmtGb } from "@/lib/room";
import { getT, fmtDate, fmtPrice, type Dict } from "@/lib/i18n";
import { Button, Icon, Progress, SettingsWindow } from "@/components/criterio";


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.settings.sections.plan };
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
    <div className={`pl-quota${full ? " is-full" : ""}`}>
      <div className="pl-quota__head">
        <span className="t-ui">{label}</span>
        <span className="pl-quota__nums t-small">{nums ?? (fairUse ? t.plans.fairUse(used) : limit === null ? t.plans.noLimit(used) : t.plans.usedOf(used, limit))}</span>
      </div>
      {limit !== null && !fairUse && <Progress value={pct} segments={16} label={label} className="pl-quota__progress" />}
      {fairUse && full && <p className="pl-quota__note t-small">{t.plans.fairUsePassed}</p>}
    </div>
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
    rows: (owner ? all : all.filter((w) => mine.has(w.id))).map(({ id, name, logo, kind, people }) =>
      ({ id, name, people, logo: logo ?? (kind === "personal" && mine.has(id) ? ctx.user.image ?? null : null) })),
    movable: movable.map((w, i) => ({ id: w.id, name: w.name, logo: w.logo, people: people[i] })),
  };
}

export default async function PlanPage() {
  const [ctx, { locale, t }] = await Promise.all([getCtxOrLogin("/settings/plan"), getT()]);
  const ws = ctx.workspace;
  const [q, usage, members, account] = await Promise.all([quotaStatus(ws), usageSummary(ws.id, 30), listMembers(ws.id), planWorkspaces(ctx)]);
  const agency = planOf("agency");
  const resets = fmtDate(q.resetsAt, locale, { day: "numeric", month: "long" });
  const planName = t.plans.items[q.plan].name;
  const overSeats = q.members.limit !== null && q.members.used > q.members.limit;
  const mailto = (plan: string) => `mailto:${PLANS_CONTACT}?subject=${encodeURIComponent(t.plans.mailSubject(plan, ws.name))}`;

  return (
    <>
      <ActivityPing area="plans" organizationId={ws.id} />
      <SettingsHeading title={t.settings.sections.plan} lead={t.settings.leads.plan} />

      <div className="page__body">
        <div className="pl-plans">
          {PLANS.map((p) => {
            const current = p.key === q.plan;
            const up = p.price.month > planOf(q.plan).price.month;
            const name = t.plans.items[p.key].name;
            return (
              // Every plan the same height: the tagline holds two lines, the features grow, the footer sits at the bottom
              <SettingsWindow key={p.key} title={name} className={`pl-plan${current ? " is-current" : ""}`}
                note={current ? t.plans.current : undefined}
                actions={current ? undefined : (
                  <Button variant={up ? "primary" : "secondary"} size="s" href={mailto(name)}>
                    {up ? t.plans.moveUp : t.plans.moveDown}
                  </Button>
                )}>
                <p className="pl-plan__tagline t-small">{t.plans.items[p.key].tagline}</p>
                <div className="pl-plan__price">
                  <span className="t-title-l">{fmtPrice(p.price.month, locale)}</span><span className="pl-plan__per t-small">{t.plans.perMonth}</span>
                  <span className="pl-plan__year t-small">{isPaid(p) ? t.plans.orYearly(fmtPrice(p.price.year, locale)) : t.plans.forGood}</span>
                </div>
                <ul className="pl-plan__features">
                  {t.plans.items[p.key].features.map((f) => <li key={f}><span className="pl-plan__tick"><Icon name="check" size={12} weight="bold" /></span><span>{f}</span></li>)}
                </ul>
              </SettingsWindow>
            );
          })}
        </div>
        <p className="pl-foot t-small">{t.plans.foot}</p>

        <SettingsWindow title={ws.name}
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
          <div className="pl-usage__grid">
            <Line label={t.plans.aiThisMonth} used={q.ai.used} limit={q.ai.limit} t={t} />
            <Line label={t.plans.searchesThisMonth} used={q.searches.used} limit={q.searches.limit} t={t} fairUse={q.searches.fairUse} />
            <Line label={t.plans.people} used={q.members.used} limit={q.members.limit} t={t} seats />
            <Line label={t.plans.references} used={q.items.used} limit={q.items.limit} t={t} />
            <Line label={t.plans.storage} used={q.storage.used} limit={q.storage.limit} t={t}
              nums={q.storage.limit === null ? t.plans.storageNoLimit(fmtGb(q.storage.used, locale)) : t.plans.storageOf(fmtGb(q.storage.used, locale), fmtGb(q.storage.limit, locale))} />
          </div>
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
