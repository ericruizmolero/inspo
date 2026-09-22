"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/WorkspaceMenu";
import AreaThumb from "./AreaThumb";
import { areaLabel, type ActivityOverview, type ActivityDay, type AdminEntry } from "@/lib/activity-core";
import { callsLabel, fmtUsd, type UsageOverview } from "@/lib/usage-core";
import { batchMarkdown, type FeedbackBatch, type FeedbackOverview } from "@/lib/feedback-core";

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
function namesList(names: string[], max = 3): string {
  const shown = names.slice(0, max), rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} y ${rest} más`;
  if (shown.length <= 1) return shown[0] ?? "";
  return `${shown.slice(0, -1).join(", ")} y ${shown[shown.length - 1]}`;
}

/** Para el eje de coste: "0,5 $", "2 $", "<0,01 $" no hace falta porque el eje empieza en 0 */
const fmtAxisUsd = (v: number) => (v === 0 ? "0 $" : `${(Math.round(v * 100) / 100).toString().replace(".", ",")} $`);

function ago(iso: string | null, now: number): string {
  if (!iso) return "nunca";
  const d = now - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

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

function Columns<T extends { date: string; label: string }>({ data, value, format, title, integer = false, unitOf }: {
  data: T[]; value: (d: T) => number; format: (v: number) => string; title: string; integer?: boolean;
  /** Unidad "limpia" según el máximo (p. ej. segundos → minutos u horas) para que las marcas caigan en valores redondos */
  unitOf?: (max: number) => number;
}) {
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
                  <text x={padL + i * band + band / 2} y={H - 6} textAnchor="middle" className="ad-chart__tick">{d.label}</text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {h && hover !== null && (
        <div className="ad-tip" style={{ left: Math.min(Math.max(padL + hover * band + band / 2, 60), Math.max(60, width - 60)) }}>
          <span className="ad-tip__label">{h.label}</span>
          <span className="ad-tip__value">{format(vals[hover])}</span>
        </div>
      )}
    </div>
  );
}

// ─── Quién puede ver el panel ────────────────────────────────────────────────

function AccessPanel({ initial, me }: { initial: AdminEntry[]; me: string }) {
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
    const res = await fetch("/api/admin/accesos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: value }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "No se pudo dar acceso"); return; }
    setEmail("");
    setMsg(data.added ? (data.mailed ? `${value} ya tiene acceso. Le hemos avisado por correo.` : `${value} ya tiene acceso.`) : `${value} ya tenía acceso.`);
    router.refresh();
  };

  const remove = async (a: AdminEntry) => {
    if (!confirm(`¿Quitar el acceso a ${a.name ?? a.email}?`)) return;
    setBusy(true); setError(""); setMsg("");
    const res = await fetch(`/api/admin/accesos?email=${encodeURIComponent(a.email)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "No se pudo quitar"); return; }
    setAdmins((prev) => prev.filter((x) => x.email !== a.email));
    router.refresh();
  };

  return (
    <section className="panel">
      <div className="panel__head">
        <span className="panel__title">Quién puede ver este panel</span>
        <span className="panel__meta">{admins.length}</span>
      </div>
      <ul className="list">
        {admins.map((a) => (
          <li key={a.email} className="list__row">
            <UserAvatar name={a.name ?? a.email} small />
            <span className="list__main">
              <span className="list__name">{a.name ?? a.email}{a.email === me.toLowerCase() && <span className="list__you"> · tú</span>}</span>
              <span className="list__sub">
                {a.name ? `${a.email} · ` : ""}
                {a.fixed ? "acceso fijo" : `${a.name ? "" : "todavía sin cuenta · "}añadido por ${a.addedBy || "—"}${a.createdAt ? ` el ${new Date(a.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}` : ""}`}
              </span>
            </span>
            {!a.fixed && a.email !== me.toLowerCase() && (
              <button className="btn btn--ghost btn--sm" onClick={() => remove(a)} disabled={busy}>Quitar</button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="invite">
        <input className="input" type="email" placeholder="correo@socio.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button className="btn btn--primary" type="submit" disabled={busy || !email.trim()}>Dar acceso</button>
      </form>
      {error && <p className="modal__error">{error}</p>}
      {msg && <p className="page__ok">{msg}</p>}
      <p className="panel__hint">
        Quien esté aquí ve la actividad de todas las personas y equipos, y puede dar o quitar acceso a otros. Basta con que entre en Inspo con ese correo: le aparece "Actividad de la app" en el menú de cuenta.
      </p>
    </section>
  );
}

// ─── Feedback de la barra (Agentation) ───────────────────────────────────────

function CopyMarkdown({ batch }: { batch: FeedbackBatch }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(batchMarkdown(batch)); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* sin portapapeles */ }
  };
  return <button className="btn btn--ghost btn--sm" onClick={copy}>{done ? "Copiado" : "Copiar para el agente"}</button>;
}

function FeedbackBatchView({ batch, now, onDelete }: { batch: FeedbackBatch; now: number; onDelete: (b: FeedbackBatch) => Promise<void> }) {
  const [open, setOpen] = useState(batch.notes.length <= 3);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    const n = batch.notes.length;
    if (!confirm(`¿Borrar ${n === 1 ? "esta nota" : `estas ${n} notas`} de ${batch.author.name} sobre ${batch.path}? No se puede deshacer.`)) return;
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
            <span className="fb__on"> sobre </span>
            <a className="fb__path" href={batch.url} target="_blank" rel="noopener noreferrer" title={batch.url}>{batch.path}</a>
          </span>
          <span className="list__sub" title={fmtDateTime(when)}>
            {batch.sentAt ? `enviado ${ago(batch.sentAt, now)}` : `sin enviar todavía · última nota ${ago(batch.updatedAt, now)}`}
            {batch.workspace ? ` · ${batch.workspace}` : ""}{batch.viewport ? ` · ${batch.viewport}` : ""}
            {` · ${batch.notes.length} ${batch.notes.length === 1 ? "nota" : "notas"}`}
          </span>
        </span>
        {!batch.sentAt && <span className="fb__draft">Borrador</span>}
        <CopyMarkdown batch={batch} />
        <button className="btn btn--ghost btn--sm" onClick={remove} disabled={busy} aria-label="Borrar este feedback">{busy ? <span className="spinner" /> : "Borrar"}</button>
      </div>
      <ol className="fb__notes">
        {notes.map((n) => (
          <li key={n.id} className="fb__note">
            <span className="fb__el" title={n.elementPath}>{n.element}{n.sourceFile ? <span className="fb__src"> · {n.sourceFile}</span> : null}</span>
            {n.selectedText && <q className="fb__quote">{n.selectedText}</q>}
            <p className="fb__comment">{n.comment || <span className="fb__empty">sin comentario</span>}</p>
          </li>
        ))}
      </ol>
      {batch.notes.length > 3 && (
        <button className="fb__more" onClick={() => setOpen((v) => !v)}>{open ? "Ver menos" : `Ver las ${batch.notes.length} notas`}</button>
      )}
    </li>
  );
}

function FeedbackPanel({ feedback, now }: { feedback: FeedbackOverview; now: number }) {
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
    const res = await fetch("/api/admin/feedback", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: b.notes.map((n) => n.id) }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? "No se pudo borrar"); return; }
    setGone((prev) => new Set(prev).add(b.key));
    router.refresh();
  };
  return (
    <section className="panel">
      <div className="panel__head">
        <span className="panel__title">Feedback de la barra</span>
        <span className="panel__meta">
          {feedback.notes ? `${feedback.notes} ${feedback.notes === 1 ? "nota" : "notas"} · ${feedback.sent} ${feedback.sent === 1 ? "envío" : "envíos"}${feedback.pending ? ` · ${feedback.pending} sin enviar` : ""} · ${feedback.people} ${feedback.people === 1 ? "persona" : "personas"}` : `últimos ${feedback.days} días`}
        </span>
      </div>
      {all.length === 0 ? (
        <p className="panel__hint">Nadie ha dejado notas con la barra de feedback en los últimos {feedback.days} días. Cuando alguien pulse "Enviar al equipo" llega por correo y aparece aquí.</p>
      ) : (
        <ul className="fb-list">
          {batches.map((b) => <FeedbackBatchView key={b.key} batch={b} now={now} onDelete={onDelete} />)}
        </ul>
      )}
      {error && <p className="modal__error">{error}</p>}
      {all.length > 8 && (
        <button className="btn btn--ghost btn--sm" onClick={() => setShowAll((v) => !v)} style={{ alignSelf: "flex-start" }}>
          {showAll ? "Ver menos" : `Ver los ${all.length}`}
        </button>
      )}
      {feedback.batches.length > 0 && (
        <p className="panel__hint">
          Cada bloque es lo que una persona mandó de una vez sobre una página; "Copiar para el agente" da el mismo markdown del correo; "Borrar" quita el bloque para siempre. Los borradores son notas guardadas que aún no se han enviado.
        </p>
      )}
    </section>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export default function AdminPanel({ data, usage, feedback, admins, me }: { data: ActivityOverview; usage: UsageOverview; feedback: FeedbackOverview; admins: AdminEntry[]; me: string }) {
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
          <span className="ad-kpi__label"><span className={`ad-dot${k.online ? " is-on" : ""}`} aria-hidden />Conectadas ahora</span>
          <span className="ad-kpi__value">{k.online}</span>
          {online.length ? (
            <span className="ad-online" title={online.map((u) => u.name).join(", ")}>
              <span className="ad-online__avatars">
                {online.slice(0, 5).map((u) => <UserAvatar key={u.id} name={u.name} image={u.image} small />)}
              </span>
              <span className="ad-online__names">{namesList(online.map((u) => u.name))}</span>
            </span>
          ) : (
            <span className="ad-kpi__sub">con la app abierta en los últimos 2 min</span>
          )}
        </div>
        <div className="ad-kpi">
          <span className="ad-kpi__label">Activas hoy</span>
          <span className="ad-kpi__value">{k.activeToday}</span>
          <span className="ad-kpi__sub">{k.active7} en 7 días · {k.active30} en 30</span>
        </div>
        <div className="ad-kpi">
          <span className="ad-kpi__label">Con sesión abierta</span>
          <span className="ad-kpi__value">{k.loggedIn}</span>
          <span className="ad-kpi__sub">logeadas, sin caducar (30 días)</span>
        </div>
        <div className="ad-kpi">
          <span className="ad-kpi__label">Registradas</span>
          <span className="ad-kpi__value">{k.totalUsers}</span>
          <span className="ad-kpi__sub">{k.newUsers ? `${k.newUsers} nuevas en ${data.days} días` : `ninguna nueva en ${data.days} días`}</span>
        </div>
        <div className="ad-kpi">
          <span className="ad-kpi__label">Tiempo en la app</span>
          <span className="ad-kpi__value ad-kpi__value--text">{fmtDur(k.seconds)}</span>
          <span className="ad-kpi__sub">{k.avgSeconds ? `${fmtDur(k.avgSeconds)} de media por persona activa` : `en ${data.days} días`}</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">Por día</span>
          <span className="panel__meta">últimos {data.days} días</span>
        </div>
        {data.kpis.seconds === 0 && data.daily.every((d) => d.users === 0) ? (
          <p className="panel__hint">Todavía no hay actividad medida. Cada persona con la app abierta manda un latido cada 20 segundos; en cuanto alguien entre, aparecerá aquí.</p>
        ) : (
          <div className="ad-charts">
            <Columns data={data.daily} title="Personas activas" value={(d) => d.users} format={(v) => String(Math.round(v))} integer />
            <Columns data={data.daily} title="Tiempo en la app" value={(d) => d.seconds} format={fmtAxisDur} unitOf={(m) => (m >= 3600 ? 3600 : m >= 60 ? 60 : 1)} />
          </div>
        )}
      </section>

      <div className="ad-cols">
        <section className="panel">
          <div className="panel__head">
            <span className="panel__title">Dónde pasan el tiempo</span>
            <span className="panel__meta">últimos {data.days} días</span>
          </div>
          {data.areas.length === 0 ? (
            <p className="panel__hint">Sin datos todavía.</p>
          ) : (
            <ul className="ad-areas">
              {data.areas.map((a) => (
                <li key={a.area} className="ad-area">
                  <AreaThumb area={a.area} label={a.label} />
                  <span className="ad-area__body">
                    <span className="ad-area__head">
                      <span className="ad-area__name">{a.label}</span>
                      <span className="ad-area__meta">{a.users} {a.users === 1 ? "persona" : "personas"}</span>
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
            <span className="panel__title">Últimos accesos</span>
            <span className="panel__meta">inicios de sesión</span>
          </div>
          {data.logins.length === 0 ? (
            <p className="panel__hint">Nadie ha iniciado sesión todavía.</p>
          ) : (
            <ul className="list">
              {data.logins.map((l, i) => (
                <li key={`${l.userId}-${i}`} className="list__row">
                  <UserAvatar name={l.name} image={l.image} small />
                  <span className="list__main">
                    <span className="list__name">{l.name}</span>
                    <span className="list__sub">{fmtDateTime(l.at)}{l.device ? ` · ${l.device}` : ""}{l.alive ? "" : " · caducada"}</span>
                  </span>
                  <span className="list__role">{ago(l.at, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">Uso de IA</span>
          <span className="panel__meta">últimos {usage.days} días</span>
        </div>
        <div className="ad-usage-kpis">
          <div className="ad-usage-kpi">
            <span className="ad-kpi__label">Coste estimado</span>
            <span className="ad-kpi__value ad-usage-kpi__value">{fmtUsd(usage.totalUsd)}</span>
          </div>
          <div className="ad-usage-kpi">
            <span className="ad-kpi__label">Por persona que ha usado IA</span>
            <span className="ad-kpi__value ad-usage-kpi__value">{fmtUsd(usage.people ? usage.totalUsd / usage.people : 0)}</span>
            <span className="ad-kpi__sub">{usage.people} {usage.people === 1 ? "persona" : "personas"}</span>
          </div>
          <div className="ad-usage-kpi">
            <span className="ad-kpi__label">Llamadas</span>
            <span className="ad-kpi__value ad-usage-kpi__value">{usage.calls}</span>
            <span className="ad-kpi__sub">{usage.calls ? `${fmtUsd(usage.totalUsd / usage.calls)} de media` : "a Claude y a Jev"}</span>
          </div>
        </div>
        {usage.calls === 0 ? (
          <p className="panel__hint">Todavía no hay llamadas registradas en este periodo. Cada DESIGN.md, etiquetado o búsqueda IA queda apuntado con su coste estimado.</p>
        ) : (
          <>
            <div className="ad-charts">
              <Columns data={usage.daily} title="Coste por día" value={(d) => d.usd} format={fmtAxisUsd} />
              <Columns data={usage.daily} title="Llamadas por día" value={(d) => d.calls} format={(v) => String(Math.round(v))} integer />
            </div>
            <div className="ad-cols ad-cols--inner">
              <div className="ad-sub">
                <span className="ad-sub__title">Por acción</span>
                <ul className="ad-areas">
                  {usage.byAction.map((a) => (
                    <li key={a.action} className="ad-area">
                      <span className="ad-area__body">
                        <span className="ad-area__head">
                          <span className="ad-area__name">{a.label}</span>
                          <span className="ad-area__meta">{callsLabel(a.action, a.calls, a.units)}</span>
                          <span className="ad-area__value">{fmtUsd(a.usd)}</span>
                        </span>
                        <span className="ad-area__bar"><span style={{ width: `${maxAction ? Math.max(1, (a.usd / maxAction) * 100) : 0}%` }} /></span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="ad-sub">
                <span className="ad-sub__title">Por equipo</span>
                <ul className="list">
                  {usage.byWorkspace.map((w) => (
                    <li key={w.id} className="list__row">
                      <span className="list__main">
                        <span className="list__name">{w.name}</span>
                        <span className="list__sub">{w.kind === "personal" ? "espacio personal · " : ""}{w.calls} {w.calls === 1 ? "llamada" : "llamadas"}</span>
                      </span>
                      <span className="list__role">{fmtUsd(w.usd)}</span>
                    </li>
                  ))}
                </ul>
                <span className="ad-sub__title" style={{ marginTop: 8 }}>Por persona</span>
                <ul className="list">
                  {usage.byUser.map((u) => (
                    <li key={u.userId ?? "sys"} className="list__row">
                      <UserAvatar name={u.name} image={u.image} small />
                      <span className="list__main">
                        <span className="list__name">{u.name}</span>
                        <span className="list__sub">{u.email ? `${u.email} · ` : ""}{u.calls} {u.calls === 1 ? "llamada" : "llamadas"}</span>
                      </span>
                      <span className="list__role">{fmtUsd(u.usd)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
        <p className="panel__hint">Coste estimado con la tarifa pública de Anthropic y de Jev, sumando todos los equipos. Sirve para dimensionar el pricing, no es la factura.</p>
      </section>

      <FeedbackPanel feedback={feedback} now={now} />

      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">Personas</span>
          <span className="panel__meta">{data.users.length} registradas · tiempo de los últimos {data.days} días</span>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Estado</th>
                <th>Última vez</th>
                <th className="ad-num">Tiempo</th>
                <th className="ad-num">Visitas</th>
                <th>Dónde más</th>
                <th>Equipos</th>
                <th>Dispositivo</th>
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
                      <span className="ad-state ad-state--on"><span className="ad-dot is-on" aria-hidden />Conectada</span>
                    ) : u.openSessions > 0 ? (
                      <span className="ad-state">Sesión abierta</span>
                    ) : (
                      <span className="ad-state ad-state--off">Sin sesión</span>
                    )}
                  </td>
                  <td title={u.lastSeenAt ? fmtDateTime(u.lastSeenAt) : u.lastLoginAt ? `Acceso: ${fmtDateTime(u.lastLoginAt)}` : undefined}>
                    {u.lastSeenAt ? ago(u.lastSeenAt, now) : u.lastLoginAt ? `acceso ${ago(u.lastLoginAt, now)}` : "nunca"}
                  </td>
                  <td className="ad-num">{u.seconds ? fmtDur(u.seconds) : "—"}</td>
                  <td className="ad-num">{u.visits || "—"}</td>
                  <td>{u.topArea ? areaLabel(u.topArea) : "—"}</td>
                  <td className="ad-cell-trunc" title={u.workspaces.join(", ")}>{u.workspaces.length ? u.workspaces.join(", ") : "Personal"}</td>
                  <td className="ad-cell-trunc">{u.device ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.users.length > 25 && (
          <button className="btn btn--ghost btn--sm" onClick={() => setShowAll((v) => !v)} style={{ alignSelf: "flex-start" }}>
            {showAll ? "Ver menos" : `Ver las ${data.users.length}`}
          </button>
        )}
        <p className="panel__hint">
          "Conectada" es quien ha mandado un latido en los últimos 2 minutos. "Sesión abierta" es quien tiene la cookie viva aunque no esté en la app. El tiempo solo cuenta con la pestaña visible.
        </p>
      </section>

      <AccessPanel initial={admins} me={me} />
    </div>
  );
}
