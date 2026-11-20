"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { declinePlanRequest, setRequestedPlan } from "@/app/actions/plans-admin";
import type { OpenPlanRequest } from "@/lib/plan-requests";
import { useT } from "@/components/I18nProvider";
import { timeAgo } from "@/lib/i18n/format";
import { Button, EmptyState, SettingsWindow } from "@/components/criterio";
import { useConfirm } from "@/components/useConfirm";

/** /admin/plans: the plans accounts asked for, oldest first, each set or declined by hand */
export default function PlansPanel({ requests }: { requests: OpenPlanRequest[] }) {
  const { locale, t } = useT();
  const p = t.admin.plans;
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const name = (k: OpenPlanRequest["plan"]) => t.plans.items[k].name;

  const act = async (r: OpenPlanRequest, kind: "set" | "decline") => {
    const ask = kind === "set"
      ? { title: p.setConfirm(r.accountName, name(r.plan), t.plans.periodWord[r.period]), action: p.setPlan }
      : { title: p.declineConfirm(r.accountName, name(r.plan)), action: p.decline, danger: true };
    if (!(await confirm(ask))) return;
    setBusy(r.id); setMsg(null);
    const res = await (kind === "set" ? setRequestedPlan(r.id) : declinePlanRequest(r.id)).catch(() => null);
    setMsg(!res?.ok ? { text: res?.error ?? p.failed, error: true } : { text: kind === "set" ? p.set(r.accountName, name(r.plan)) : p.declined(r.accountName) });
    setBusy(null);
    router.refresh();
  };

  const note = msg ? <span className={msg.error ? "cr-field-hint is-error" : undefined} role={msg.error ? "alert" : "status"}>{msg.text}</span> : requests.length ? p.hint : undefined;
  return (
    <div className="page__body">
      <SettingsWindow title={p.title} figure={requests.length || undefined} note={note}>
        {confirmDialog}
        {requests.length === 0 ? <EmptyState title={t.admin.nothingYet}>{p.empty}</EmptyState> : (
          <div className="ad-table-wrap">
            <table className="ad-table t-small">
              <thead>
                <tr>
                  <th>{p.thAccount}</th>
                  <th>{p.thWorkspaces}</th>
                  <th>{p.thNow}</th>
                  <th className="ad-keep">{p.thAsks}</th>
                  <th>{p.thAge}</th>
                  <th className="ad-keep"><span className="cr-visually-hidden">{p.setPlan}</span></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="list__main">
                        <span className="list__name t-ui"><span className="list__text" title={r.accountName}>{r.accountName}</span></span>
                        {r.ownerEmail && <span className="list__sub t-small">{r.ownerEmail}</span>}
                      </span>
                    </td>
                    <td className="ad-cell-trunc" title={r.workspaces.join(", ")}>{r.workspaces.join(", ")}</td>
                    <td>{name(r.now)}</td>
                    <td className="ad-keep">{name(r.plan)} <span className="ad-muted">{t.plans.periodWord[r.period]}</span></td>
                    <td>{timeAgo(r.createdAt, locale, t)}</td>
                    <td className="ad-keep">
                      <span className="ad-actions">
                        <Button variant="quiet" size="s" onClick={() => void act(r, "decline")} disabled={!!busy}>{p.decline}</Button>
                        <Button size="s" onClick={() => void act(r, "set")} disabled={!!busy}>{p.setPlan}</Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SettingsWindow>
    </div>
  );
}
