"use client";

import { conversion, FUNNEL_STEPS, type FunnelCounts, type FunnelStep } from "@/lib/funnel-core";
import type { FunnelOverview } from "@/lib/funnel";
import { useT } from "@/components/I18nProvider";
import { fmtDate } from "@/lib/i18n/format";
import { EmptyState, SettingsWindow } from "@/components/criterio";
import { Kpis } from "./AdminPanel";

const pct = (share: number) => Math.round(share * 100);

/** A step's count, with the share of the step before in muted text when anybody reached it, as in Waves */
function Count({ counts, step }: { counts: FunnelCounts; step: FunnelStep }) {
  const share = conversion(counts, step);
  return <>{counts[step]}{share !== null && counts[step] > 0 && <span className="ad-muted"> {pct(share)}%</span>}</>;
}

/** /admin/funnel: the period's sign-ups step by step, each week's cohort, and the waitlist since it opened */
export default function FunnelPanel({ days, funnel, waitlist }: FunnelOverview) {
  const { locale, t } = useT();
  const f = t.admin.funnel;
  const { total, weeks } = funnel;
  const w = waitlist;
  const of = (n: number, before: number) => (before ? f.ofBefore(pct(n / before)) : undefined);

  return (
    <div className="page__body">
      <SettingsWindow title={f.pathTitle} note={f.pathHint}>
        <Kpis cells={FUNNEL_STEPS.map((step) => {
          const share = conversion(total, step);
          return { label: f.steps[step], value: total[step], note: step === "signedUp" ? f.inWeeks(days) : share === null ? undefined : f.ofBefore(pct(share)) };
        })} />
      </SettingsWindow>

      <SettingsWindow title={f.weeksTitle} note={total.signedUp ? f.weeksHint : undefined}>
        {total.signedUp === 0 ? <EmptyState title={t.admin.nothingYet}>{f.noSignups(days)}</EmptyState> : (
          <div className="ad-table-wrap">
            <table className="ad-table t-small">
              <thead>
                <tr>
                  <th>{f.thWeek}</th>
                  {FUNNEL_STEPS.map((step) => <th key={step} className={`ad-num${step === "signedUp" || step === "paid" ? " ad-keep" : ""}`}>{f.steps[step]}</th>)}
                </tr>
              </thead>
              <tbody>
                {weeks.map((row) => (
                  <tr key={row.week}>
                    <td>{fmtDate(`${row.week}T12:00:00Z`, locale, { day: "numeric", month: "short" })}</td>
                    {FUNNEL_STEPS.map((step) => (
                      <td key={step} className={`ad-num${step === "signedUp" || step === "paid" ? " ad-keep" : ""}`}><Count counts={row.counts} step={step} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SettingsWindow>

      <SettingsWindow title={f.waitlistTitle} note={f.waitlistHint}>
        <Kpis cells={[
          { label: f.waitlistSteps.listed, value: w.listed },
          { label: f.waitlistSteps.invited, value: w.invited, note: of(w.invited, w.listed) },
          { label: f.waitlistSteps.joined, value: w.joined, note: of(w.joined, w.invited) },
        ]} />
      </SettingsWindow>
    </div>
  );
}
