"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { declinePlanRequest, setAccountPlan, setRequestedPlan } from "@/app/actions/plans-admin";
import type { AccountPlan, OpenPlanRequest } from "@/lib/plan-requests";
import { isPaid, planOf, PLANS, type PlanKey } from "@/lib/plans";
import { useT } from "@/components/I18nProvider";
import { fmtGiftDay, timeAgo } from "@/lib/i18n/format";
import { Button, EmptyState, SettingsWindow } from "@/components/criterio";
import { useConfirm } from "@/components/useConfirm";

/** /admin/plans: the plans accounts asked for, oldest first, each set or declined by hand; then every account's plan */
export default function PlansPanel({ requests, accounts }: { requests: OpenPlanRequest[]; accounts: AccountPlan[] }) {
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
      <AccountsWindow accounts={accounts} />
    </div>
  );
}

const SHOWN = 25;

/** The day a plan ends, as the date field writes it, at the moment setAccountPlan stores (the end of that day, UTC) */
const endOf = (day: string) => new Date(`${day}T23:59:59Z`);

/** Every account and its plan, each changed in its own row, with an optional last day */
function AccountsWindow({ accounts }: { accounts: AccountPlan[] }) {
  const { locale, t } = useT();
  const a = t.admin.accounts;
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<{ id: string; plan: PlanKey; until: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const name = (k: PlanKey) => t.plans.items[k].name;
  const needle = q.trim().toLowerCase();
  const shown = accounts.filter((r) => !needle || [r.name, r.ownerEmail, ...r.workspaces].some((v) => v?.toLowerCase().includes(needle)));
  const visible = showAll ? shown : shown.slice(0, SHOWN);
  const paid = accounts.filter((r) => isPaid(planOf(r.plan))).length;

  const save = async (r: AccountPlan) => {
    if (!editing) return;
    const until = editing.plan !== "free" && editing.until ? editing.until : null;
    if (!(await confirm({ title: a.confirm(r.name, name(editing.plan), until ? fmtGiftDay(endOf(until), locale) : null), action: a.save }))) return;
    setBusy(true); setMsg(null);
    const res = await setAccountPlan(r.id, editing.plan, until).catch(() => null);
    setBusy(false);
    if (!res?.ok) { setMsg({ text: res?.error ?? a.failed, error: true }); return; }
    setEditing(null);
    setMsg({ text: a.done(r.name, name(editing.plan)) });
    router.refresh();
  };

  const note = msg ? <span className={msg.error ? "cr-field-hint is-error" : undefined} role={msg.error ? "alert" : "status"}>{msg.text}</span> : a.hint;
  return (
    <SettingsWindow title={a.title} figure={accounts.length || undefined} description={accounts.length ? a.meta(paid, accounts.length) : undefined} note={note}>
      {confirmDialog}
      {accounts.length === 0 ? <EmptyState title={t.admin.nothingYet}>{a.empty}</EmptyState> : (
        <>
          <div className="ad-tools">
            <input type="search" className="cr-input cr-input-s ad-tools__search" placeholder={a.search} aria-label={a.search}
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {shown.length === 0 ? <p className="ad-muted t-small">{a.noMatch}</p> : (
            <div className="ad-table-wrap">
              <table className="ad-table t-small">
                <thead>
                  <tr>
                    <th>{a.thAccount}</th>
                    <th>{a.thWorkspaces}</th>
                    <th>{a.thPlan}</th>
                    <th className="ad-keep"><span className="cr-visually-hidden">{a.change}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const edit = editing?.id === r.id ? editing : null;
                    return (
                      <tr key={r.id}>
                        <td>
                          <span className="list__main">
                            <span className="list__name t-ui"><span className="list__text" title={r.name}>{r.name}</span></span>
                            <span className="list__sub t-small">{r.ownerEmail ?? a.noOwner}</span>
                          </span>
                        </td>
                        <td className="ad-cell-trunc" title={r.workspaces.join(", ")}>{r.workspaces.join(", ")}</td>
                        <td>
                          {edit ? (
                            <span className="ad-plan-edit">
                              <select className="cr-input cr-input-s" aria-label={a.planOf(r.name)} value={edit.plan}
                                onChange={(e) => setEditing({ ...edit, plan: e.target.value as PlanKey })} disabled={busy}>
                                {PLANS.map((p) => <option key={p.key} value={p.key}>{name(p.key)}</option>)}
                              </select>
                              {edit.plan !== "free" && (
                                <input type="date" className="cr-input cr-input-s" aria-label={a.untilOf(r.name)} value={edit.until}
                                  onChange={(e) => setEditing({ ...edit, until: e.target.value })} disabled={busy} />
                              )}
                            </span>
                          ) : (
                            <>{name(r.plan)}{r.until && <span className="ad-muted"> {a.until(fmtGiftDay(new Date(r.until), locale))}</span>}</>
                          )}
                        </td>
                        <td className="ad-keep">
                          <span className="ad-actions">
                            {edit ? (
                              <>
                                <Button variant="quiet" size="s" onClick={() => setEditing(null)} disabled={busy}>{a.cancel}</Button>
                                <Button size="s" onClick={() => void save(r)} disabled={busy}>{a.save}</Button>
                              </>
                            ) : (
                              <Button variant="quiet" size="s" disabled={busy}
                                onClick={() => { setMsg(null); setEditing({ id: r.id, plan: r.plan, until: r.until?.slice(0, 10) ?? "" }); }}>{a.change}</Button>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {shown.length > SHOWN && (
            <Button variant="quiet" size="s" className="list__more" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
              {showAll ? t.admin.seeLess : t.admin.seeAll(shown.length)}
            </Button>
          )}
        </>
      )}
    </SettingsWindow>
  );
}
