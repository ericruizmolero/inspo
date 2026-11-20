"use client";
// The upgrade notice: the one place a plan's limit shows. Whatever reads a failure hands it to reportPlanLimit() first;
// if it is a plan's limit (lib/plan-limit.ts) the notice opens up top with the limit's message and a link to Settings,
// Plan naming the plan that lifts it, and the caller shows nothing of its own. Mounted once, in the root layout.
import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { planLimitOf, type PlanLimitError } from "@/lib/plan-limit";
import { useT } from "./I18nProvider";
import Toast from "./Toast";

let shown: PlanLimitError | null = null;
const listeners = new Set<() => void>();
const set = (next: PlanLimitError | null) => { shown = next; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Shows the notice if `failure` is a plan's limit (a PlanLimitError, or a failure's body), and says whether it was */
export function reportPlanLimit(failure: unknown): boolean {
  const limit = planLimitOf(failure);
  if (limit) set(limit);
  return !!limit;
}

export default function PlanLimitNotice() {
  const { t } = useT();
  const limit = useSyncExternalStore(subscribe, () => shown, () => null);
  // Longer than an error toast: there is a link to read and follow
  useEffect(() => {
    if (!limit) return;
    const id = setTimeout(() => set(null), 12000);
    return () => clearTimeout(id);
  }, [limit]);
  if (!limit) return null;
  const href = limit.upgrade ? `/settings/plan#plan-${limit.upgrade}` : "/settings/plan";
  return (
    <Toast toast={{ title: t.quota.limitTitle, detail: limit.message }} onClose={() => set(null)}
      action={<Link href={href} className="toast__action" onClick={() => set(null)}>
        {limit.upgrade ? t.plans.moveUpTo(t.plans.items[limit.upgrade].name) : t.plans.seePlans}
      </Link>} />
  );
}
