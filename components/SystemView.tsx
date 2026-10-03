"use client";
// The project's system as the first thing you see in a project: a bento of light cards, one per area,
// each showing the material behind the decision (the palette, the families, the radii, the easing, the
// captures) instead of describing it. A card is a negotiation between the board (the model proposes,
// with a confidence) and the team (confirms, rewrites, steps back, hands it back to the board).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InspoItem, Project } from "@/types/inspo";
import { SYSTEM_AREAS, confidenceOf, emptySystem, staleness, DECISION_MAX, type ProjectSystem, type SystemArea, type SystemAreaState, type SystemEvidence, type AreaCandidate, type AreaCuration } from "@/types/system";
import type { AreaOption, AreaRevision, RefVisual } from "@/lib/system";
import { renderCriterioMd } from "@/lib/criterio-md";
import { loadSystem, loadSystemVisuals, decideSystemArea, releaseSystemArea, undoSystemArea, setSystemVerdict } from "@/app/actions/system";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { cachedCardImage } from "./InspoCard";
import { Button } from "@/components/ui/button";

interface Props {
  project: Project;
  system: ProjectSystem | null;
  onSystem: (system: ProjectSystem) => void;
  /** The references in the project */
  board: InspoItem[];
  /** The whole library: evidence may point at a reference that left the project */
  library: InspoItem[];
  imageOf: (item: InspoItem) => string | null;
  /** Switch to the board (Curar) */
  onOpenBoard: () => void;
  /** Open this area from outside (the agent's "go to motion"); `n` makes the same area open again */
  focusArea?: { area: SystemArea; n: number } | null;
  onOpenChange?: (area: SystemArea | null) => void;
}

// ─── Reading the material ────────────────────────────────────────────────────

const SERIF = /serif|kalice|louize|tiempos|canela|garamond|times|georgia|playfair|editorial|freight|caslon|baskerville|didot|bodoni|minion|literata|lora|merriweather|spectral|fraunces|newsreader|reckless|ogg|roslindale|signifier|domaine|gt sectra|gt alpina|sabon|cardo|cormorant/i;
const MONO = /mono|courier|menlo|jetbrains|fira code|source code|consolas/i;
const fontStack = (family: string) => `"${family}", ${MONO.test(family) ? "ui-monospace, monospace" : SERIF.test(family) ? "Georgia, 'Times New Roman', serif" : "'Inter', system-ui, sans-serif"}`;

const luminance = (hex: string) => {
  const m = hex.replace("#", "").slice(0, 6);
  if (m.length < 6) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function palette(vs: RefVisual[], max = 12) {
  const seen = new Set<string>();
  const all = vs.flatMap((v) => v.colors).filter((c) => { const k = c.hex.toLowerCase().slice(0, 7); if (seen.has(k)) return false; seen.add(k); return true; });
  // Neutrals dark to light, then the brand and accent colours; semantic ones (success, warning) are not a palette
  const rank = { neutral: 0, brand: 1, accent: 2, semantic: 3 } as const;
  return all.filter((c) => c.group !== "semantic").sort((a, b) => rank[a.group] - rank[b.group] || luminance(a.hex) - luminance(b.hex)).slice(0, max);
}
function families(vs: RefVisual[]) {
  const seen = new Set<string>();
  const rank = { display: 0, body: 1, ui: 2, mono: 3 } as const;
  return vs.flatMap((v) => v.fonts).filter((f) => { const k = f.family.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => rank[a.role] - rank[b.role]);
}
function radii(vs: RefVisual[]) {
  const seen = new Set<string>();
  return vs.flatMap((v) => v.radii).filter((r) => /\d/.test(r.value) && !seen.has(r.value) && seen.add(r.value)).slice(0, 6);
}
const BEZIER: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1], "ease-in": [0.42, 0, 1, 1], "ease-out": [0, 0, 0.58, 1], "ease-in-out": [0.42, 0, 0.58, 1], linear: [0, 0, 1, 1],
};
function bezierOf(easing: string): [number, number, number, number] {
  const m = easing.match(/cubic-bezier\(([^)]+)\)/);
  if (m) { const n = m[1].split(",").map((x) => parseFloat(x)); if (n.length === 4 && n.every((x) => Number.isFinite(x))) return n as [number, number, number, number]; }
  return BEZIER[easing] ?? BEZIER.ease;
}

function Thumb({ item, image }: { item: InspoItem; image: string | null }) {
  const [at, setAt] = useState(0);
  const srcs = [image, cachedCardImage(item.web), `/api/og?url=${encodeURIComponent(item.web)}`].filter((x): x is string => !!x);
  const src = srcs[at];
  return <span className="sysv-thumb" aria-hidden>{src ? <img key={src} src={src} alt="" loading="lazy" decoding="async" onError={() => setAt((i) => i + 1)} /> : item.name.slice(0, 1).toUpperCase()}</span>;
}

// ─── Specimens ───────────────────────────────────────────────────────────────

function Palette({ vs }: { vs: RefVisual[] }) {
  const colors = palette(vs);
  if (!colors.length) return null;
  return (
    <div className="sysv-palette">
      {colors.map((c) => (
        <span key={c.hex} className="sysv-swatch" title={`${c.name} ${c.hex}`}>
          <i style={{ background: c.hex }} />
          <small>{c.hex.slice(0, 7)}</small>
        </span>
      ))}
    </div>
  );
}

function TypeSpecimen({ vs, sample }: { vs: RefVisual[]; sample: string }) {
  const fams = families(vs);
  if (!fams.length) return null;
  const display = fams.find((f) => f.role === "display") ?? fams[0];
  const body = fams.find((f) => f.role === "body") ?? fams.find((f) => f !== display) ?? display;
  return (
    <div className="sysv-type">
      <div className="sysv-type__display" style={{ fontFamily: fontStack(display.family), fontWeight: display.weights[0] ?? 500 }}>{sample}</div>
      <div className="sysv-type__body" style={{ fontFamily: fontStack(body.family) }}>{display.family} · {body.family}</div>
      <div className="sysv-chips">{fams.slice(0, 5).map((f) => <span key={f.family} className="sysv-chip"><b>{f.family}</b> {f.role}</span>)}</div>
    </div>
  );
}

function Radii({ vs }: { vs: RefVisual[] }) {
  const list = radii(vs);
  if (!list.length) return null;
  return (
    <div className="sysv-radii">
      {list.map((r) => <span key={r.value} className="sysv-radius" title={r.element}><i style={{ borderRadius: r.value }} /><small>{r.value}</small></span>)}
    </div>
  );
}

function Motion({ vs }: { vs: RefVisual[] }) {
  const hit = vs.find((v) => v.easing);
  const easing = hit?.easing ?? "ease";
  const ms = hit?.durationMs ?? 400;
  const [x1, y1, x2, y2] = bezierOf(easing);
  const W = 200, H = 120, P = 12;
  const X = (x: number) => P + x * (W - 2 * P), Y = (y: number) => H - P - y * (H - 2 * P);
  const d = `M ${X(0)} ${Y(0)} C ${X(x1)} ${Y(y1)}, ${X(x2)} ${Y(y2)}, ${X(1)} ${Y(1)}`;
  return (
    <div className="sysv-motion">
      <svg viewBox={`0 0 ${W} ${H}`} className="sysv-motion__curve" aria-hidden>
        <line x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} className="sysv-motion__diag" />
        <path d={d} className="sysv-motion__path" />
        <circle cx={X(x1)} cy={Y(y1)} r="3" className="sysv-motion__handle" /><circle cx={X(x2)} cy={Y(y2)} r="3" className="sysv-motion__handle" />
      </svg>
      <div className="sysv-motion__track"><i style={{ animationTimingFunction: easing.startsWith("cubic") || easing in BEZIER ? easing : "ease", animationDuration: `${Math.max(300, Math.min(ms, 2000))}ms` }} /></div>
      <small className="sysv-motion__label">{easing} · {ms} ms{hit ? "" : " (por defecto)"}</small>
    </div>
  );
}

function Mosaic({ vs, strips = false }: { vs: RefVisual[]; strips?: boolean }) {
  const imgs = vs.map((v) => (strips ? v.scroll ?? v.cover : v.cover ?? v.scroll)).filter((x): x is string => !!x).slice(0, strips ? 3 : 4);
  if (!imgs.length) return null;
  return <div className={`sysv-mosaic${strips ? " sysv-mosaic--strips" : ""}`}>{imgs.map((src) => <img key={src} src={src} alt="" loading="lazy" decoding="async" />)}</div>;
}

function Logos({ vs }: { vs: RefVisual[] }) {
  const logos = vs.map((v) => v.logo).filter((x): x is string => !!x).slice(0, 4);
  if (!logos.length) return null;
  return <div className="sysv-logos">{logos.map((src) => <img key={src} src={src} alt="" loading="lazy" decoding="async" />)}</div>;
}

function IconSet({ vs }: { vs: RefVisual[] }) {
  const icons = vs.flatMap((v) => v.icons).slice(0, 16);
  if (!icons.length) return null;
  // The markup comes from the sheets this app generated (standalone svg elements)
  return <div className="sysv-icons">{icons.map((svg, i) => <span key={i} dangerouslySetInnerHTML={{ __html: svg }} />)}</div>;
}


// ─── The table: everything the board offers for the area, curated by the agent ─────────────────

function CandidateSpecimen({ c, sample }: { c: AreaCandidate; sample: string }) {
  const v = c.visual;
  // The project's first word as the specimen, when it fits; otherwise the classic pair
  const word = sample.split(/\s+/)[0] ?? "";
  const specimen = word.length >= 2 && word.length <= 9 ? word : "Aa";
  if (v.families?.length) { const f = v.families[0]; return <span className="sysc-spec sysc-spec--type" style={{ fontFamily: fontStack(f.family), fontWeight: f.weights[0] ?? 500 }}>{specimen}</span>; }
  if (v.colors?.length) return <span className="sysc-spec sysc-spec--colors">{v.colors.slice(0, 8).map((x) => <i key={x.hex} style={{ background: x.hex }} title={`${x.name} ${x.hex}`} />)}</span>;
  if (v.easing) { const [x1, y1, x2, y2] = bezierOf(v.easing); return <span className="sysc-spec sysc-spec--motion"><svg viewBox="0 0 60 36" aria-hidden><path d={`M 3 33 C ${3 + x1 * 54} ${33 - y1 * 30}, ${3 + x2 * 54} ${33 - y2 * 30}, 57 3`} /></svg><i style={{ animationTimingFunction: v.easing, animationDuration: `${Math.max(300, Math.min(v.durationMs ?? 400, 2000))}ms` }} /></span>; }
  if (v.icons?.length) return <span className="sysc-spec sysc-spec--icons">{v.icons.slice(0, 6).map((svg, i) => <i key={i} dangerouslySetInnerHTML={{ __html: svg }} />)}</span>;
  if (v.image) return <span className="sysc-spec sysc-spec--img"><img src={v.image} alt="" loading="lazy" decoding="async" /></span>;
  if (v.text) return <span className="sysc-spec sysc-spec--text">“{v.text.slice(0, 120)}”</span>;
  return null;
}

function AreaTable({ curation, sample, busy, itemOf, imageOf, onFlip, onReason }: {
  curation: AreaCuration; sample: string; busy: boolean;
  itemOf: (id: string) => InspoItem | undefined; imageOf: (item: InspoItem) => string | null;
  onFlip: (id: string, keep: boolean) => void; onReason: (id: string, reason: string) => void;
}) {
  const { t } = useT();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const verdictOf = (id: string) => curation.verdicts.find((v) => v.id === id);
  const kept = curation.candidates.filter((c) => verdictOf(c.id)?.keep);
  const out = curation.candidates.filter((c) => !verdictOf(c.id)?.keep);
  const row = (c: AreaCandidate) => {
    const v = verdictOf(c.id);
    const refs = c.refs.map((id) => itemOf(id)).filter((x): x is InspoItem => !!x);
    return (
      <li key={c.id} className={`sysc${v?.keep ? " is-kept" : " is-out"}${v?.byTeam ? " is-team" : ""}`}>
        <CandidateSpecimen c={c} sample={sample} />
        <div className="sysc__text">
          <span className="sysc__label">{c.label}{c.detail && <small>{c.detail}</small>}</span>
          {editing === c.id ? (
            <input className="input sysc__reason-input" value={draft} autoFocus maxLength={160} onChange={(e) => setDraft(e.target.value)}
              onBlur={() => { if (draft.trim() !== (v?.reason ?? "")) onReason(c.id, draft.trim()); setEditing(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(null); }} />
          ) : (
            <button type="button" className="sysc__reason" title={t.system.editReason} onClick={() => { setDraft(v?.reason ?? ""); setEditing(c.id); }}>{v?.reason || t.system.noReason}</button>
          )}
          <span className="sysv-thumbs">{refs.slice(0, 5).map((it) => <Thumb key={it.id} item={it} image={imageOf(it)} />)}</span>
        </div>
        <button type="button" className={`sysc__verdict${v?.keep ? " is-kept" : ""}`} disabled={busy} aria-pressed={!!v?.keep} onClick={() => onFlip(c.id, !v?.keep)}>
          {v?.keep ? <>{Icons.check} {t.system.kept}</> : t.system.discarded}
        </button>
      </li>
    );
  };
  return (
    <div className="sysc-table">
      <p className="sysv-muted">{t.system.tableHint(curation.candidates.length, kept.length)}</p>
      <ul className="sysc-list">{kept.map(row)}{out.map(row)}</ul>
    </div>
  );
}

// ─── A card ──────────────────────────────────────────────────────────────────

interface TileProps {
  area: SystemAreaState;
  label: string;
  visuals: RefVisual[];
  /** True when the material shown is the whole board's, because the area has no evidence yet */
  fromBoard: boolean;
  sample: string;
  history: AreaRevision[];
  busy: boolean;
  running: boolean;
  hasBoard: boolean;
  itemOf: (id: string) => InspoItem | undefined;
  imageOf: (item: InspoItem) => string | null;
  onDecide: (decision: string, evidence?: SystemEvidence[], why?: string) => Promise<void>;
  onRelease: () => Promise<void>;
  onUndo: () => Promise<void>;
  onOptions: (itemIds?: string[]) => Promise<AreaOption[]>;
  /** The agent curates the table (again, keeping what the team fixed) */
  onCurate: (keep?: Record<string, boolean>) => Promise<void>;
  onVerdict: (id: string, keep: boolean, reason?: string) => Promise<void>;
  curating: boolean;
  /** Picking references on the ring for this area: how many are chosen, and the controls */
  picking: { active: boolean; count: number; start: () => void; stop: () => void; propose: () => Promise<AreaOption[]> } | null;
}

const headlineOf = (decision: string) => {
  const first = decision.split(/(?<=[.:;])\s/)[0] ?? decision;
  return first.length > 72 ? `${first.slice(0, 70).replace(/\s+\S*$/, "")}…` : first;
};

function Tile({ area, label, visuals, fromBoard, sample, history, busy, running, hasBoard, itemOf, imageOf, onDecide, onRelease, onUndo, onOptions, picking, onCurate, onVerdict, curating }: TileProps) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(area.decision);
  const [whyDraft, setWhyDraft] = useState(area.why);
  useEffect(() => { setWhyDraft(area.why); }, [area.why]);
  const [options, setOptions] = useState<AreaOption[] | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const text = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { if (!editing) setDraft(area.decision); }, [area.decision, editing]);
  useEffect(() => { if (area.source === "team") setOptions(null); }, [area.source]);
  useEffect(() => { if (editing) { const el = text.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } } }, [editing]);

  const level = confidenceOf(area);
  const evidence = area.evidence.map((e) => ({ ...e, item: itemOf(e.itemId) })).filter((e) => e.item);
  const polish = async (fn: () => Promise<AreaOption[]> = onOptions) => { setLoadingOptions(true); try { setOptions(await fn()); picking?.stop(); } catch { /* the error shows in the middle */ } finally { setLoadingOptions(false); } };
  const save = async () => { if (draft.trim() === area.decision.trim() && whyDraft.trim() === area.why.trim()) { setEditing(false); return; } await onDecide(draft, undefined, whyDraft); setEditing(false); };

  const specimen = (() => {
    switch (area.area) {
      case "typography": return <TypeSpecimen vs={visuals} sample={sample} />;
      case "color": return <Palette vs={visuals} />;
      case "layout": return <><Mosaic vs={visuals} /><Radii vs={visuals} /></>;
      case "motion": return <Motion vs={visuals} />;
      case "imagery": return <Mosaic vs={visuals} strips />;
      case "logo": return <Logos vs={visuals} />;
      case "iconography": return <IconSet vs={visuals} />;
      case "voice": return area.decision ? <blockquote className="sysv-quote" style={{ fontFamily: fontStack(families(visuals).find((f) => f.role === "display")?.family ?? "Inter") }}>{headlineOf(area.decision)}</blockquote> : null;
    }
  })();
  const status = area.source === "team" ? t.system.confidence.team : level === "high" ? t.system.confidence.high : level === "low" ? t.system.confidence.low : null;

  return (
    <article className={`sysv-tile sysv-tile--${area.area} is-${level}${area.source === "team" ? " is-team" : ""}${options ? " is-options" : ""}${busy || running ? " is-busy" : ""}`} aria-busy={busy || running || loadingOptions}>
      <header className="sysv-tile__head">
        <span className="sysv-tile__eyebrow">{label}</span>
        <span className="sysv-tile__tools">
          {area.decision && area.source === "model" && <button type="button" className="sysv-tool sysv-tool--ok" disabled={busy} title={t.system.confirm} aria-label={t.system.confirm} onClick={() => void onDecide(area.decision)}>{Icons.check}</button>}
          {hasBoard && area.source !== "team" && <button type="button" className="sysv-tool" disabled={busy} title={t.system.polishArea} aria-label={t.system.polishArea} onClick={() => void polish()}>{Icons.gem}</button>}
          {hasBoard && <button type="button" className="sysv-tool" disabled={busy || curating} title={area.curation ? t.system.recurate : t.system.curate} aria-label={area.curation ? t.system.recurate : t.system.curate} onClick={() => void onCurate(area.curation ? Object.fromEntries(area.curation.verdicts.filter((v) => v.byTeam).map((v) => [v.id, v.keep])) : undefined)}>{Icons.spark}</button>}
          {picking && <button type="button" className={`sysv-tool${picking.active ? " is-on" : ""}`} disabled={busy} title={t.system.pickRefs} aria-label={t.system.pickRefs} aria-pressed={picking.active} onClick={() => (picking.active ? picking.stop() : picking.start())}>{Icons.all}</button>}
          <button type="button" className="sysv-tool" disabled={busy} title={area.decision ? t.system.edit : t.system.write} aria-label={area.decision ? t.system.edit : t.system.write} onClick={() => setEditing(true)}>{Icons.sliders}</button>
          {history.length > 0 && <button type="button" className="sysv-tool" disabled={busy} title={t.system.undo} aria-label={t.system.undo} onClick={() => void onUndo()}>{Icons.shuffle}</button>}
          {area.source === "team" && <button type="button" className="sysv-tool" disabled={busy} title={t.system.release} aria-label={t.system.release} onClick={() => void onRelease()}>{Icons.compass}</button>}
          {area.decision && <button type="button" className="sysv-tool sysv-tool--danger" disabled={busy} title={t.system.clear} aria-label={t.system.clear} onClick={() => void onDecide("")}>{Icons.x}</button>}
        </span>
      </header>

      {loadingOptions ? (
        <div className="sysv-options"><p className="sysv-muted"><span className="spinner spinner--sm" /> {t.system.polishing}</p></div>
      ) : options ? (
        <div className="sysv-options">
          <p className="sysv-muted">{t.system.optionsHint}</p>
          {options.map((o, i) => {
            const refs = o.evidence.map((e) => ({ ...e, item: itemOf(e.itemId) })).filter((e) => e.item);
            return (
              <div key={i} className="sysv-option">
                <p className="sysv-option__text">{o.decision}</p>
                {o.why && <p className="sysv-muted">{o.why}</p>}
                <div className="sysv-option__row">
                  <span className="sysv-thumbs">{refs.slice(0, 6).map((e) => <Thumb key={e.itemId} item={e.item!} image={imageOf(e.item!)} />)}</span>
                  <Button variant="primary" size="sm" disabled={busy} onClick={() => void onDecide(o.decision, o.evidence)}>{Icons.check} {t.system.pick}</Button>
                </div>
              </div>
            );
          })}
          <Button variant="ghost" size="sm" onClick={() => setOptions(null)}>{t.system.cancel}</Button>
        </div>
      ) : (
        <>
          {picking?.active && (
            <div className="sysv-picking">
              <p className="sysv-muted">{t.system.pickingHint}</p>
              <div className="sysv-edit__row">
                <Button variant="primary" size="sm" disabled={busy || picking.count === 0} onClick={() => void polish(picking.propose)}>{Icons.spark} {t.system.proposeWith(picking.count)}</Button>
                <Button variant="ghost" size="sm" onClick={picking.stop}>{t.system.cancel}</Button>
              </div>
            </div>
          )}
          <h3 className="sysv-tile__title">{area.decision ? headlineOf(area.decision) : t.system.empty}</h3>
          {curating ? (
            <p className="sysv-muted"><span className="spinner spinner--sm" /> {t.system.curating}</p>
          ) : area.curation ? (
            <AreaTable curation={area.curation} sample={sample} busy={busy} itemOf={itemOf} imageOf={imageOf}
              onFlip={(id, keep) => void onVerdict(id, keep)} onReason={(id, reason) => void onVerdict(id, area.curation!.verdicts.find((v) => v.id === id)?.keep ?? false, reason)} />
          ) : specimen && <div className={`sysv-tile__specimen${fromBoard ? " is-board" : ""}`}>{specimen}{fromBoard && <small className="sysv-tile__board-note">{t.system.fromBoard}</small>}</div>}

          {editing ? (
            <div className="sysv-edit">
              <textarea ref={text} className="input sysv-edit__text" rows={4} maxLength={DECISION_MAX} value={draft} placeholder={t.system.placeholder}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void save(); }} />
              <textarea className="input sysv-edit__text sysv-edit__why" rows={2} maxLength={400} value={whyDraft} placeholder={t.system.whyPlaceholder}
                onChange={(e) => setWhyDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void save(); }} />
              <div className="sysv-edit__row">
                <Button variant="primary" size="sm" disabled={busy} onClick={() => void save()}>{t.system.save}</Button>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(false)}>{t.system.cancel}</Button>
                <small className="sysv-muted">{t.system.editHint}</small>
              </div>
            </div>
          ) : area.decision ? (
            <div className="sysv-decision">
              <p className="sysv-tile__decision" onClick={() => setEditing(true)} title={t.system.edit}>{area.decision}</p>
              {area.why && <p className="sysv-why" onClick={() => setEditing(true)} title={t.system.edit}><b>{t.system.whyLabel}</b> {area.why}</p>}
              {area.source !== "team" && <Button variant="primary" size="sm" disabled={busy} onClick={() => void onDecide(area.decision, undefined, area.why)}>{Icons.check} {t.system.confirmWhy}</Button>}
            </div>
          ) : (
            <p className="sysv-tile__empty">{hasBoard ? t.system.emptyHint : t.system.noBoardShort}</p>
          )}

          <footer className="sysv-tile__foot">
            <span className={`sysv-status sysv-status--${area.source === "team" ? "team" : level}`}>
              {area.source === "team" && Icons.check}
              {status ?? t.system.open}
              {area.decision && area.source !== "team" && <i className="sysv-meter"><b style={{ width: `${area.confidence}%` }} /></i>}
            </span>
            {evidence.length > 0 && (
              <button type="button" className="sysv-evidence" onClick={() => setShowLog((o) => !o)} aria-expanded={showLog}>
                <span className="sysv-thumbs">{evidence.slice(0, 5).map((e) => <Thumb key={e.itemId} item={e.item!} image={imageOf(e.item!)} />)}</span>
                <span>{t.system.evidence(evidence.length)}</span>
              </button>
            )}
            {evidence.length === 0 && history.length > 0 && <button type="button" className="sysv-evidence" onClick={() => setShowLog((o) => !o)} aria-expanded={showLog}>{t.system.log}</button>}
          </footer>
          {showLog && (
            <div className="sysv-log">
              {evidence.map((e) => <div key={e.itemId} className="sysv-log__row"><b>{e.item!.name}</b>{e.take && <span>{e.take}</span>}</div>)}
              {history.slice(0, 4).map((h, i) => <div key={i} className="sysv-log__row sysv-log__row--hist"><b>{h.source === "model" ? t.system.theBoard : h.authorName}</b><span>{h.decision ? headlineOf(h.decision) : t.system.cleared}{h.why ? ` · ${h.why}` : ""} · {new Date(h.at).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>)}
            </div>
          )}
        </>
      )}
    </article>
  );
}

// ─── Mini specimens for the nodes ─────────────────────────────────────────────

function MiniSpecimen({ area, vs, sample }: { area: SystemAreaState; vs: RefVisual[]; sample: string }) {
  switch (area.area) {
    case "color": { const cs = palette(vs, 5); return cs.length ? <span className="sysn-mini sysn-mini--colors">{cs.map((c) => <i key={c.hex} style={{ background: c.hex }} />)}</span> : null; }
    case "typography": { const f = families(vs); const d = f.find((x) => x.role === "display") ?? f[0]; return d ? <span className="sysn-mini sysn-mini--type" style={{ fontFamily: fontStack(d.family) }}>Aa</span> : null; }
    case "layout": { const r = radii(vs)[0]; return <span className="sysn-mini sysn-mini--layout"><i style={{ borderRadius: r?.value ?? "4px" }} /><i style={{ borderRadius: r?.value ?? "4px" }} /><i style={{ borderRadius: r?.value ?? "4px" }} /></span>; }
    case "motion": { const [x1, y1, x2, y2] = bezierOf(vs.find((v) => v.easing)?.easing ?? "ease"); return <svg className="sysn-mini sysn-mini--motion" viewBox="0 0 40 24" aria-hidden><path d={`M 2 22 C ${2 + x1 * 36} ${22 - y1 * 20}, ${2 + x2 * 36} ${22 - y2 * 20}, 38 2`} /></svg>; }
    case "imagery": { const img = vs.map((v) => v.cover).find(Boolean); return img ? <span className="sysn-mini sysn-mini--img"><img src={img} alt="" loading="lazy" decoding="async" /></span> : null; }
    case "logo": { const img = vs.map((v) => v.logo).find(Boolean); return img ? <span className="sysn-mini sysn-mini--img"><img src={img} alt="" loading="lazy" decoding="async" /></span> : null; }
    case "iconography": { const ic = vs.flatMap((v) => v.icons).slice(0, 3); return ic.length ? <span className="sysn-mini sysn-mini--icons">{ic.map((svg, i) => <i key={i} dangerouslySetInnerHTML={{ __html: svg }} />)}</span> : null; }
    case "voice": return area.decision ? <span className="sysn-mini sysn-mini--voice">“</span> : null;
  }
}

// ─── Laying out the sea ─────────────────────────────────────────────────────────

interface Pt { x: number; y: number }
const TAU = Math.PI * 2;
const polar = (c: Pt, rx: number, ry: number, a: number): Pt => ({ x: c.x + Math.cos(a) * rx, y: c.y + Math.sin(a) * ry });
const circularMean = (angles: number[]) => Math.atan2(angles.reduce((s, a) => s + Math.sin(a), 0), angles.reduce((s, a) => s + Math.cos(a), 0));
/** Pushes angles apart on the ring until each has `min` radians of room, keeping their order */
function spread(angles: number[], min: number): number[] {
  const idx = angles.map((a, i) => [((a % TAU) + TAU) % TAU, i] as const).sort((p, q) => p[0] - q[0]);
  const out = idx.map(([a]) => a);
  for (let pass = 0; pass < 12; pass++) {
    for (let k = 0; k < out.length; k++) {
      const n = (k + 1) % out.length;
      let gap = out[n] - out[k]; if (n === 0) gap += TAU;
      if (gap < min) { const push = (min - gap) / 2; out[k] -= push; out[n] += push; }
    }
  }
  const res = new Array<number>(angles.length);
  idx.forEach(([, i], k) => { res[i] = out[k]; });
  return res;
}

// ─── The view ────────────────────────────────────────────────────────────────

export default function SystemView({ project, system, onSystem, board, library, imageOf, onOpenBoard, focusArea, onOpenChange }: Props) {
  const { t } = useT();
  const setSystem = onSystem;
  const [visuals, setVisuals] = useState<RefVisual[]>([]);
  const [history, setHistory] = useState<Record<string, AreaRevision[]>>({});
  const [boardStamp, setBoardStamp] = useState<{ stamp: string; itemIds: string[] } | null>(null);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<Set<SystemArea>>(() => new Set());
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<SystemArea | null>(null);
  useEffect(() => { if (focusArea) setOpen(focusArea.area); }, [focusArea]);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  // Picking: the team chooses, on the ring, the references an area should be decided from
  const [picking, setPicking] = useState<Set<string> | null>(null);
  useEffect(() => { setPicking(null); }, [open]);
  const [hover, setHover] = useState<string | null>(null);  // an area key or an item id
  const sea = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  useEffect(() => {
    const el = sea.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const run = useCallback(async () => {
    setRunning(true); setError("");
    try {
      const res = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id }) });
      const json = await res.json().catch(() => ({})) as ProjectSystem & { error?: string };
      if (!res.ok || json.error) throw new Error(json.error || t.system.failed);
      setSystem(json);
      setBoardStamp((b) => (b && json.run ? { stamp: json.run.stamp, itemIds: json.run.itemIds } : b));
      void loadSystem(project.id).then((r) => { if (r.ok) setHistory(r.data.history); });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setRunning(false); }
  }, [project.id, t, setSystem]);

  // Fresh on open, and the material behind it. A project with references and no reading reads itself
  useEffect(() => {
    let alive = true;
    loadSystem(project.id).then((r) => {
      if (!alive) return;
      if (!r.ok) { setError(r.error); if (!system) setSystem(emptySystem(project.id)); return; }
      setSystem(r.data.system); setBoardStamp(r.data.board); setHistory(r.data.history);
      if (!r.data.system.run && r.data.board.itemIds.length) void run();
    });
    loadSystemVisuals(project.id).then((r) => { if (alive && r.ok) setVisuals(r.data); });
    return () => { alive = false; };
  }, [project.id, board.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const itemOf = useMemo(() => { const m = new Map(library.filter((i) => i.id).map((i) => [i.id!, i])); return (id: string) => m.get(id); }, [library]);
  const labels = t.system.areas as Record<SystemArea, string>;
  const sys = system ?? emptySystem(project.id);
  const filled = sys.areas.filter((a) => a.decision).length;
  // How polished the system is: every area counts, a team decision as 100, an open area as 0
  const polishPct = Math.round(sys.areas.reduce((n, a) => n + (a.source === "team" ? 100 : a.decision ? a.confidence : 0), 0) / SYSTEM_AREAS.length);
  const stale = boardStamp ? staleness(sys, boardStamp.itemIds, boardStamp.stamp) : null;
  const byItem = useMemo(() => new Map(visuals.map((v) => [v.itemId, v])), [visuals]);
  const visualsFor = (a: SystemAreaState): { vs: RefVisual[]; fromBoard: boolean } => {
    const own = a.evidence.map((e) => byItem.get(e.itemId)).filter((v): v is RefVisual => !!v);
    return own.length ? { vs: own, fromBoard: false } : { vs: visuals, fromBoard: true };
  };

  // Geometry: the project in the middle, the areas on an inner ring, the references on an outer ring,
  // each near the areas it backs. Everything from numbers, so the lines and the nodes agree.
  const geo = useMemo(() => {
    // The top bar and the search dock take their room; the rings fit between them
    const top = 96, bottom = size.h - 150;
    const c: Pt = { x: size.w / 2, y: (top + bottom) / 2 };
    const narrow = size.w < 900;
    const r2 = { x: Math.min(size.w / 2 - 70, 760), y: Math.min((bottom - top) / 2 - 36, 430) };
    const r1 = { x: Math.min(r2.x * 0.62, 470), y: Math.min(r2.y * 0.68, 290) };
    // Eight slots on a rounded rectangle, so the cards never crowd at the sides the way an ellipse does
    const SLOTS: [number, number][] = [[-0.5, -1], [0.5, -1], [1, -0.4], [1, 0.42], [0.5, 1], [-0.5, 1], [-1, 0.42], [-1, -0.4]];
    const areaAngle = new Map<SystemArea, number>();
    const areas = SYSTEM_AREAS.map((k, i) => {
      const [sx, sy] = SLOTS[i];
      areaAngle.set(k, Math.atan2(sy * r1.y, sx * r1.x));
      return { key: k, x: c.x + sx * r1.x, y: c.y + sy * r1.y };
    });
    const refs = board.filter((i) => i.id);
    const backs = new Map<string, SystemArea[]>();
    for (const a of sys.areas) for (const e of a.evidence) backs.set(e.itemId, [...(backs.get(e.itemId) ?? []), a.area]);
    let want = refs.map((i, k) => { const bs = backs.get(i.id!) ?? []; return bs.length ? circularMean(bs.map((b) => areaAngle.get(b)!)) : -Math.PI / 2 + ((k + 0.5) / Math.max(refs.length, 1)) * TAU + Math.PI / 8; });
    want = spread(want, Math.min(TAU / Math.max(refs.length, 1), narrow ? 0.5 : 0.36));
    const items = refs.map((i, k) => ({ item: i, ...polar(c, r2.x, r2.y, want[k]), areas: backs.get(i.id!) ?? [] }));
    // The open area pulls its references out of the ring and fans them around itself, all at the same level
    if (open) {
      const node = areas.find((a) => a.key === open)!;
      const mine = items.filter((it) => it.areas.includes(open));
      const n = mine.length;
      if (n) {
        const away = Math.atan2(node.y - c.y, node.x - c.x);  // fan on the side facing away from the centre
        const span = Math.min(Math.PI * 1.1, 0.55 * n);
        const rad = 120 + Math.min(n, 8) * 9;
        mine.forEach((it, k) => {
          const a = n === 1 ? away : away - span / 2 + (span * k) / (n - 1);
          it.x = Math.min(size.w - 60, Math.max(60, node.x + Math.cos(a) * rad * 1.25));
          it.y = Math.min(size.h - 70, Math.max(top, node.y + Math.sin(a) * rad));
        });
      }
    }
    return { c, areas, items, narrow };
  }, [size, board, sys.areas, open]);

  const withBusy = async (area: SystemArea, fn: () => Promise<{ ok: true; data: ProjectSystem } | { ok: false; error: string }>) => {
    setBusy((s) => new Set([...s, area])); setError("");
    try {
      const r = await fn().catch((e) => ({ ok: false as const, error: String(e) }));
      if (!r.ok) throw new Error(r.error);
      setSystem(r.data);
      void loadSystem(project.id).then((x) => { if (x.ok) setHistory(x.data.history); });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy((s) => { const n = new Set(s); n.delete(area); return n; }); }
  };
  const [curatingArea, setCuratingArea] = useState<SystemArea | null>(null);
  const curate = useCallback(async (area: SystemArea, keep?: Record<string, boolean>) => {
    setCuratingArea(area); setError("");
    try {
      const res = await fetch("/api/system/curate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id, area, keep }) });
      const json = await res.json().catch(() => ({})) as ProjectSystem & { error?: string };
      if (!res.ok || json.error) throw new Error(json.error || t.system.failed);
      setSystem(json);
      void loadSystem(project.id).then((x) => { if (x.ok) setHistory(x.data.history); });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setCuratingArea(null); }
  }, [project.id, t, setSystem]);
  // Agent first: an open area with material and no table yet gets its table curated on the spot
  const curatedOnce = useRef(new Set<string>());
  useEffect(() => {
    if (!open || !system || curatingArea) return;
    const a = system.areas.find((x) => x.area === open);
    if (a && !a.curation && visuals.length && board.length && !curatedOnce.current.has(open)) { curatedOnce.current.add(open); void curate(open); }
  }, [open, system, visuals.length, board.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = useCallback(async (area: SystemArea, itemIds?: string[]): Promise<AreaOption[]> => {
    setError("");
    const res = await fetch("/api/system/options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id, area, itemIds }) });
    const json = await res.json().catch(() => ({})) as { options?: AreaOption[]; error?: string };
    if (!res.ok || json.error || !json.options) { setError(json.error || t.system.optionsFailed); throw new Error(json.error || t.system.optionsFailed); }
    return json.options;
  }, [project.id, t]);

  const markdown = useMemo(() => renderCriterioMd({
    project: project.name, system: sys,
    items: Object.fromEntries(library.filter((i) => i.id).map((i) => [i.id!, { name: i.name, web: i.web }])),
    labels, strings: t.system.md,
  }), [sys, project.name, library, labels, t]);
  const copy = async () => { try { await navigator.clipboard.writeText(markdown); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* the download still works */ } };
  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-criterio.md`; a.click(); URL.revokeObjectURL(a.href);
  };

  const openArea = open ? sys.areas.find((a) => a.area === open) ?? null : null;
  const lit = (areaKey: SystemArea, itemId: string) => hover === areaKey || hover === itemId || open === areaKey;
  const tileFor = (a: SystemAreaState) => {
    const { vs, fromBoard } = visualsFor(a);
    return (
      <Tile key={a.area} area={a} label={labels[a.area]} visuals={vs} fromBoard={fromBoard} sample={project.name} history={history[a.area] ?? []}
        busy={busy.has(a.area)} running={running} hasBoard={board.length > 0} itemOf={itemOf} imageOf={imageOf}
        onDecide={(decision, evidence, why) => withBusy(a.area, () => decideSystemArea(project.id, a.area, { decision, evidence, why }))}
        onCurate={(keep) => curate(a.area, keep)}
        onVerdict={(id, keep, reason) => withBusy(a.area, () => setSystemVerdict(project.id, a.area, { id, keep, reason }))}
        curating={curatingArea === a.area}
        onRelease={() => withBusy(a.area, () => releaseSystemArea(project.id, a.area))}
        onUndo={() => withBusy(a.area, () => undoSystemArea(project.id, a.area))}
        onOptions={(ids) => options(a.area, ids)}
        picking={board.length ? {
          active: open === a.area && picking !== null,
          count: picking?.size ?? 0,
          start: () => setPicking(new Set(a.evidence.map((e) => e.itemId).filter((id) => board.some((i) => i.id === id)))),
          stop: () => setPicking(null),
          propose: () => options(a.area, [...(picking ?? [])]),
        } : null} />
    );
  };

  return (
    <div className={`sysv${openArea ? " has-panel" : ""}`} aria-busy={!system}>
      <div className="sysv-sea" ref={sea}>
        <svg className="sysn-lines" width={size.w} height={size.h} aria-hidden>
          {geo.areas.map((a) => <line key={a.key} x1={geo.c.x} y1={geo.c.y} x2={a.x} y2={a.y} className={`sysn-line sysn-line--core${open === a.key || hover === a.key ? " is-lit" : ""}`} />)}
          {geo.items.flatMap((it) => it.areas.map((k) => { const a = geo.areas.find((x) => x.key === k)!; return <line key={`${it.item.id}-${k}`} x1={it.x} y1={it.y} x2={a.x} y2={a.y} className={`sysn-line${lit(k, it.item.id!) ? " is-lit" : ""}${hover && !lit(k, it.item.id!) ? " is-dim" : ""}`} />; }))}
        </svg>

        {/* The centre stays quiet: the nodes are the system. Name, one line of state, three small actions;
            the criterio paragraph unfolds only when asked for */}
        <section className="sysn-core" style={{ left: geo.c.x, top: geo.c.y }}>
          <h1 className="sysn-core__title">{project.name}</h1>
          {filled > 0 ? (
            <div className="sysn-polish" title={t.system.polishHint}>
              <small>{t.system.fill(filled, SYSTEM_AREAS.length)} · {t.system.polishPct(polishPct)}{stale && (stale.unread > 0 || stale.wordsChanged) ? <> · <i className="sysn-polish__dot" aria-hidden /> {stale.unread > 0 ? t.system.staleShort(stale.unread) : t.system.staleWordsShort}</> : null}</small>
              <span className="sysn-polish__bar"><b style={{ width: `${polishPct}%` }} /></span>
            </div>
          ) : (
            <p className="sysn-core__summary sysv-muted">{board.length ? (running ? t.system.running : t.system.runHint(board.length)) : t.system.noBoard}</p>
          )}
          {error && <p className="sysv-error" role="alert">{error}</p>}
          <div className="sysn-core__actions">
            <Button variant="ghost" size="sm" onClick={() => void run()} disabled={running || !board.length} title={sys.run ? t.system.rerun : t.system.run}>
              {running ? <><span className="spinner spinner--sm" /> {t.system.running}</> : <>{Icons.spark} {sys.run ? t.system.rerun : t.system.run}</>}
            </Button>
            {filled > 0 && <Button variant="ghost" size="sm" onClick={() => void copy()} title={t.system.exportHint}>{copied ? t.system.copied : t.system.export}</Button>}
            {filled > 0 && <Button variant="icon" onClick={download} aria-label={t.system.download} title={t.system.download}>{Icons.arrow}</Button>}
            {!board.length && <Button variant="ghost" size="sm" onClick={onOpenBoard}>{Icons.plus} {t.system.addRefs}</Button>}
          </div>
          {sys.summary && (
            <details className="sysn-core__criterio">
              <summary>{t.system.criterio}</summary>
              <p className="sysn-core__summary">{sys.summary}</p>
            </details>
          )}
        </section>

        {geo.areas.map((pos) => {
          const a = sys.areas.find((x) => x.area === pos.key)!;
          const level = confidenceOf(a);
          const { vs } = visualsFor(a);
          return (
            <button key={pos.key} type="button" className={`sysn-node is-${level}${a.source === "team" ? " is-team" : ""}${open === pos.key ? " is-open" : ""}${running || busy.has(pos.key) ? " is-busy" : ""}`}
              style={{ left: pos.x, top: pos.y }} onClick={() => setOpen(open === pos.key ? null : pos.key)}
              onMouseEnter={() => setHover(pos.key)} onMouseLeave={() => setHover(null)} aria-pressed={open === pos.key}>
              <span className="sysn-node__label">{labels[pos.key]}{a.evidence.length > 0 && <b className="sysn-node__n">{a.evidence.length}</b>}</span>
              {a.decision && <MiniSpecimen area={a} vs={vs} sample={project.name} />}
              <span className="sysn-node__line">{a.decision ? headlineOf(a.decision) : t.system.open}</span>
              {a.decision && a.source !== "team" && <i className="sysv-meter"><b style={{ width: `${a.confidence}%` }} /></i>}
            </button>
          );
        })}

        {geo.items.map((it) => {
          const id = it.item.id!;
          const picked = picking?.has(id) ?? false;
          const related = (open && it.areas.includes(open)) || hover === id || (!!hover && it.areas.includes(hover as SystemArea));
          // While an area is open its references come forward and the rest step back
          const cls = `sysn-ref${picking ? " is-pickable" : ""}${picked ? " is-picked" : ""}${!picking && (hover || open) && !related ? " is-dim" : ""}${!picking && related && (open || hover === id) ? " is-lit" : ""}`;
          const toggle = () => setPicking((p) => { if (!p) return p; const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
          return (
            <button key={id} type="button" className={cls} style={{ left: it.x, top: it.y }} title={it.item.name} aria-pressed={picking ? picked : undefined} data-id={id}
              onClick={picking ? toggle : undefined} onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(null)}>
              <Thumb item={it.item} image={imageOf(it.item)} />
              <small>{it.item.name}</small>
              {picking && <i className="sysn-ref__check">{picked && Icons.check}</i>}
            </button>
          );
        })}
      </div>

      {openArea && (
        <aside className="sysv-panel" aria-label={labels[openArea.area]}>
          <button type="button" className="sysv-panel__close btn-icon" aria-label={t.common.close} onClick={() => setOpen(null)}>{Icons.x}</button>
          {tileFor(openArea)}
        </aside>
      )}

      {/* Phones: the sea needs room, so the cards stack instead */}
      <div className="sysv-stack">{sys.areas.map(tileFor)}</div>
    </div>
  );
}
