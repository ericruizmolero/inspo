import type { Metadata } from "next";
import Link from "next/link";
import SettingsHeading from "@/components/SettingsHeading";
import ActivityPing from "@/components/ActivityPing";
import { getCtxOrLogin, listMembers } from "@/lib/workspace";
import { usageSummary } from "@/lib/usage";
import UsageCard from "../_components/UsageCard";
import { quotaStatus } from "@/lib/quota";
import { PLANS, PLANS_CONTACT } from "@/lib/plans";
import { fmtGb } from "@/lib/room";
import { getT, fmtDate, type Dict } from "@/lib/i18n";
import { Button, Icon, Progress, SettingsWindow } from "@/components/criterio";


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.settings.sections.plan };
}

function Line({ label, used, limit, t, seats, nums }: { label: string; used: number; limit: number | null; t: Dict; seats?: boolean; /** The figures, when they are not a count */ nums?: string }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  // A monthly quota warns once it runs out; seats are fine at the limit and only warn when over it
  const full = limit !== null && (seats ? used > limit : used >= limit);
  return (
    <div className={`pl-quota${full ? " is-full" : ""}`}>
      <div className="pl-quota__head">
        <span className="t-ui">{label}</span>
        <span className="pl-quota__nums t-small">{nums ?? (limit === null ? t.plans.noLimit(used) : t.plans.usedOf(used, limit))}</span>
      </div>
      {limit !== null && <Progress value={pct} segments={16} label={label} className="pl-quota__progress" />}
    </div>
  );
}

export default async function PlanPage() {
  const [ctx, { locale, t }] = await Promise.all([getCtxOrLogin("/settings/plan"), getT()]);
  const ws = ctx.workspace;
  const [q, usage, members] = await Promise.all([quotaStatus(ws), usageSummary(ws.id, 30), listMembers(ws.id)]);
  const resets = fmtDate(q.resetsAt, locale, { day: "numeric", month: "long" });
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
            return (
              // Every plan the same height: the tagline holds two lines, the features grow, the footer sits at the bottom
              <SettingsWindow key={p.key} title={p.name} className={`pl-plan${current ? " is-current" : ""}`}
                note={current ? t.plans.current : undefined}
                actions={current ? undefined : (
                  <Button variant={p.priceEur > 0 ? "primary" : "secondary"} size="s" href={mailto(p.name)}>
                    {p.priceEur > 0 ? t.plans.moveUp(p.name) : t.plans.moveDown(p.name)}
                  </Button>
                )}>
                <p className="pl-plan__tagline t-small">{t.plans.items[p.key].tagline}</p>
                <div className="pl-plan__price">
                  {p.priceEur === 0
                    ? <span className="t-title-l">{t.plans.free}</span>
                    : <><span className="t-title-l">{p.priceEur} €</span><span className="pl-plan__per t-small">{t.plans.perMonth}</span></>}
                </div>
                <ul className="pl-plan__features">
                  {t.plans.items[p.key].features.map((f) => <li key={f}><span className="pl-plan__tick"><Icon name="check" size={12} weight="bold" /></span><span>{f}</span></li>)}
                </ul>
              </SettingsWindow>
            );
          })}
        </div>
        <p className="pl-foot t-small">{t.plans.foot}</p>

        <SettingsWindow title={ws.name} description={t.plans.resets(q.planName, resets)}
          note={(overSeats || q.pendingInvites > 0) ? (
            <>
              {overSeats && (
                <span className="pl-over">
                  {t.plans.overSeatsBefore(q.members.used, q.planName, q.members.limit!)}
                  <Link href="/settings/members">{t.plans.overSeatsLink}</Link>{t.plans.overSeatsAfter}
                </span>
              )}
              {overSeats && q.pendingInvites > 0 && " "}
              {q.pendingInvites > 0 && t.plans.pendingInvites(q.pendingInvites)}
            </>
          ) : undefined}>
          <div className="pl-usage__grid">
            <Line label={t.plans.aiThisMonth} used={q.ai.used} limit={q.ai.limit} t={t} />
            <Line label={t.plans.searchesThisMonth} used={q.searches.used} limit={q.searches.limit} t={t} />
            <Line label={t.plans.people} used={q.members.used} limit={q.members.limit} t={t} seats />
            <Line label={t.plans.references} used={q.items.used} limit={q.items.limit} t={t} />
            <Line label={t.plans.storage} used={q.storage.used} limit={q.storage.limit} t={t}
              nums={q.storage.limit === null ? t.plans.storageNoLimit(fmtGb(q.storage.used, locale)) : t.plans.storageOf(fmtGb(q.storage.used, locale), fmtGb(q.storage.limit, locale))} />
          </div>
        </SettingsWindow>

        <UsageCard usage={usage} images={Object.fromEntries(members.map((m) => [m.userId, m.image ?? null]))} />

      </div>
    </>
  );
}
