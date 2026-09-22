"use client";

import { grantAccess, revokeAccess, deleteFeedback } from "@/app/actions/admin";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/WorkspaceMenu";
import AreaThumb from "./AreaThumb";
import { type ActivityOverview, type ActivityDay, type AdminEntry } from "@/lib/activity-core";
import { type UsageOverview } from "@/lib/usage-core";
import { batchMarkdown, type FeedbackBatch, type FeedbackOverview } from "@/lib/feedback-core";
import { useT } from "@/components/I18nProvider";
import { fmtDate, fmtDateTime as fmtDT, fmtUsd as usd } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import type { Dict } from "@/lib/i18n/en";

// ─── Formato ─────────────────────────────────────────────────────────────────

export function fmtDur(s: number): string {
  if (s < 60) return `${Math.round(s)} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** Para el eje: "40 s", "12 min", "1,5 h" */
const fmtAxisDur = (v: number) => (v >= 3600 ? `${(Math.round(v / 360) / 10).toString().replace(".", ",")} h` : v >= 60 ? `${Math.round(v / 60)} min` : `${Math.round(v)} s`);

/** "Eric", "Eric y Andoni", "Eric, Andoni y 3 más" */
function namesList(names: string[], t: Dict, max = 3): string {
  const shown = names.slice(0, max), rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} ${t.admin.andMore(rest)}`;
  if (shown.length <= 1) return shown[0] ?? "";
  return `${shown.slice(0, -1).join(", ")} ${t.admin.and} ${shown[shown.length - 1]}`;
}

/** Para el eje de coste: "0,5 $", "2 $", "<0,01 $" no hace falta porque el eje empieza en 0 */
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

// ─── Gráfica de columnas (una serie) ─────────────────────────────────────────

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

// Marcas del eje Y: 0, la mitad y el techo redondeado a una cifra limpia (enteras si la serie lo es)
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
  /** Unidad "limpia" según el máximo (p. ej. segundos → minutos u horas) para que las marcas caigan en valores redondos */
  unitOf?: (max: number) => number;
}) {
  const { locale } = useT();
  // El servidor manda la fecha ISO; el día del eje se escribe aquí ("3 Oct" / "3 oct")
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
  // Etiquetas del eje X: primera, última y una cada N según el ancho
  const every = data.length > 14 ? Math.ceil(data.length / Math.max(2, Math.floor(innerW / 60))) : Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 40))));
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="ad-chart" ref={ref}>
      <span className="ad-chart__title">{title}</span>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={title}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} className="ad-chart__grid" />
              <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" className="ad-chart__tick">{format(t)}</text>
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
                  <text x={padL + i * band + band / 2} y={H - 6} textAnchor="middle" className="ad-chart__tick">{dayLabel(d.date)}</text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {h && hover !== null && (
        <div className="ad-tip" style={{ left: Math.min(Math.max(padL + hover * band + band / 2, 60), Math.max(60, width - 60)) }}>
          <span className="ad-tip__label">{dayLabel(h.date)}</span>
          <span className="ad-tip__value">{format(vals[hover])}</span>
        </div>
      )}
    </div>
  );
}

// ─── Quién puede ver el panel ────────────────────────────────────────────────

function AccessPanel({ initial, me }: { initial: AdminEntry[]; me: string }) {
  const { locale, t } = useT();
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
    if (!confirm(t.admin.removeConfirm(a.name ?? a.email))) return;
    setBusy(true); setError(""); setMsg("");
    const r = await revokeAccess(a.email).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(r?.error ?? t.admin.revokeFailed); return; }
    setAdmins((prev) => prev.filter((x) => x.email !== a.email));
    router.refresh();
  };

  return (
    <section className="panel">
      <div className="panel__head">
        <span className="panel__title">{t.admin.accessTitle}</span>
        <span className="panel__meta">{admins.length}</span>
      </div>
      <ul className="list">
        {admins.map((a) => (
          <li key={a.email} className="list__row">
            <UserAvatar name={a.name ?? a.email} small />
            <span className="list__main">
              <span className="list__name">{a.name ?? a.email}{a.email === me.toLowerCase() && <span className="list__you">{t.admin.you}</span>}</span>
              <span className="list__sub">
                {a.name ? `${a.email} · ` : ""}
                {a.fixed ? t.admin.fixedAccess : `${a.name ? "" : t.admin.noAccountYet}${t.admin.addedBy(a.addedBy || "—")}${a.createdAt ? t.admin.addedOn(fmtDate(a.createdAt, locale, { day: "numeric", month: "short" })) : ""}`}
              </span>
            </span>
            {!a.fixed && a.email !== me.toLowerCase() && (
              <button className="btn btn--ghost btn--sm" onClick={() => remove(a)} disabled={busy}>{t.admin.remove}</button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="invite">
        <input className="input" type="email" placeholder={t.admin.partnerEmail} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button className="btn btn--primary" type="submit" disabled={busy || !email.trim()}>{t.admin.grant}</button>
      </form>
      {error && <p className="modal__error">{error}</p>}
      {msg && <p className="page__ok">{msg}</p>}
      <p className="panel__hint">{t.admin.accessHint}</p>
    </section>
  );
}

// ─── Feedback de la barra (Agentation) ───────────────────────────────────────

function CopyMarkdown({ batch }: { batch: FeedbackBatch }) {
  const { t } = useT();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(batchMarkdown(batch)); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* sin portapapeles */ }
  };
  return <button className="btn btn--ghost btn--sm" onClick={copy}>{done ? t.common.copied : t.admin.copyForAgent}</button>;
}

function FeedbackBatchView({ batch, now, onDelete }: { batch: FeedbackBatch; now: number; onDelete: (b: FeedbackBatch) => Promise<void> }) {
  const { locale, t } = useT();
  const [open, setOpen] = useState(batch.notes.length <= 3);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    const n = batch.notes.length;
    if (!confirm(t.admin.deleteNotesConfirm(n, batch.author.name, batch.path))) return;
    setBusy(true);
    try { await onDelete(batch); } finally { setBusy(false); }
  };
  const notes = open ? batch.notes : batch.notes.slice(0, 3);
  const when = batch.sentAt ?? batch.updatedAt;
  return (
    <li className="fb">
      <div className="fb__head">
        <UserAvatar name={batch.author.name} image={batch.author.image} small />
        <span className="list__main">
          <span className="list__name">
            {batch.author.name}
            <span className="fb__on">{t.admin.about}</span>
            <a className="fb__path" href={batch.url} target="_blank" rel="noopener noreferrer" title={batch.url}>{batch.path}</a>
          </span>
          <span className="list__sub" title={fmtDT(when, locale)}>
            {batch.sentAt ? t.admin.sentAgo(ago(batch.sentAt, now, locale, t)) : t.admin.notSentYet(ago(batch.updatedAt, now, locale, t))}
            {batch.workspace ? ` · ${batch.workspace}` : ""}{batch.viewport ? ` · ${batch.viewport}` : ""}
            {` · ${t.admin.notes(batch.notes.length)}`}
          </span>
        </span>
        {!batch.sentAt && <span className="fb__draft">{t.admin.draft}</span>}
        <CopyMarkdown batch={batch} />
        <button className="btn btn--ghost btn--sm" onClick={remove} disabled={busy} aria-label={t.admin.deleteFeedback}>{busy ? <span className="spinner" /> : t.common.delete}</button>
      </div>
      <ol className="fb__notes">
        {notes.map((n) => (
          <li key={n.id} className="fb__note">
            <span className="fb__el" title={n.elementPath}>{n.element}{n.sourceFile ? <span className="fb__src"> · {n.sourceFile}</span> : null}</span>
            {n.selectedText && <q className="fb__quote">{n.selectedText}</q>}
            <p className="fb__comment">{n.comment || <span className="fb__empty">{t.admin.noComment}</span>}</p>
          </li>
        ))}
      </ol>
      {batch.notes.length > 3 && (
        <button className="fb__more" onClick={() => setOpen((v) => !v)}>{open ? t.admin.seeLess : t.admin.seeAllNotes(batch.notes.length)}</button>
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
  // Al llegar datos nuevos del servidor (router.refresh) se olvida lo borrado en local
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
  return (
    <section className="panel">
      <div className="panel__head">
        <span className="panel__title">{t.admin.feedbackTitle}</span>
        <span className="panel__meta">
          {feedback.notes ? t.admin.feedbackMeta(feedback.notes, feedback.sent, feedback.pending, feedback.people) : t.admin.lastDays(feedback.days)}
        </span>
      </div>
      {all.length === 0 ? (
        <p className="panel__hint">{t.admin.noFeedback(feedback.days)}</p>
      ) : (
        <ul className="fb-list">
          {batches.map((b) => <FeedbackBatchView key={b.key} batch={b} now={now} onDelete={onDelete} />)}
        </ul>
      )}
      {error && <p className="modal__error">{error}</p>}
      {all.length > 8 && (
        <button className="btn btn--ghost btn--sm" onClick={() => setShowAll((v) => !v)} style={{ alignSelf: "flex-start" }}>
          {showAll ? t.admin.seeLess : t.admin.seeAll(all.length)}
        </button>
      )}
      {feedback.batches.length > 0 && (
        <p className="panel__hint">{t.admin.feedbackHint}</p>
      )}
    </section>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export default function AdminPanel({ data, usage, feedback, admins, me }: { data: ActivityOverview; usage: UsageOverview; feedback: FeedbackOverview; admins: AdminEntry[]; me: string }) {
  const { locale, t } = useT();
  const fmtUsd = (n: number) => usd(n, locale);
  const fmtDateTime = (iso: string) => fmtDT(iso, locale);
  const router = useRouter();
  const now = new Date(data.generatedAt).getTime();
  const [showAll, setShowAll] = useState(false);
  const maxArea = data.areas[0]?.seconds ?? 0;
  const maxAction = usage.byAction[0]?.usd ?? 0;

  // Los "conectados ahora" cambian solos: se refresca cada minuto mientras la pestaña está visible
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 60000);
    return () => clearInterval(t);
  }, [router]);

  const k = data.kpis;
  const online = data.users.filter((u) => u.online);
  const users = showAll ? data.users : data.users.slice(0, 25);

  return (
    <div className="page__body">
      <section className="ad-kpis">
        <div className="ad-kpi ad-kpi--hero">
          <span className="ad-kpi__label"><span className={`ad-dot${k.online ? " is-on" : ""}`} aria-hidden />{t.admin.onlineNow}</span>
          <span className="ad-kpi__value">{k.online}</span>
          {online.length ? (
            <span className="ad-online" title={online.map((u) => u.name).join(", ")}>
              <span className="ad-online__avatars">
                {online.slice(0, 5).map((u) => <UserAvatar key={u.id} name={u.name} image={u.image} small />)}
              </span>
              <span className="ad-online__names">{namesList(online.map((u) => u.name), t)}</span>
            </span>
          ) : (
            <span className="ad-kpi__sub">{t.admin.onlineSub}</span>
          )}
        </div>
        <div className="ad-kpi">
          <span className="ad-kpi__label">{t.admin.activeToday}</span>
          <span className="ad-kpi__value">{k.activeToday}</span>
          <span className="ad-kpi__sub">{t.admin.activeSub(k.active7, k.active30)}</span>
        </div>
        <div className="ad-kpi">
          <span className="ad-kpi__label">{t.admin.loggedIn}</span>
          <span className="ad-kpi__value">{k.loggedIn}</span>
          <span className="ad-kpi__sub">{t.admin.loggedInSub}</span>
        </div>
        <div className="ad-kpi">
          <span className="ad-kpi__label">{t.admin.registered}</span>
          <span className="ad-kpi__value">{k.totalUsers}</span>
          <span className="ad-kpi__sub">{k.newUsers ? t.admin.newUsers(k.newUsers, data.days) : t.admin.noNewUsers(data.days)}</span>
        </div>
        <div className="ad-kpi">
          <span className="ad-kpi__label">{t.admin.timeInApp}</span>
          <span className="ad-kpi__value ad-kpi__value--text">{fmtDur(k.seconds)}</span>
          <span className="ad-kpi__sub">{k.avgSeconds ? t.admin.avgPerActive(fmtDur(k.avgSeconds)) : t.admin.inDays(data.days)}</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">{t.admin.perDay}</span>
          <span className="panel__meta">{t.admin.lastDays(data.days)}</span>
        </div>
        {data.kpis.seconds === 0 && data.daily.every((d) => d.users === 0) ? (
          <p className="panel__hint">{t.admin.noActivity}</p>
        ) : (
          <div className="ad-charts">
            <Columns data={data.daily} title={t.admin.activePeople} value={(d) => d.users} format={(v) => String(Math.round(v))} integer />
            <Columns data={data.daily} title={t.admin.timeInApp} value={(d) => d.seconds} format={fmtAxisDur} unitOf={(m) => (m >= 3600 ? 3600 : m >= 60 ? 60 : 1)} />
          </div>
        )}
      </section>

      <div className="ad-cols">
        <section className="panel">
          <div className="panel__head">
            <span className="panel__title">{t.admin.whereTime}</span>
            <span className="panel__meta">{t.admin.lastDays(data.days)}</span>
          </div>
          {data.areas.length === 0 ? (
            <p className="panel__hint">{t.admin.noData}</p>
          ) : (
            <ul className="ad-areas">
              {data.areas.map((a) => (
                <li key={a.area} className="ad-area">
                  <AreaThumb area={a.area} label={t.labels.area[a.area as keyof typeof t.labels.area] ?? a.area} />
                  <span className="ad-area__body">
                    <span className="ad-area__head">
                      <span className="ad-area__name">{t.labels.area[a.area as keyof typeof t.labels.area] ?? a.area}</span>
                      <span className="ad-area__meta">{t.admin.peopleCount(a.users)}</span>
                      <span className="ad-area__value">{fmtDur(a.seconds)}</span>
                    </span>
                    <span className="ad-area__bar"><span style={{ width: `${maxArea ? Math.max(1, (a.seconds / maxArea) * 100) : 0}%` }} /></span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <span className="panel__title">{t.admin.lastLogins}</span>
            <span className="panel__meta">{t.admin.logins}</span>
          </div>
          {data.logins.length === 0 ? (
            <p className="panel__hint">{t.admin.noLogins}</p>
          ) : (
            <ul className="list">
              {data.logins.map((l, i) => (
                <li key={`${l.userId}-${i}`} className="list__row">
                  <UserAvatar name={l.name} image={l.image} small />
                  <span className="list__main">
                    <span className="list__name">{l.name}</span>
                    <span className="list__sub">{fmtDateTime(l.at)}{l.device ? ` · ${l.device}` : ""}{l.alive ? "" : t.admin.expiredSession}</span>
                  </span>
                  <span className="list__role">{ago(l.at, now, locale, t)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">{t.admin.aiUsage}</span>
          <span className="panel__meta">{t.admin.lastDays(usage.days)}</span>
        </div>
        <div className="ad-usage-kpis">
          <div className="ad-usage-kpi">
            <span className="ad-kpi__label">{t.admin.estimatedCost}</span>
            <span className="ad-kpi__value ad-usage-kpi__value">{fmtUsd(usage.totalUsd)}</span>
          </div>
          <div className="ad-usage-kpi">
            <span className="ad-kpi__label">{t.admin.perAiPerson}</span>
            <span className="ad-kpi__value ad-usage-kpi__value">{fmtUsd(usage.people ? usage.totalUsd / usage.people : 0)}</span>
            <span className="ad-kpi__sub">{t.admin.peopleCount(usage.people)}</span>
          </div>
          <div className="ad-usage-kpi">
            <span className="ad-kpi__label">{t.admin.callsLabel}</span>
            <span className="ad-kpi__value ad-usage-kpi__value">{usage.calls}</span>
            <span className="ad-kpi__sub">{usage.calls ? t.admin.avgCall(fmtUsd(usage.totalUsd / usage.calls)) : t.admin.toClaudeAndJev}</span>
          </div>
        </div>
        {usage.calls === 0 ? (
          <p className="panel__hint">{t.admin.noCalls}</p>
        ) : (
          <>
            <div className="ad-charts">
              <Columns data={usage.daily} title={t.admin.costPerDay} value={(d) => d.usd} format={fmtAxisUsd} />
              <Columns data={usage.daily} title={t.admin.callsPerDay} value={(d) => d.calls} format={(v) => String(Math.round(v))} integer />
            </div>
            <div className="ad-cols ad-cols--inner">
              <div className="ad-sub">
                <span className="ad-sub__title">{t.admin.byAction}</span>
                <ul className="ad-areas">
                  {usage.byAction.map((a) => (
                    <li key={a.action} className="ad-area">
                      <span className="ad-area__body">
                        <span className="ad-area__head">
                          <span className="ad-area__name">{t.labels.action[a.action as keyof typeof t.labels.action] ?? a.action}</span>
                          <span className="ad-area__meta">{a.action.startsWith("jev_") && a.units ? t.admin.itemsInCalls(a.units, a.calls) : t.admin.calls(a.calls)}</span>
                          <span className="ad-area__value">{fmtUsd(a.usd)}</span>
                        </span>
                        <span className="ad-area__bar"><span style={{ width: `${maxAction ? Math.max(1, (a.usd / maxAction) * 100) : 0}%` }} /></span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="ad-sub">
                <span className="ad-sub__title">{t.admin.byTeam}</span>
                <ul className="list">
                  {usage.byWorkspace.map((w) => (
                    <li key={w.id} className="list__row">
                      <span className="list__main">
                        <span className="list__name">{w.name ?? t.admin.deletedWorkspace}</span>
                        <span className="list__sub">{w.kind === "personal" ? t.admin.personalSpace : ""}{t.admin.calls(w.calls)}</span>
                      </span>
                      <span className="list__role">{fmtUsd(w.usd)}</span>
                    </li>
                  ))}
                </ul>
                <span className="ad-sub__title" style={{ marginTop: 8 }}>{t.admin.byPerson}</span>
                <ul className="list">
                  {usage.byUser.map((u) => (
                    <li key={u.userId ?? "sys"} className="list__row">
                      <UserAvatar name={u.name ?? t.admin.system} image={u.image} small />
                      <span className="list__main">
                        <span className="list__name">{u.name ?? t.admin.system}</span>
                        <span className="list__sub">{u.email ? `${u.email} · ` : ""}{t.admin.calls(u.calls)}</span>
                      </span>
                      <span className="list__role">{fmtUsd(u.usd)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
        <p className="panel__hint">{t.admin.costNote}</p>
      </section>

      <FeedbackPanel feedback={feedback} now={now} />

      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">{t.admin.people}</span>
          <span className="panel__meta">{t.admin.peopleMeta(data.users.length, data.days)}</span>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table">
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
                      <UserAvatar name={u.name} image={u.image} small />
                      <span className="list__main">
                        <span className="list__name">{u.name}</span>
                        <span className="list__sub" title={u.email}>{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    {u.online ? (
                      <span className="ad-state ad-state--on"><span className="ad-dot is-on" aria-hidden />{t.admin.stateOnline}</span>
                    ) : u.openSessions > 0 ? (
                      <span className="ad-state">{t.admin.stateSession}</span>
                    ) : (
                      <span className="ad-state ad-state--off">{t.admin.stateOff}</span>
                    )}
                  </td>
                  <td title={u.lastSeenAt ? fmtDateTime(u.lastSeenAt) : u.lastLoginAt ? t.admin.loginAt(fmtDateTime(u.lastLoginAt)) : undefined}>
                    {u.lastSeenAt ? ago(u.lastSeenAt, now, locale, t) : u.lastLoginAt ? t.admin.loginAgo(ago(u.lastLoginAt, now, locale, t)) : t.admin.never}
                  </td>
                  <td className="ad-num">{u.seconds ? fmtDur(u.seconds) : "—"}</td>
                  <td className="ad-num">{u.visits || "—"}</td>
                  <td>{u.topArea ? t.labels.area[u.topArea as keyof typeof t.labels.area] ?? u.topArea : "—"}</td>
                  <td className="ad-cell-trunc" title={u.workspaces.join(", ")}>{u.workspaces.length ? u.workspaces.join(", ") : t.admin.personal}</td>
                  <td className="ad-cell-trunc">{u.device ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.users.length > 25 && (
          <button className="btn btn--ghost btn--sm" onClick={() => setShowAll((v) => !v)} style={{ alignSelf: "flex-start" }}>
            {showAll ? t.admin.seeLess : t.admin.seeAll(data.users.length)}
          </button>
        )}
        <p className="panel__hint">{t.admin.peopleHint}</p>
      </section>

      <AccessPanel initial={admins} me={me} />
    </div>
  );
}
