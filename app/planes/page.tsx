import type { Metadata } from "next";
import BackLink from "@/components/BackLink";
import ActivityPing from "@/components/ActivityPing";
import { redirect } from "next/navigation";
import { getCtx, HttpError } from "@/lib/workspace";
import { quotaStatus } from "@/lib/quota";
import { PLANS, PLANS_CONTACT } from "@/lib/plans";

export const metadata: Metadata = { title: "Planes" };
export const dynamic = "force-dynamic";

const IcCheck = (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l2.5 2.5L10 3.5" /></svg>
);

function Line({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const full = limit !== null && used >= limit;
  return (
    <div className={`pl-quota${full ? " is-full" : ""}`}>
      <div className="pl-quota__head">
        <span>{label}</span>
        <span className="pl-quota__nums">{limit === null ? `${used} · sin límite` : `${used} de ${limit}`}</span>
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
  const resets = new Date(q.resetsAt).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  const mailto = (plan: string) => `mailto:${PLANS_CONTACT}?subject=${encodeURIComponent(`Inspo · plan ${plan} para ${ws.name}`)}`;

  return (
    <div className="page pl">
      <ActivityPing area="planes" organizationId={ws.id} />
      <div className="pl-bar">
        <BackLink />
      </div>

      <header className="pl-head">
        <h1 className="display pl-title">Planes</h1>
        <p className="pl-lead">Un precio por workspace, sin sorpresas. Cambia cuando quieras.</p>
      </header>

      <section className="pl-usage">
        <div className="pl-usage__head">
          <span className="pl-usage__title">{ws.name}</span>
          <span className="pl-usage__meta">Plan {q.planName} · el contador vuelve a cero el {resets}</span>
        </div>
        <div className="pl-usage__grid">
          <Line label="DESIGN.md este mes" used={q.designMd.used} limit={q.designMd.limit} />
          <Line label="Búsquedas IA este mes" used={q.searches.used} limit={q.searches.limit} />
          <Line label="Personas" used={q.members.used} limit={q.members.limit} />
        </div>
      </section>

      <div className="pl-plans">
        {PLANS.map((p) => {
          const current = p.key === q.plan;
          return (
            <section key={p.key} className={`pl-plan${current ? " is-current" : ""}`}>
              <div className="pl-plan__head">
                <span className="display pl-plan__name">{p.name}</span>
                {current && <span className="pl-plan__badge">Tu plan</span>}
              </div>
              <div className="pl-plan__price">
                {p.priceEur === 0
                  ? <span className="display pl-plan__amount">Gratis</span>
                  : <><span className="display pl-plan__amount">{p.priceEur} €</span><span className="pl-plan__per">al mes</span></>}
              </div>
              <p className="pl-plan__tagline">{p.tagline}</p>
              <ul className="pl-plan__features">
                {p.features.map((f) => <li key={f}><span className="pl-plan__tick">{IcCheck}</span><span>{f}</span></li>)}
              </ul>
              {current
                ? <span className="btn btn--ghost btn--block pl-plan__cta" aria-disabled>Es tu plan actual</span>
                : <a className={`btn btn--block pl-plan__cta${p.priceEur > 0 ? " btn--primary" : " btn--ghost"}`} href={mailto(p.name)}>
                    {p.priceEur > 0 ? `Pasar a ${p.name}` : `Bajar a ${p.name}`}
                  </a>}
            </section>
          );
        })}
      </div>

      <p className="pl-foot">
        Todavía no hay pago en la web: al pedir un plan te escribimos y lo activamos en el día. Precios sin IVA.
      </p>
    </div>
  );
}
