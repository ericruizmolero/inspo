"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeLooseInvite, previewWave, resendInvite, revokeTeamInvite, sendWave, setWaitlistPriority } from "@/app/actions/waitlist-admin";
import type { TeamInvite, WaitlistRow, WaveMetric } from "@/lib/waves";
import { WAITLIST_STATUSES, type WaitlistStatus } from "@/lib/db/schema";
import { PLANS, type PlanKey } from "@/lib/plans";
import { useT } from "@/components/I18nProvider";
import { fmtDate } from "@/lib/i18n/format";
import { Button, Checkbox, Chip, EmptyState, FieldRow, IconButton, SegmentedControl, SettingsWindow, Switch } from "@/components/criterio";
import { useConfirm } from "@/components/useConfirm";

const SHOWN = 50;
const GIFTS = PLANS.filter((p) => p.key !== "free").map((p) => p.key);

/** /admin/waitlist: how each wave did, who is waiting, the next wave, the invites the team made, and a loose link */
export default function WaitlistPanel({ waitlist, invites, waves }: { waitlist: WaitlistRow[]; invites: TeamInvite[]; waves: WaveMetric[] }) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  return (
    <div className="page__body">
      <WavesWindow waves={waves} />
      <ListWindow rows={waitlist} picked={picked} onPicked={setPicked} />
      <WaveWindow picked={[...picked]} onSent={() => setPicked(new Set())} />
      <InvitesWindow invites={invites} />
      <LooseWindow />
    </div>
  );
}

function Count({ n, of }: { n: number; of: number }) {
  return <>{n}{n > 0 && of > 0 && <span className="ad-muted"> {Math.round((n / of) * 100)}%</span>}</>;
}

function WavesWindow({ waves }: { waves: WaveMetric[] }) {
  const { locale, t } = useT();
  const w = t.admin.waitlist;
  return (
    <SettingsWindow title={w.wavesTitle} note={waves.length ? w.wavesHint : undefined}>
      {waves.length === 0 ? <EmptyState title={t.admin.nothingYet}>{w.noWaves}</EmptyState> : (
        <div className="ad-table-wrap">
          <table className="ad-table t-small">
            <thead>
              <tr>
                <th>{w.thWave}</th>
                <th className="ad-num">{w.thInvited}</th>
                <th className="ad-num">{w.thEntered}</th>
                <th className="ad-num">{w.thActivated}</th>
                <th className="ad-num ad-keep">{w.thPaying}</th>
              </tr>
            </thead>
            <tbody>
              {waves.map((r) => (
                <tr key={r.wave ?? ""}>
                  <td>
                    <span className="list__main">
                      <span className="list__name t-ui"><span className="list__text">{r.wave ?? w.loose}</span></span>
                      <span className="list__sub t-small">{fmtDate(r.since, locale)}</span>
                    </span>
                  </td>
                  <td className="ad-num">{r.invited}</td>
                  <td className="ad-num"><Count n={r.entered} of={r.invited} /></td>
                  <td className="ad-num"><Count n={r.activated} of={r.invited} /></td>
                  <td className="ad-num ad-keep"><Count n={r.paying} of={r.invited} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SettingsWindow>
  );
}

type Filter = "all" | WaitlistStatus;
const FILTERS: Filter[] = ["all", ...WAITLIST_STATUSES];

function ListWindow({ rows, picked, onPicked }: { rows: WaitlistRow[]; picked: Set<string>; onPicked: (s: Set<string>) => void }) {
  const { locale, t } = useT();
  const w = t.admin.waitlist;
  const [filter, setFilter] = useState<Filter>("pending");
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (filter === "all" || r.status === filter)
    && (!needle || [r.email, r.name, r.note].some((v) => v?.toLowerCase().includes(needle))));
  const visible = showAll ? shown : shown.slice(0, SHOWN);
  const waiting = rows.filter((r) => r.status === "pending").length;
  const toggle = (id: string, on: boolean) => {
    const next = new Set(picked);
    if (on) next.add(id); else next.delete(id);
    onPicked(next);
  };

  return (
    <SettingsWindow title={w.listTitle} figure={rows.length} description={rows.length ? w.listMeta(waiting, rows.length) : undefined}
      note={error ? <span className="cr-field-hint is-error" role="alert">{error}</span> : rows.length ? w.listHint : undefined}>
      {rows.length === 0 ? <EmptyState title={t.admin.nothingYet}>{w.empty}</EmptyState> : (
        <>
          <div className="ad-tools">
            <SegmentedControl tone="paper" size="s" label={w.filter} active={FILTERS.indexOf(filter)} onChange={(i) => setFilter(FILTERS[i])}
              items={FILTERS.map((f) => ({ label: w.status[f], count: f === "all" ? rows.length : rows.filter((r) => r.status === f).length }))} />
            <input type="search" className="cr-input cr-input-s ad-tools__search" placeholder={w.search} aria-label={w.search}
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {shown.length === 0 ? <p className="ad-muted t-small">{w.noMatch}</p> : (
            <div className="ad-table-wrap">
              <table className="ad-table t-small">
                <thead>
                  <tr>
                    <th><span className="cr-visually-hidden">{w.thPick}</span></th>
                    <th>{t.admin.thPerson}</th>
                    <th>{w.thStatus}</th>
                    <th>{w.thPriority}</th>
                    <th>{w.thRole}</th>
                    <th>{w.thTeam}</th>
                    <th>{w.thNote}</th>
                    <th>{w.thSource}</th>
                    <th>{w.thDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td className="ad-pick">
                        <Checkbox label={<span className="cr-visually-hidden">{w.pick(r.email)}</span>} checked={picked.has(r.id)}
                          disabled={r.status !== "pending"} onChange={(on) => toggle(r.id, on)} />
                      </td>
                      <td>
                        <span className="list__main">
                          <span className="list__name t-ui"><span className="list__text" title={r.email}>{r.email}</span></span>
                          {r.name && <span className="list__sub t-small">{r.name}</span>}
                        </span>
                      </td>
                      <td>{r.status === "invited" && r.wave ? <span data-tip={r.wave}>{w.status.invited}</span> : w.status[r.status]}</td>
                      <td><Priority row={r} onError={setError} /></td>
                      <td className="ad-cell-trunc" title={r.role ?? undefined}>{r.role ?? ""}</td>
                      <td>{r.teamSize ?? ""}</td>
                      <td className="ad-cell-trunc" title={r.note ?? undefined}>{r.note ?? ""}</td>
                      <td className="ad-cell-trunc">{r.source}</td>
                      <td>{fmtDate(r.createdAt, locale)}</td>
                    </tr>
                  ))}
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

/** Saved on blur or Enter, when it changed */
function Priority({ row, onError }: { row: WaitlistRow; onError: (e: string) => void }) {
  const { t } = useT();
  const router = useRouter();
  const [value, setValue] = useState(String(row.priority));
  const [saved, setSaved] = useState(row.priority);
  const save = async () => {
    const n = Number(value);
    if (!Number.isInteger(n)) { setValue(String(saved)); return; }
    if (n === saved) return;
    onError("");
    const r = await setWaitlistPriority(row.id, n).catch(() => null);
    if (!r?.ok) { onError(r?.error ?? t.admin.waitlist.priorityFailed); setValue(String(saved)); return; }
    setSaved(n);
    router.refresh();
  };
  return (
    <input type="number" step={1} className="cr-input cr-input-s ad-priority" aria-label={t.admin.waitlist.priorityOf(row.email)}
      value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => void save()}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
  );
}

type Sent = { entryId: string; email: string; status: "sent" | "failed" | "skipped" };
type Step =
  | { at: "compose" }
  | { at: "preview"; rows: WaitlistRow[] }
  | { at: "sending"; rows: WaitlistRow[] }
  | { at: "done"; results: Sent[] };

function WaveWindow({ picked, onSent }: { picked: string[]; onSent: () => void }) {
  const { t } = useT();
  const w = t.admin.waitlist;
  const router = useRouter();
  const [step, setStep] = useState<Step>({ at: "compose" });
  const [chosen, setChosen] = useState<"picked" | "next" | null>(null);
  const mode = chosen ?? (picked.length ? "picked" : "next");
  const [n, setN] = useState("20");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<PlanKey | "">("");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const preview = async () => {
    setBusy(true); setError("");
    const r = await previewWave(mode === "picked" ? { ids: picked } : { next: Number(n) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(r?.error ?? w.waveFailed); return; }
    setStep({ at: "preview", rows: r.data });
  };
  const send = async (rows: WaitlistRow[]) => {
    setStep({ at: "sending", rows }); setError("");
    const r = await sendWave(rows.map((x) => x.id), { wave: name, grantsPlan: plan || null, grantsUntil: plan && until ? until : null }).catch(() => null);
    if (!r?.ok) { setError(r?.error ?? w.waveFailed); setStep({ at: "preview", rows }); return; }
    setStep({ at: "done", results: r.data.map((x) => ({ ...x, email: x.email ?? rows.find((row) => row.id === x.entryId)?.email ?? "" })) });
    onSent();
    router.refresh();
  };
  const reset = () => { setStep({ at: "compose" }); setName(""); setPlan(""); setUntil(""); setChosen(null); };
  const errorNote = error ? <span className="cr-field-hint is-error" role="alert">{error}</span> : undefined;
  const count = mode === "picked" ? picked.length : Number(n);
  const ready = name.trim() && Number.isInteger(count) && count >= 1 && count <= 50;

  if (step.at === "done") {
    const sent = step.results.filter((r) => r.status === "sent").length, failed = step.results.filter((r) => r.status === "failed").length;
    return (
      <SettingsWindow title={w.waveTitle} description={w.result(sent, failed)} note={failed ? w.resultFailedHint : undefined}
        actions={<Button size="s" onClick={reset}>{w.newWave}</Button>}>
        <ul className="list">
          {step.results.map((r) => (
            <li key={r.entryId} className="list__row">
              <span className="list__main"><span className="list__name t-ui"><span className="list__text">{r.email}</span></span></span>
              <Chip className="t-label" tone={r.status === "sent" ? "moss" : r.status === "failed" ? "ember" : "paper"}>{w.resultStatus[r.status]}</Chip>
            </li>
          ))}
        </ul>
      </SettingsWindow>
    );
  }

  if (step.at !== "compose") {
    const sending = step.at === "sending";
    return (
      <SettingsWindow title={w.waveTitle} description={sending ? w.sending(step.rows.length) : step.rows.length ? w.previewMeta(step.rows.length) : w.previewNone}
        note={errorNote}
        actions={<>
          <Button size="s" onClick={() => setStep({ at: "compose" })} disabled={sending}>{w.back}</Button>
          {step.rows.length > 0 && <Button variant="primary" size="s" onClick={() => void send(step.rows)} disabled={sending}>{w.send(step.rows.length)}</Button>}
        </>}>
        {step.rows.length > 0 && (
          <ul className="list">
            {step.rows.map((r) => (
              <li key={r.id} className="list__row">
                <span className="list__main">
                  <span className="list__name t-ui"><span className="list__text">{r.email}</span></span>
                  <span className="list__sub t-small">{[r.name, r.role, r.teamSize, r.locale.toUpperCase()].filter(Boolean).map((x, i) => <span key={i}>{x}</span>)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SettingsWindow>
    );
  }

  return (
    <SettingsWindow title={w.waveTitle} description={w.waveDescription} note={errorNote}
      actions={<Button size="s" onClick={() => void preview()} disabled={busy || !ready}>{w.preview}</Button>}>
      <FieldRow label={w.who}>
        <SegmentedControl tone="paper" size="s" choice label={w.who} active={mode === "picked" ? 0 : 1}
          onChange={(i) => setChosen(i === 0 ? "picked" : "next")} items={[{ label: w.picked(picked.length) }, { label: w.next }]} />
      </FieldRow>
      {mode === "next" && (
        <FieldRow label={w.howMany} htmlFor="wave-n">
          <input id="wave-n" type="number" min={1} max={50} step={1} className="cr-input ad-priority" value={n} onChange={(e) => setN(e.target.value)} />
        </FieldRow>
      )}
      <FieldRow label={w.name} htmlFor="wave-name">
        <input id="wave-name" className="cr-input" maxLength={80} placeholder={w.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} />
      </FieldRow>
      <FieldRow label={w.plan} htmlFor="wave-plan">
        <select id="wave-plan" className="cr-input" value={plan} onChange={(e) => setPlan(e.target.value as PlanKey | "")}>
          <option value="">{w.planNone}</option>
          {GIFTS.map((k) => <option key={k} value={k}>{t.plans.items[k].name}</option>)}
        </select>
      </FieldRow>
      {plan && (
        <FieldRow label={w.until} htmlFor="wave-until">
          <input id="wave-until" type="date" className="cr-input" value={until} onChange={(e) => setUntil(e.target.value)} />
        </FieldRow>
      )}
    </SettingsWindow>
  );
}

type InviteState = "open" | "used" | "revoked" | "expired";
function stateOf(i: TeamInvite, now: number): InviteState {
  if (i.revokedAt) return "revoked";
  if (i.uses >= i.maxUses) return "used";
  if (i.expiresAt && new Date(i.expiresAt).getTime() <= now) return "expired";
  return "open";
}

function InvitesWindow({ invites }: { invites: TeamInvite[] }) {
  const { locale, t } = useT();
  const w = t.admin.waitlist;
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [now] = useState(() => Date.now());
  const visible = showAll ? invites : invites.slice(0, SHOWN);

  const act = async (i: TeamInvite, kind: "revoke" | "resend") => {
    const who = i.email ?? w.anyone;
    const ask = kind === "revoke" ? { title: w.revokeConfirm(who), action: w.revoke, danger: true } : { title: w.resendConfirm(who), action: w.resend };
    if (!(await confirm(ask))) return;
    setBusy(i.id); setMsg(null);
    if (kind === "revoke") {
      const r = await revokeTeamInvite(i.id).catch(() => null);
      if (!r?.ok) setMsg({ text: r?.error ?? w.actionFailed, error: true });
    } else {
      const r = await resendInvite(i.id).catch(() => null);
      if (!r?.ok) setMsg({ text: r?.error ?? w.actionFailed, error: true });
      else setMsg(r.data.mailed ? { text: w.resent(who) } : { text: w.resendNotMailed, error: true });
    }
    setBusy(null);
    router.refresh();
  };

  const note = msg ? <span className={msg.error ? "cr-field-hint is-error" : undefined} role={msg.error ? "alert" : "status"}>{msg.text}</span> : invites.length ? w.invitesHint : undefined;
  return (
    <SettingsWindow title={w.invitesTitle} figure={invites.length || undefined} note={note}>
      {confirmDialog}
      {invites.length === 0 ? <EmptyState title={t.admin.nothingYet}>{w.noInvites}</EmptyState> : (
        <div className="ad-table-wrap">
          <table className="ad-table t-small">
            <thead>
              <tr>
                <th>{w.thFor}</th>
                <th>{w.thStatus}</th>
                <th className="ad-num">{w.thUses}</th>
                <th>{w.thWave}</th>
                <th>{w.thPlan}</th>
                <th>{w.thMade}</th>
                <th className="ad-keep"><span className="cr-visually-hidden">{w.revoke}</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => {
                const state = stateOf(i, now);
                return (
                  <tr key={i.id}>
                    <td className="ad-cell-trunc" title={i.email ?? undefined}>{i.email ?? <span className="ad-muted">{w.anyone}</span>}</td>
                    <td>{state === "open" ? w.state.open : <span className="ad-muted">{w.state[state]}</span>}</td>
                    <td className="ad-num">{i.uses}/{i.maxUses}</td>
                    <td className="ad-cell-trunc">{i.wave ?? ""}</td>
                    <td>{i.grantsPlan ? t.plans.items[i.grantsPlan].name : ""}</td>
                    <td>{fmtDate(i.createdAt, locale)}</td>
                    <td className="ad-keep">
                      {state === "open" && (
                        <span className="ad-actions">
                          {i.email && i.uses === 0 && <Button variant="quiet" size="s" onClick={() => void act(i, "resend")} disabled={!!busy}>{w.resend}</Button>}
                          <Button variant="quiet" size="s" onClick={() => void act(i, "revoke")} disabled={!!busy}>{w.revoke}</Button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {invites.length > SHOWN && (
        <Button variant="quiet" size="s" className="list__more" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
          {showAll ? t.admin.seeLess : t.admin.seeAll(invites.length)}
        </Button>
      )}
    </SettingsWindow>
  );
}

function LooseWindow() {
  const { t } = useT();
  const w = t.admin.waitlist;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [uses, setUses] = useState("1");
  const [mail, setMail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [made, setMade] = useState<{ link: string; mailed: boolean; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const hasEmail = !!email.trim();

  const make = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setMade(null); setCopied(false);
    const to = email.trim();
    const r = await makeLooseInvite({ email: to || null, uses: Number(uses), mail: !!to && mail }).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(r?.error ?? w.makeFailed); return; }
    setMade({ ...r.data, email: to });
    setEmail(""); setUses("1");
    router.refresh();
  };
  const copy = async () => {
    if (!made) return;
    try { await navigator.clipboard.writeText(made.link); setCopied(true); } catch { /* no clipboard */ }
  };
  const note = made ? <span role="status">{made.mailed ? w.linkMailed(made.email) : made.email && mail ? w.linkNotMailed : w.linkOnce}</span> : undefined;

  return (
    <SettingsWindow title={w.looseTitle} description={w.looseDescription} note={note}
      actions={<Button size="s" type="submit" form="loose-invite" disabled={busy}>{w.make}</Button>}>
      <form id="loose-invite" onSubmit={make}>
        <FieldRow label={w.email} hint={w.emailHint} htmlFor="loose-email" error={error}>
          <input id="loose-email" type="email" className="cr-input" placeholder="name@studio.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FieldRow>
        <FieldRow label={w.uses} htmlFor="loose-uses">
          <input id="loose-uses" type="number" min={1} max={1000} step={1} className="cr-input ad-priority" value={uses} onChange={(e) => setUses(e.target.value)} />
        </FieldRow>
        <FieldRow label={w.mail} hint={hasEmail ? undefined : w.mailHint}>
          <Switch checked={hasEmail && mail} onChange={setMail} label={w.mail} disabled={!hasEmail} />
        </FieldRow>
      </form>
      {made && (
        <FieldRow label={w.link} htmlFor="loose-link"
          action={<IconButton icon={copied ? "check" : "copy"} variant="quiet" size="s" label={copied ? t.common.copied : t.common.copy} onClick={() => void copy()} />}>
          <input id="loose-link" className="cr-input ad-mono" readOnly value={made.link} onFocus={(e) => e.currentTarget.select()} />
        </FieldRow>
      )}
    </SettingsWindow>
  );
}
