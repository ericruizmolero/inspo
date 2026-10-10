"use client";

import { grantAccess, revokeAccess, deleteFeedback, resolveFeedback, setSignupMode } from "@/app/actions/admin";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AreaThumb from "./AreaThumb";
import { type ActivityOverview, type ActivityDay, type AdminEntry } from "@/lib/activity-core";
import { type UsageOverview } from "@/lib/usage-core";
import { batchMarkdown, type FeedbackBatch, type FeedbackOverview } from "@/lib/feedback-core";
import { useT } from "@/components/I18nProvider";
import type { FailureRow } from "@/lib/log";
import type { SignupModeState } from "@/lib/access";
import { fmtDate, fmtDateTime as fmtDT, fmtUsd as usd } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import type { Dict } from "@/lib/i18n/en";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarStack, Busy, Chip, EmptyState, FieldRow, IconButton, Progress, SettingsWindow, StatusRing, Switch, toneFor } from "@/components/criterio";
import { useConfirm } from "@/components/useConfirm";

// ─── Formatting ─────────────────────────────────────────────────────────────

/** A person as the system's Avatar: the photo when there is one, else the initial in their tone */
const face = (name: string, image?: string | null, size = 24) => ({ initials: name.slice(0, 1).toUpperCase(), name, tone: toneFor(name), src: image, size });
function Face({ name, image, size }: { name: string; image?: string | null; size?: number }) {
  return <Avatar {...face(name, image, size)} />;
}

export function fmtDur(s: number): string {
  if (s < 60) return `${Math.round(s)} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** For the axis: "40 s", "12 min", "1,5 h" */
const fmtAxisDur = (v: number) => (v >= 3600 ? `${(Math.round(v / 360) / 10).toString().replace(".", ",")} h` : v >= 60 ? `${Math.round(v / 60)} min` : `${Math.round(v)} s`);

/** "Eric", "Eric and Andoni", "Eric, Andoni and 3 more" */
function namesList(names: string[], t: Dict, max = 3): string {
  const shown = names.slice(0, max), rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} ${t.admin.andMore(rest)}`;
  if (shown.length <= 1) return shown[0] ?? "";
  return `${shown.slice(0, -1).join(", ")} ${t.admin.and} ${shown[shown.length - 1]}`;
}

/** For the cost axis: "0,5 $", "2 $"; "<0,01 $" is not needed because the axis starts at 0 */
const fmtAxisUsd = (v: number) => (v === 0 ? "0 $" : `${(Math.round(v * 100) / 100).toString().replace(".", ",")} $`);

function ago(iso: string | null, now: number, locale: Locale, t: Dict): string {
  if (!iso) return t.admin.never;
  const d = now - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return t.admin.now;
  if (m < 60) return t.admin.minsAgo(m);
  const h = Math.floor(m / 60);
  if (h < 24) return t.admin.hoursAgo(h);
  const days = Math.floor(h / 24);
  if (days === 1) return t.admin.yesterday;
  if (days < 30) return t.admin.daysAgo(days);
  return fmtDate(iso, locale, { day: "numeric", month: "short" });
}

// ─── Column chart (one series) ─────────────────────────────────────────────

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

// Y axis ticks: 0, the half and the top rounded to a clean number (integers if the series is)
function niceTicks(max: number, integer = false): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 2;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = [1, 2, 2.5, 5, 10].map((k) => k * pow).find((s) => s >= raw) ?? pow * 10;
  if (integer) step = Math.max(1, Math.round(step));
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) out.push(v);
  return out;
}

function Columns<T extends { date: string }>({ data, value, format, title, integer = false, unitOf }: {
  data: T[]; value: (d: T) => number; format: (v: number) => string; title: string; integer?: boolean;
  /** "Clean" unit based on the max (e.g. seconds → minutes or hours) so ticks land on round values */
  unitOf?: (max: number) => number;
}) {
  const { locale } = useT();
  // The server sends the ISO date; the axis day is written here ("3 Oct" / "3 oct")
  const dayLabel = (iso: string) => fmtDate(iso, locale, { day: "numeric", month: "short" }).replace(".", "");
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 150, padL = 36, padR = 8, padT = 10, padB = 22;
  const innerW = Math.max(0, width - padL - padR), innerH = H - padT - padB;
  const vals = data.map(value);
  const maxV = Math.max(...vals, 0);
  const unit = unitOf ? unitOf(maxV) : 1;
  const ticks = niceTicks(maxV / unit, integer || unit > 1).map((t) => t * unit);
  const top = ticks[ticks.length - 1] || 1;
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.min(24, Math.max(2, band - 2));
  const y = (v: number) => padT + innerH - (v / top) * innerH;
  // X axis labels: first, last and one every N based on width
  const every = data.length > 14 ? Math.ceil(data.length / Math.max(2, Math.floor(innerW / 60))) : Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 40))));
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="ad-chart" ref={ref}>
      <span className="ad-chart__title t-small">{title}</span>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={title}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} className="ad-chart__grid" />
              <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" className="ad-chart__tick t-label">{format(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const v = vals[i];
            const x = padL + i * band + (band - barW) / 2;
            const yTop = y(v), hBar = padT + innerH - yTop;
            const r = Math.min(4, barW / 2, hBar);
            const path = hBar <= 0 ? "" : `M${x},${padT + innerH} v${-(hBar - r)} a${r},${r} 0 0 1 ${r},${-r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${hBar - r} z`;
            return (
              <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={padL + i * band} y={padT} width={band} height={innerH} fill="transparent" />
                {path && <path d={path} className={`ad-chart__bar${hover === i ? " is-hover" : ""}`} />}
                {(i % every === 0 || i === data.length - 1) && (i === data.length - 1 || i + every <= data.length - 1 || data.length <= 14) && (
                  <text x={padL + i * band + band / 2} y={H - 6} textAnchor="middle" className="ad-chart__tick t-label">{dayLabel(d.date)}</text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {h && hover !== null && (
        <div className="cr-tip ad-tip" style={{ left: Math.min(Math.max(padL + hover * band + band / 2, 60), Math.max(60, width - 60)) }}>
          <span className="ad-tip__label t-label">{dayLabel(h.date)}</span>
          <span className="ad-tip__value t-small">{format(vals[hover])}</span>
        </div>
      )}
    </div>
  );
}

// ─── Who can see the panel ──────────────────────────────────────────────────

function AccessPanel({ initial, me }: { initial: AdminEntry[]; me: string }) {
  const { locale, t } = useT();
  const [confirm, confirmDialog] = useConfirm();
  const router = useRouter();
  const [admins, setAdmins] = useState(initial);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setAdmins(initial); }, [initial]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    setBusy(true); setError(""); setMsg("");
    const r = await grantAccess(value).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(r?.error ?? t.admin.grantFailed); return; }
    const data = r.data;
    setEmail("");
    setMsg(data.added ? (data.mailed ? t.admin.grantedMailed(value) : t.admin.granted(value)) : t.admin.alreadyGranted(value));
    router.refresh();
  };

  const remove = async (a: AdminEntry) => {
    if (!(await confirm({ title: t.admin.removeConfirm(a.name ?? a.email), action: t.admin.remove, danger: true }))) return;
    setBusy(true); setError(""); setMsg("");
    const r = await revokeAccess(a.email).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(r?.error ?? t.admin.revokeFailed); return; }
    setAdmins((prev) => prev.filter((x) => x.email !== a.email));
    router.refresh();
  };

  return (
    <SettingsWindow title={t.admin.accessTitle}
      note={msg ? <span role="status">{msg}</span> : t.admin.accessHint}>
      {confirmDialog}
      <ul className="list">
        {admins.map((a) => (
          <li key={a.email} className="list__row">
            <Face name={a.name ?? a.email} size={32} />
            <span className="list__main">
              <span className="list__name t-ui"><span className="list__text">{a.name ?? a.email}</span>{a.email === me.toLowerCase() && <Chip className="list__you t-label">{t.admin.you}</Chip>}</span>
              <span className="list__sub t-small">
                {a.name && <span>{a.email}</span>}
                <span>{a.fixed ? t.admin.fixedAccess : `${a.name ? "" : t.admin.noAccountYet}${a.addedBy ? t.admin.addedBy(a.addedBy) : ""}${a.createdAt ? t.admin.addedOn(fmtDate(a.createdAt, locale, { day: "numeric", month: "short" })) : ""}`}</span>
              </span>
            </span>
            {!a.fixed && a.email !== me.toLowerCase() && (
              <Button variant="quiet" size="sm" onClick={() => remove(a)} disabled={busy}>{t.admin.remove}</Button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add}>
        <FieldRow label={t.team.emailLabel} htmlFor="grant-email" error={error}
          action={<Button variant="primary" size="sm" type="submit" disabled={busy || !email.trim()}>{t.admin.grant}</Button>}>
          <input id="grant-email" type="email" className="cr-input" placeholder={t.admin.partnerEmail} value={email}
            onChange={(e) => setEmail(e.target.value)} required aria-invalid={error ? true : undefined} />
        </FieldRow>
      </form>
    </SettingsWindow>
  );
}

// ─── Who can create an account ──────────────────────────────────────────────

function SignupPanel({ initial }: { initial: SignupModeState }) {
  const { locale, t } = useT();
  const [confirm, confirmDialog] = useConfirm();
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const change = async (inviteOnly: boolean) => {
    const ask = inviteOnly ? { title: t.admin.signupCloseConfirm, action: t.admin.signupClose } : { title: t.admin.signupOpenConfirm, action: t.admin.signupOpen, danger: true };
    if (!(await confirm(ask))) return;
    setBusy(true); setError("");
    const r = await setSignupMode(inviteOnly ? "invite" : "open").catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(r?.error ?? t.admin.signupFailed); return; }
    setState(r.data);
  };

  return (
    <SettingsWindow title={t.admin.signupTitle} description={t.admin.signupHint}
      note={state.updatedAt ? t.admin.signupChanged(state.updatedBy ?? "", fmtDT(state.updatedAt, locale)) : t.admin.signupDefault}>
      {confirmDialog}
      <FieldRow label={t.admin.signupInviteOnly} hint={state.mode === "invite" ? t.admin.signupInviteHint : t.admin.signupOpenHint} error={error}>
        <Switch checked={state.mode === "invite"} onChange={(on) => void change(on)} label={t.admin.signupInviteOnly} disabled={busy} />
      </FieldRow>
    </SettingsWindow>
  );
}

// ─── Toolbar feedback (Agentation) ───────────────────────────────────────────

function CopyMarkdown({ batch }: { batch: FeedbackBatch }) {
  const { t } = useT();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(batchMarkdown(batch)); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* no clipboard */ }
  };
  return <IconButton icon={done ? "check" : "copy"} variant="quiet" size="s" label={done ? t.common.copied : t.admin.copyForAgent} onClick={copy} />;
}

function FeedbackBatchView({ batch, now, onDelete, onResolve }: { batch: FeedbackBatch; now: number; onDelete: (b: FeedbackBatch) => Promise<void>; onResolve: (b: FeedbackBatch, resolved: boolean) => Promise<void> }) {
  const { locale, t } = useT();
  const [confirm, confirmDialog] = useConfirm();
  const [open, setOpen] = useState(batch.notes.length <= 3);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    const n = batch.notes.length;
    if (!(await confirm({ title: t.admin.deleteNotesConfirm(n, batch.author.name, batch.path), action: t.common.delete, danger: true }))) return;
    setBusy(true);
    try { await onDelete(batch); } finally { setBusy(false); }
  };
  const toggleResolved = async () => {
    setBusy(true);
    try { await onResolve(batch, !batch.resolvedAt); } finally { setBusy(false); }
  };
  const notes = open ? batch.notes : batch.notes.slice(0, 3);
  const when = batch.sentAt ?? batch.updatedAt;
  return (
    <li className="fb">
      {confirmDialog}
      <div className="fb__head">
        <Face name={batch.author.name} image={batch.author.image} size={32} />
        <span className="list__main">
          <span className="list__name t-ui">
            <span className="list__text">
              {batch.author.name}
              <span className="fb__on">{t.admin.about}</span>
              <a className="fb__path" href={batch.url} target="_blank" rel="noopener noreferrer" data-tip={batch.url}>{batch.path}</a>
            </span>
          </span>
          <span className="list__sub t-small" data-tip={fmtDT(when, locale)}>
            <span>{batch.sentAt ? t.admin.sentAgo(ago(batch.sentAt, now, locale, t)) : t.admin.notSentYet(ago(batch.updatedAt, now, locale, t))}</span>
            {batch.workspace && <span>{batch.workspace}</span>}{batch.viewport && <span>{batch.viewport}</span>}
            <span>{t.admin.notes(batch.notes.length)}</span>
          </span>
        </span>
        {!batch.sentAt && <Chip className="t-label" tone="butter">{t.admin.draft}</Chip>}
        {batch.resolvedAt && <span data-tip={fmtDT(batch.resolvedAt, locale)}><Chip className="t-label" tone="moss">{t.admin.resolved}</Chip></span>}
        <span className="fb__actions">
          {batch.sentAt && (
            <IconButton icon="check" variant="quiet" size="s" toggle active={!!batch.resolvedAt}
              label={batch.resolvedAt ? t.admin.reopen : t.admin.resolve} onClick={toggleResolved} disabled={busy} />
          )}
          <CopyMarkdown batch={batch} />
          <IconButton icon={busy ? <Busy label={t.common.delete} /> : "trash"} variant="quiet" size="s" className="fb__delete"
            label={t.admin.deleteFeedback} onClick={remove} disabled={busy} />
        </span>
      </div>
      <ol className="fb__notes">
        {notes.map((n) => (
          <li key={n.id} className="fb__note">
            <span className="fb__el t-small" data-tip={n.elementPath}>{n.element}{n.sourceFile ? <span className="fb__src t-label">{n.sourceFile}</span> : null}</span>
            {n.selectedText && <q className="fb__quote t-small">{n.selectedText}</q>}
            <p className="fb__comment">{n.comment || <span className="fb__empty">{t.admin.noComment}</span>}</p>
          </li>
        ))}
      </ol>
      {batch.notes.length > 3 && (
        <Button variant="quiet" size="sm" className="list__more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? t.admin.seeLess : t.admin.seeAllNotes(batch.notes.length)}</Button>
      )}
    </li>
  );
}

function FeedbackPanel({ feedback, now }: { feedback: FeedbackOverview; now: number }) {
  const { t } = useT();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");
  // When new server data arrives (router.refresh), the local deletions are forgotten
  useEffect(() => { setGone(new Set()); }, [feedback]);
  const all = feedback.batches.filter((b) => !gone.has(b.key));
  const batches = showAll ? all : all.slice(0, 8);

  const onDelete = async (b: FeedbackBatch) => {
    setError("");
    const r = await deleteFeedback(b.notes.map((n) => n.id)).catch(() => null);
    if (!r?.ok) { setError(r?.error ?? t.admin.deleteFailed); return; }
    setGone((prev) => new Set(prev).add(b.key));
    router.refresh();
  };
  const onResolve = async (b: FeedbackBatch, resolved: boolean) => {
    setError("");
    const r = await resolveFeedback(b.notes.map((n) => n.id), resolved).catch(() => null);
    if (!r?.ok) { setError(r?.error ?? t.admin.resolveFailed); return; }
    router.refresh();
  };
  return (
    <SettingsWindow title={t.admin.feedbackTitle} description={feedback.notes > 0 ? t.admin.feedbackMeta(feedback.notes, feedback.sent, feedback.pending, feedback.people) : undefined}
      note={error ? <span className="cr-field-hint is-error" role="alert">{error}</span> : feedback.batches.length > 0 ? t.admin.feedbackHint : undefined}>
      {all.length === 0 ? (
        <EmptyState title={t.admin.nothingYet}>{t.admin.noFeedback(feedback.days)}</EmptyState>
      ) : (
        <ul className="fb-list">
          {batches.map((b) => <FeedbackBatchView key={b.key} batch={b} now={now} onDelete={onDelete} onResolve={onResolve} />)}
        </ul>
      )}
      {all.length > 8 && (
        <Button variant="quiet" size="sm" className="list__more" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
          {showAll ? t.admin.seeLess : t.admin.seeAll(all.length)}
        </Button>
      )}
    </SettingsWindow>
  );
}

// One row per failure, newest first: when, what kind, which one, the error (its stack on hover), who, and the
// request id to search in the logs
function FailuresPanel({ failures, days, now }: { failures: FailureRow[]; days: number; now: number }) {
  const { locale, t } = useT();
  return (
    <SettingsWindow title={t.admin.failuresTitle} figure={failures.length} note={failures.length ? t.admin.failuresHint : undefined}>
      {failures.length === 0 ? (
        <EmptyState title={t.admin.nothingYet}>{t.admin.noFailures(days)}</EmptyState>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table t-small">
            <thead>
              <tr>
                <th>{t.admin.thWhen}</th>
                <th>{t.admin.thKind}</th>
                <th>{t.admin.thWhat}</th>
                <th>{t.admin.thError}</th>
                <th>{t.admin.thPerson}</th>
                <th>{t.admin.thRequest}</th>
              </tr>
            </thead>
            <tbody>
              {failures.map((f) => {
                const at = new Date(f.createdAt).toISOString();
                return (
                <tr key={f.id}>
                  <td data-tip={fmtDT(at, locale)}>{ago(at, now, locale, t)}</td>
                  <td><Chip className="t-label" tone="ember">{t.admin.failureKinds[f.kind] ?? f.kind}</Chip></td>
                  <td className="ad-cell-trunc" title={f.ref ?? undefined}>{f.what}</td>
                  <td className="ad-cell-trunc ad-failure" title={f.stack ?? undefined}>{f.message}</td>
                  <td className="ad-cell-trunc" title={f.userEmail ?? undefined}>{[f.userName, f.workspaceName].filter(Boolean).join(" · ")}</td>
                  <td className="ad-cell-trunc ad-mono">{f.requestId ?? ""}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SettingsWindow>
  );
}

// ─── KPI strip and share bar ────────────────────────────────────────────────

type Kpi = { label: React.ReactNode; value: React.ReactNode; note?: React.ReactNode };

/** One KPI strip for Overview and Usage: cells divided by hairlines, edge to edge of the window's body */
function Kpis({ cells }: { cells: Kpi[] }) {
  return (
    <div className="ad-kpis">
      <dl className="ad-kpis__grid">
        {cells.map((c, i) => (
          <div key={i} className="ad-kpi">
            <dt className="ad-kpi__label t-label">{c.label}</dt>
            <dd className="ad-kpi__value t-title-l">{c.value}</dd>
            {c.note != null && <dd className="ad-kpi__note t-small">{c.note}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A share of the largest, drawn with the system's Progress (segmented ember blocks in the sunken field). At
 *  least one block lights when there is anything. The figure next to it says the number, so it is hidden from
 *  screen readers */
function Bar({ share }: { share: number }) {
  const segments = 24;
  const value = share > 0 ? Math.max(share * 100, 100 / segments) : 0;
  return <span className="ad-bar" aria-hidden><Progress value={value} segments={segments} label="" /></span>;
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export type AdminSection = "overview" | "usage" | "people" | "feedback" | "failures" | "access";

// One section of the Activity area. Each page loads only the data its section shows.
export default function AdminPanel({ section, data, usage, feedback, failures, admins, signup, me }: {
  section: AdminSection; data: ActivityOverview; usage?: UsageOverview; feedback?: FeedbackOverview; failures?: FailureRow[]; admins?: AdminEntry[]; signup?: SignupModeState; me: string;
}) {
  const { locale, t } = useT();
  const fmtUsd = (n: number) => usd(n, locale);
  const fmtDateTime = (iso: string) => fmtDT(iso, locale);
  const router = useRouter();
  const now = new Date(data.generatedAt).getTime();
  const [showAll, setShowAll] = useState(false);
  const [showAllLogins, setShowAllLogins] = useState(false);
  const maxArea = data.areas[0]?.seconds ?? 0;
  const maxAction = usage?.byAction[0]?.usd ?? 0;

  // "Online now" changes on its own: refresh every minute while the tab is visible
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 60000);
    return () => clearInterval(t);
  }, [router]);

  const k = data.kpis;
  const online = data.users.filter((u) => u.online);
  const users = showAll ? data.users : data.users.slice(0, 25);

  const areaName = (area: string) => t.labels.area[area as keyof typeof t.labels.area] ?? area;
  const actionName = (action: string) => t.labels.action[action as keyof typeof t.labels.action] ?? action;
  const logins = showAllLogins ? data.logins : data.logins.slice(0, 8);

  return (
    <div className="page__body">
      {section === "overview" && (
        <>
        <SettingsWindow title={t.admin.summary}>
          <Kpis cells={[
            {
              label: <><StatusRing tone={k.online ? "synced" : "idle"} label={t.admin.onlineNow} />{t.admin.onlineNow}</>,
              value: k.online,
              note: online.length ? (
                <span className="ad-online" data-tip={online.map((u) => u.name).join(", ")}>
                  <AvatarStack people={online.slice(0, 5).map((u) => face(u.name, u.image))} size={24} />
                  <span className="ad-online__names">{namesList(online.map((u) => u.name), t)}</span>
                </span>
              ) : t.admin.onlineSub,
            },
            { label: t.admin.activeToday, value: k.activeToday, note: t.admin.activeSub(k.active7, k.active30) },
            { label: t.admin.loggedIn, value: k.loggedIn, note: t.admin.loggedInSub },
            { label: t.admin.registered, value: k.totalUsers, note: k.newUsers ? t.admin.newUsers(k.newUsers, data.days) : t.admin.noNewUsers(data.days) },
            { label: t.admin.timeInApp, value: fmtDur(k.seconds), note: k.avgSeconds ? t.admin.avgPerActive(fmtDur(k.avgSeconds)) : t.admin.inDays(data.days) },
          ]} />
        </SettingsWindow>

        <SettingsWindow title={t.admin.perDay}>
          {data.kpis.seconds === 0 && data.daily.every((d) => d.users === 0) ? (
            <EmptyState title={t.admin.nothingYet}>{t.admin.noActivity}</EmptyState>
          ) : (
            <div className="ad-charts">
              <Columns data={data.daily} title={t.admin.activePeople} value={(d) => d.users} format={(v) => String(Math.round(v))} integer />
              <Columns data={data.daily} title={t.admin.timeInApp} value={(d) => d.seconds} format={fmtAxisDur} unitOf={(m) => (m >= 3600 ? 3600 : m >= 60 ? 60 : 1)} />
            </div>
          )}
        </SettingsWindow>
        </>
      )}

      {section === "usage" && usage && (
        <>
        <SettingsWindow title={t.admin.whereTime}>
          {data.areas.length === 0 ? (
            <EmptyState title={t.admin.noData} />
          ) : (
            <ul className="list">
              {data.areas.map((a) => (
                <li key={a.area} className="list__row ad-area">
                  <AreaThumb area={a.area} label={areaName(a.area)} />
                  <span className="list__main">
                    <span className="ad-area__head">
                      <span className="list__name t-ui"><span className="list__text">{areaName(a.area)}</span></span>
                      <span className="list__figure t-small">{fmtDur(a.seconds)}</span>
                    </span>
                    <span className="ad-area__foot">
                      <span className="list__sub t-small">{t.admin.peopleCount(a.users)}</span>
                      <Bar share={maxArea ? a.seconds / maxArea : 0} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SettingsWindow>

        <SettingsWindow title={t.admin.aiUsage} note={t.admin.costNote}>
          <Kpis cells={[
            { label: t.admin.estimatedCost, value: fmtUsd(usage.totalUsd) },
            { label: t.admin.perAiPerson, value: fmtUsd(usage.people ? usage.totalUsd / usage.people : 0), note: t.admin.peopleCount(usage.people) },
            { label: t.admin.callsLabel, value: usage.calls, note: usage.calls ? t.admin.avgCall(fmtUsd(usage.totalUsd / usage.calls)) : t.admin.toClaudeAndJev },
          ]} />
          {usage.calls === 0 ? (
            <EmptyState title={t.admin.nothingYet}>{t.admin.noCalls}</EmptyState>
          ) : (
            <>
              <div className="ad-charts">
                <Columns data={usage.daily} title={t.admin.costPerDay} value={(d) => d.usd} format={fmtAxisUsd} />
                <Columns data={usage.daily} title={t.admin.callsPerDay} value={(d) => d.calls} format={(v) => String(Math.round(v))} integer />
              </div>
              <div className="ad-cols">
                <section className="ad-sub">
                  <h3 className="t-title-s">{t.admin.byAction}</h3>
                  <ul className="list">
                    {usage.byAction.map((a) => (
                      <li key={a.action} className="list__row">
                        <span className="list__main">
                          <span className="ad-area__head">
                            <span className="list__name t-ui"><span className="list__text">{actionName(a.action)}</span></span>
                            <span className="list__figure t-small">{fmtUsd(a.usd)}</span>
                          </span>
                          <span className="ad-area__foot">
                            <span className="list__sub t-small">{a.action.startsWith("jev_") && a.units ? t.admin.itemsInCalls(a.units, a.calls) : t.admin.calls(a.calls)}</span>
                            <Bar share={maxAction ? a.usd / maxAction : 0} />
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="ad-sub">
                  <h3 className="t-title-s">{t.admin.byTeam}</h3>
                  <ul className="list">
                    {usage.byWorkspace.map((w) => (
                      <li key={w.id} className="list__row">
                        <span className="list__main">
                          <span className="list__name t-ui"><span className="list__text">{w.name ?? t.admin.deletedWorkspace}</span></span>
                          <span className="list__sub t-small">{w.kind === "personal" && <span>{t.admin.personalSpace}</span>}<span>{t.admin.calls(w.calls)}</span></span>
                        </span>
                        <span className="list__figure t-small">{fmtUsd(w.usd)}</span>
                      </li>
                    ))}
                  </ul>
                  <h3 className="t-title-s ad-sub__next">{t.admin.byPerson}</h3>
                  <ul className="list">
                    {usage.byUser.map((u) => (
                      <li key={u.userId ?? "sys"} className="list__row">
                        <Face name={u.name ?? t.admin.system} image={u.image} size={32} />
                        <span className="list__main">
                          <span className="list__name t-ui"><span className="list__text">{u.name ?? t.admin.system}</span></span>
                          <span className="list__sub t-small">{u.email && <span>{u.email}</span>}<span>{t.admin.calls(u.calls)}</span></span>
                        </span>
                        <span className="list__figure t-small">{fmtUsd(u.usd)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          )}
        </SettingsWindow>
        </>
      )}

      {section === "people" && (
        <>
        <SettingsWindow title={t.admin.people} figure={data.users.length} description={t.admin.peopleMeta(data.users.length, data.days)} note={t.admin.peopleHint}>
          <div className="ad-table-wrap">
            <table className="ad-table t-small">
              <thead>
                <tr>
                  <th>{t.admin.thPerson}</th>
                  <th>{t.admin.thState}</th>
                  <th>{t.admin.thLastSeen}</th>
                  <th className="ad-num">{t.admin.thTime}</th>
                  <th className="ad-num">{t.admin.thVisits}</th>
                  <th>{t.admin.thWhere}</th>
                  <th>{t.admin.thTeams}</th>
                  <th>{t.admin.thDevice}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="ad-person">
                        <Face name={u.name} image={u.image} size={32} />
                        <span className="list__main">
                          <span className="list__name t-ui"><span className="list__text">{u.name}</span></span>
                          <span className="list__sub t-small" title={u.email}>{u.email}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      {u.online ? (
                        <span className="ad-state"><span className="ad-state__dot" aria-hidden />{t.admin.stateOnline}</span>
                      ) : u.openSessions > 0 ? (
                        <span className="ad-state"><StatusRing tone="idle" label={t.admin.stateSession} />{t.admin.stateSession}</span>
                      ) : (
                        <span className="ad-muted">{t.admin.stateOff}</span>
                      )}
                    </td>
                    <td data-tip={u.lastSeenAt ? fmtDateTime(u.lastSeenAt) : u.lastLoginAt ? t.admin.loginAt(fmtDateTime(u.lastLoginAt)) : undefined}>
                      {u.lastSeenAt ? ago(u.lastSeenAt, now, locale, t) : u.lastLoginAt ? t.admin.loginAgo(ago(u.lastLoginAt, now, locale, t)) : t.admin.never}
                    </td>
                    <td className="ad-num">{u.seconds ? fmtDur(u.seconds) : ""}</td>
                    <td className="ad-num">{u.visits || ""}</td>
                    <td>{u.topArea ? areaName(u.topArea) : ""}</td>
                    <td className="ad-cell-trunc" title={u.workspaces.join(", ")}>{u.workspaces.length ? u.workspaces.join(", ") : t.admin.personal}</td>
                    <td className="ad-cell-trunc">{u.device ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.users.length > 25 && (
            <Button variant="quiet" size="sm" className="list__more" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
              {showAll ? t.admin.seeLess : t.admin.seeAll(data.users.length)}
            </Button>
          )}
        </SettingsWindow>

        <SettingsWindow title={t.admin.lastLogins}>
          {data.logins.length === 0 ? (
            <EmptyState title={t.admin.noLogins} />
          ) : (
            <ul className="list">
              {logins.map((l, i) => (
                <li key={`${l.userId}-${i}`} className="list__row">
                  <Face name={l.name} image={l.image} size={32} />
                  <span className="list__main">
                    <span className="list__name t-ui"><span className="list__text">{l.name}</span></span>
                    <span className="list__sub t-small"><span>{fmtDateTime(l.at)}{l.alive ? "" : t.admin.expiredSession}</span>{l.device && <span>{l.device}</span>}</span>
                  </span>
                  <span className="list__figure t-small">{ago(l.at, now, locale, t)}</span>
                </li>
              ))}
            </ul>
          )}
          {data.logins.length > 8 && (
            <Button variant="quiet" size="sm" className="list__more" aria-expanded={showAllLogins} onClick={() => setShowAllLogins((v) => !v)}>
              {showAllLogins ? t.admin.seeLess : t.admin.seeAll(data.logins.length)}
            </Button>
          )}
        </SettingsWindow>
        </>
      )}

      {section === "feedback" && feedback && <FeedbackPanel feedback={feedback} now={now} />}

      {section === "failures" && failures && <FailuresPanel failures={failures} days={data.days} now={now} />}
      {section === "access" && signup && <SignupPanel initial={signup} />}
      {section === "access" && admins && <AccessPanel initial={admins} me={me} />}
    </div>
  );
}
