"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestPlan } from "@/app/actions/billing";
import { PLANS, type PlanKey } from "@/lib/plans";
import { PLAN_PERIODS, type PlanPeriod } from "@/lib/db/schema";
import type { PendingPlan } from "@/lib/plan-requests";
import { fmtPrice } from "@/lib/i18n/format";
import { useT } from "@/components/I18nProvider";
import { Button, Icon, SegmentedControl, SettingsWindow } from "@/components/criterio";

/**
 * Settings, Plan: the four plans side by side, the account's marked. Its owner asks for any plan above, monthly or
 * yearly; anyone else is told who pays. There is no payment on the site: a partner switches it on (/admin/plans).
 */
export default function PlanChoice({ current, owner, payer, pending }: {
  current: PlanKey;
  /** The person signed in pays for this plan: only they can ask for another */
  owner: boolean;
  /** Who pays, for everyone else: a name or an email */
  payer: string | null;
  /** The account's open request, if there is one */
  pending: PendingPlan | null;
}) {
  const { locale, t } = useT();
  const p = t.plans;
  const router = useRouter();
  const [period, setPeriod] = useState<PlanPeriod>(pending?.period ?? "month");
  const [busy, setBusy] = useState<PlanKey | null>(null);
  const [error, setError] = useState("");
  const rank = PLANS.findIndex((x) => x.key === current);

  const ask = async (plan: PlanKey) => {
    setBusy(plan); setError("");
    const r = await requestPlan(plan, period).catch(() => null);
    setBusy(null);
    if (!r?.ok) { setError(r?.error ?? p.requestFailed); return; }
    router.refresh();
  };

  const note = error ? <span className="cr-field-hint is-error" role="alert">{error}</span>
    : pending ? <span role="status">{p.requested(p.items[pending.plan].name, p.periodWord[pending.period])}</span>
    : p.foot;

  return (
    <SettingsWindow title={p.plansTitle} description={!owner && payer ? p.askOwner(payer) : undefined} note={note}
      actions={owner && rank < PLANS.length - 1 ? (
        <SegmentedControl tone="paper" size="s" choice label={p.pay} active={PLAN_PERIODS.indexOf(period)}
          onChange={(i) => setPeriod(PLAN_PERIODS[i])} items={PLAN_PERIODS.map((k) => ({ label: p.periods[k] }))} />
      ) : undefined}>
      <ul className="pl-plans">
        {PLANS.map((plan, i) => {
          const text = p.items[plan.key];
          const asked = pending?.plan === plan.key;
          return (
            <li key={plan.key} id={`plan-${plan.key}`} className={`pl-plan${plan.key === current ? " is-current" : ""}`}>
              <div className="pl-plan__head">
                <h3 className="pl-plan__name t-title-s">{text.name}</h3>
                {plan.key === current && <span className="pl-plan__mark t-small">{p.yourPlan}</span>}
              </div>
              <p className="pl-plan__tagline t-small">{text.tagline}</p>
              <p className="pl-plan__price">
                <span className="t-title-s">{fmtPrice(plan.price.month, locale)}</span>
                <span className="t-small"> {plan.price.month ? p.perMonth : p.forGood}</span>
              </p>
              <p className="pl-plan__year t-small">{plan.price.year ? p.orYearly(fmtPrice(plan.price.year, locale)) : " "}</p>
              <ul className="pl-plan__features t-small">
                {text.features.map((f) => <li key={f}><Icon name="check" size={14} />{f}</li>)}
              </ul>
              {owner && i > rank && (
                <Button size="s" className="pl-plan__ask" pressed={asked && pending?.period === period} disabled={!!busy}
                  onClick={() => void ask(plan.key)}>{p.request(text.name)}</Button>
              )}
            </li>
          );
        })}
      </ul>
    </SettingsWindow>
  );
}
