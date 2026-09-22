import type { Metadata } from "next";
import Link from "next/link";
import BackLink from "@/components/BackLink";
import ActivityPing from "@/components/ActivityPing";
import { redirect } from "next/navigation";
import { getCtx, HttpError } from "@/lib/workspace";
import { quotaStatus } from "@/lib/quota";
import { PLANS, PLANS_CONTACT } from "@/lib/plans";
import { getT, fmtDate, type Dict } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.plans.title };
}

const IcCheck = (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l2.5 2.5L10 3.5" /></svg>
);

function Line({ label, used, limit, t }: { label: string; used: number; limit: number | null; t: Dict }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const full = limit !== null && used >= limit;
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

export default async function PlanesPage() {
  let ctx;
  try { ctx = await getCtx(); } catch (e) { if (e instanceof HttpError) redirect("/login"); throw e; }
  const ws = ctx.workspace;
  const q = await quotaStatus(ws);
  const { locale, t } = await getT();
  const resets = fmtDate(q.resetsAt, locale, { day: "numeric", month: "long" });
  const mailto = (plan: string) => `mailto:${PLANS_CONTACT}?subject=${encodeURIComponent(t.plans.mailSubject(plan, ws.name))}`;

  return (
    <div className="page pl">
      <ActivityPing area="planes" organizationId={ws.id} />
      <div className="pl-bar">
        <BackLink />
      </div>

      <header className="pl-head">
        <h1 className="display pl-title">{t.plans.title}</h1>
        <p className="pl-lead">{t.plans.lead}</p>
      </header>

      <section className="pl-usage">
        <div className="pl-usage__head">
          <span className="pl-usage__title">{ws.name}</span>
          <span className="pl-usage__meta">{t.plans.resets(q.planName, resets)}</span>
        </div>
        <div className="pl-usage__grid">
          <Line label={t.plans.designMdThisMonth} used={q.designMd.used} limit={q.designMd.limit} t={t} />
          <Line label={t.plans.searchesThisMonth} used={q.searches.used} limit={q.searches.limit} t={t} />
          <Line label={t.plans.people} used={q.members.used} limit={q.members.limit} t={t} />
        </div>
        {q.members.limit !== null && q.members.used > q.members.limit && (
          <p className="pl-usage__meta">
            {t.plans.overSeatsBefore(q.members.used, q.planName, q.members.limit)}
            <Link href="/equipo">{t.plans.overSeatsLink}</Link>{t.plans.overSeatsAfter}
          </p>
        )}
        {q.pendingInvites > 0 && (
          <p className="pl-usage__meta">
            {t.plans.pendingInvites(q.pendingInvites)}
          </p>
        )}
      </section>

      <div className="pl-plans">
        {PLANS.map((p) => {
          const current = p.key === q.plan;
          return (
            <section key={p.key} className={`pl-plan${current ? " is-current" : ""}`}>
              <div className="pl-plan__head">
                <span className="display pl-plan__name">{p.name}</span>
                {current && <span className="pl-plan__badge">{t.plans.yourPlan}</span>}
              </div>
              <div className="pl-plan__price">
                {p.priceEur === 0
                  ? <span className="display pl-plan__amount">{t.plans.free}</span>
                  : <><span className="display pl-plan__amount">{p.priceEur} €</span><span className="pl-plan__per">{t.plans.perMonth}</span></>}
              </div>
              <p className="pl-plan__tagline">{t.plans.items[p.key].tagline}</p>
              <ul className="pl-plan__features">
                {t.plans.items[p.key].features.map((f) => <li key={f}><span className="pl-plan__tick">{IcCheck}</span><span>{f}</span></li>)}
              </ul>
              {current
                ? <span className="btn btn--ghost btn--block pl-plan__cta" aria-disabled>{t.plans.current}</span>
                : <a className={`btn btn--block pl-plan__cta${p.priceEur > 0 ? " btn--primary" : " btn--ghost"}`} href={mailto(p.name)}>
                    {p.priceEur > 0 ? t.plans.moveUp(p.name) : t.plans.moveDown(p.name)}
                  </a>}
            </section>
          );
        })}
      </div>

      <p className="pl-foot">{t.plans.foot}</p>
    </div>
  );
}
