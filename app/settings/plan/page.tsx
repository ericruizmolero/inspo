import type { Metadata } from "next";
import Link from "next/link";
import SettingsHeading from "@/components/SettingsHeading";
import ActivityPing from "@/components/ActivityPing";
import { getCtxOrLogin, listMembers } from "@/lib/workspace";
import { usageSummary } from "@/lib/usage";
import UsageCard from "../_components/UsageCard";
import { quotaStatus } from "@/lib/quota";
import { PLANS, PLANS_CONTACT } from "@/lib/plans";
import { getT, fmtDate, type Dict } from "@/lib/i18n";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.settings.sections.plan };
}

const IcCheck = (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l2.5 2.5L10 3.5" /></svg>
);

function Line({ label, used, limit, t, seats }: { label: string; used: number; limit: number | null; t: Dict; seats?: boolean }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  // A monthly quota warns once it runs out; seats are fine at the limit and only warn when over it
  const full = limit !== null && (seats ? used > limit : used >= limit);
  return (
    <div className={`pl-quota${full ? " is-full" : ""}`}>
      <div className="pl-quota__head">
        <span>{label}</span>
        <span className="pl-quota__nums">{limit === null ? t.plans.noLimit(used) : t.plans.usedOf(used, limit)}</span>
      </div>
      <div className="pl-quota__bar"><span style={{ width: `${limit === null ? 0 : pct}%` }} /></div>
    </div>
  );
}

export default async function PlanPage() {
  const [ctx, { locale, t }] = await Promise.all([getCtxOrLogin("/settings/plan"), getT()]);
  const ws = ctx.workspace;
  const [q, usage, members] = await Promise.all([quotaStatus(ws), usageSummary(ws.id, 30), listMembers(ws.id)]);
  const resets = fmtDate(q.resetsAt, locale, { day: "numeric", month: "long" });
  const mailto = (plan: string) => `mailto:${PLANS_CONTACT}?subject=${encodeURIComponent(t.plans.mailSubject(plan, ws.name))}`;

  return (
    <>
      <ActivityPing area="plans" organizationId={ws.id} />
      <SettingsHeading title={t.settings.sections.plan} lead={t.settings.leads.plan} />

      <Card>
        <CardHeader>
          <CardTitle>{ws.name}</CardTitle>
          <CardDescription>{t.plans.resets(q.planName, resets)}</CardDescription>
        </CardHeader>
        <CardContent className="pl-usage__grid">
          <Line label={t.plans.designMdThisMonth} used={q.designMd.used} limit={q.designMd.limit} t={t} />
          <Line label={t.plans.searchesThisMonth} used={q.searches.used} limit={q.searches.limit} t={t} />
          <Line label={t.plans.people} used={q.members.used} limit={q.members.limit} t={t} seats />
        </CardContent>
        {((q.members.limit !== null && q.members.used > q.members.limit) || q.pendingInvites > 0) && (
          <CardFooter className="flex-col items-start gap-1">
            {q.members.limit !== null && q.members.used > q.members.limit && (
              <p className="card-note">
                {t.plans.overSeatsBefore(q.members.used, q.planName, q.members.limit)}
                <Link href="/settings/members">{t.plans.overSeatsLink}</Link>{t.plans.overSeatsAfter}
              </p>
            )}
            {q.pendingInvites > 0 && <p className="card-note">{t.plans.pendingInvites(q.pendingInvites)}</p>}
          </CardFooter>
        )}
      </Card>

      <UsageCard usage={usage} images={Object.fromEntries(members.map((m) => [m.userId, m.image ?? null]))} />

      <div className="pl-plans">
        {PLANS.map((p) => {
          const current = p.key === q.plan;
          return (
            <Card key={p.key} className={`pl-plan${current ? " is-current" : ""}`}>
              <CardHeader>
                <CardTitle className="display pl-plan__name">{p.name}</CardTitle>
                {current && <CardAction><span className="pl-plan__badge">{t.plans.yourPlan}</span></CardAction>}
                <CardDescription className="pl-plan__tagline">{t.plans.items[p.key].tagline}</CardDescription>
              </CardHeader>
              <CardContent className="pl-plan__body">
                <div className="pl-plan__price">
                  {p.priceEur === 0
                    ? <span className="display pl-plan__amount">{t.plans.free}</span>
                    : <><span className="display pl-plan__amount">{p.priceEur} €</span><span className="pl-plan__per">{t.plans.perMonth}</span></>}
                </div>
                <Separator />
                <ul className="pl-plan__features">
                  {t.plans.items[p.key].features.map((f) => <li key={f}><span className="pl-plan__tick">{IcCheck}</span><span>{f}</span></li>)}
                </ul>
              </CardContent>
              <CardFooter>
                {current
                  ? <span className={buttonVariants({ variant: "ghost", block: true })} aria-disabled>{t.plans.current}</span>
                  : <a className={buttonVariants({ variant: p.priceEur > 0 ? "primary" : "ghost", block: true })} href={mailto(p.name)}>
                      {p.priceEur > 0 ? t.plans.moveUp(p.name) : t.plans.moveDown(p.name)}
                    </a>}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <p className="pl-foot">{t.plans.foot}</p>
    </>
  );
}
