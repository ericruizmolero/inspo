"use client";
// The project's system as the first thing you see in a project: a bento of light cards, one per area,
// each showing the material behind the decision (the palette, the families, the radii, the easing, the
// captures) instead of describing it. A card is a negotiation between the board (the model proposes,
// with a confidence) and the team (confirms, rewrites, steps back, hands it back to the board).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { InspoItem, Project } from "@/types/inspo";
import { SYSTEM_AREAS, confidenceOf, emptySystem, staleness, DECISION_MAX, type ProjectSystem, type SystemArea, type SystemAreaState, type SystemEvidence, type AreaCandidate, type AreaCuration } from "@/types/system";
import type { AreaOption, AreaRevision, RefVisual } from "@/lib/system";
import { blocksToMd, criterioBlocks } from "@/lib/criterio-md";
import { fontStack } from "@/lib/font-names";
import { loadSystem, loadSystemVisuals, decideSystemArea, releaseSystemArea, undoSystemArea, setSystemVerdict, assignSystemArea } from "@/app/actions/system";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { areaIcon } from "./area-icons";
import { AreaSample, AreaTabs, RefStrip, Thumb, TypeTester, pairStyle, useTypePair, useTypeRows } from "./SystemStage";
import { COLOR_ROLES, RefMaterial, Sample, bezierOf, luminance, sampleColors, useSampleChoices, type ColorRole, type SampleChoices } from "./SystemSample";
import SystemMarkdown from "./SystemMarkdown";
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
  /** The references not filed in any project: an area can take one straight from here */
  inbox: InspoItem[];
  /** Files a reference in this project (what adding one from the Inbox does first) */
  onFile: (item: InspoItem) => Promise<void>;
  /** Switch to the board (Curar) */
  onOpenBoard: () => void;
  /** Open this area from outside (the agent's "go to motion"); `n` makes the same area open again */
  focusArea?: { area: SystemArea; n: number } | null;
  onOpenChange?: (area: SystemArea | null) => void;
  /** While the search box filters: the references it found. The rest step back */
  matches?: Set<string> | null;
}

// ─── Reading the material ────────────────────────────────────────────────────

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
// ─── Specimens ───────────────────────────────────────────────────────────────

function Palette({ vs, max }: { vs: RefVisual[]; max?: number }) {
  const colors = palette(vs, max);
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
      <div className="sysv-motion__track"><i style={{ animationTimingFunction: /^(cubic-bezier|ease|linear)/.test(easing) ? easing : "ease", animationDuration: `${Math.max(300, Math.min(ms, 2000))}ms` }} /></div>
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
  /** On the stage the material (specimen, table) is shown beside the card, not inside it */
  stage?: boolean;
  /** Picking, among the area's references on its stage, the ones it should be decided from: how many are chosen, and the controls */
  picking: { active: boolean; count: number; start: () => void; stop: () => void; propose: () => Promise<AreaOption[]> } | null;
}

const headlineOf = (decision: string) => {
  const first = decision.split(/(?<=[.:;])\s/)[0] ?? decision;
  return first.length > 72 ? `${first.slice(0, 70).replace(/\s+\S*$/, "")}…` : first;
};

/** What an area can show instead of describing: its palette, its families, its captures */
function specimenOf(area: SystemAreaState, visuals: RefVisual[], sample: string) {
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
}

function Tile({ area, label, visuals, fromBoard, sample, history, busy, running, hasBoard, itemOf, imageOf, onDecide, onRelease, onUndo, onOptions, picking, onCurate, onVerdict, curating, stage }: TileProps) {
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

  const specimen = stage ? null : specimenOf(area, visuals, sample);
  const status = area.source === "team" ? t.system.confidence.team : level === "high" ? t.system.confidence.high : level === "low" ? t.system.confidence.low : null;

  return (
    <article className={`sysv-tile sysv-tile--${area.area} is-${level}${area.source === "team" ? " is-team" : ""}${options ? " is-options" : ""}${busy || running ? " is-busy" : ""}`} aria-busy={busy || running || loadingOptions}>
      <header className="sysv-tile__head">
        <span className="sysv-tile__eyebrow">{areaIcon(area.area, 14)}{label}</span>
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
          {stage ? null : curating ? (
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

/** Colour on the bento: once the team has put colours on the sample, those three first; the palette of the references after */
function BentoColor({ vs, chosen, labels }: { vs: RefVisual[]; chosen: { bg?: string; ink?: string; accent?: string }; labels: Record<ColorRole, string> }) {
  const picked = COLOR_ROLES.filter((r) => chosen[r]);
  if (!chosen.bg) return <Palette vs={vs} max={8} />;
  return (
    <div className="sysb-colors">
      <div className="sysb-colors__chosen">
        {picked.map((r) => <span key={r} className="sysv-swatch" title={`${labels[r]} ${chosen[r]}`}><i style={{ background: chosen[r] }} /><small>{labels[r]} {chosen[r]}</small></span>)}
      </div>
      <Palette vs={vs} max={8} />
    </div>
  );
}

// ─── The bento: what each area shows on its tile ───────────────────────────────

/** Typography on the bento: the sample itself, small. The project's name and its sentence in the pairing
 *  chosen on the area's stage, in the references' real faces, on the colours and the radius the other areas
 *  have put on it. Until the faces arrive, the families by name. */
function BentoType({ projectId, name, intent, summary, refs, visuals, fallback, curation, choices, cta, more }: {
  projectId: string; name: string; intent: string; summary: string;
  refs: InspoItem[]; visuals: RefVisual[]; fallback: RefVisual[]; curation: AreaCuration | null;
  choices: SampleChoices; cta: string; more: string;
}) {
  const { rows } = useTypeRows(projectId, refs, visuals);
  const pair = useTypePair(projectId, rows, curation);
  if (!pair.title || !pair.body) return <TypeSpecimen vs={fallback} sample={name} />;
  const fams = [...new Set([pair.title, pair.subtitle, pair.body].filter((x): x is NonNullable<typeof x> => !!x).map((x) => x.row.label))];
  return (
    <div className="sysb-type">
      <Sample compact title={name} subtitle={intent || summary} body="" cta={cta} more={more} choices={choices}
        faces={{ title: pairStyle(pair.title), subtitle: pairStyle(pair.subtitle), body: pairStyle(pair.body) }} />
      <div className="sysv-chips">{fams.map((f) => <span key={f} className="sysv-chip"><b>{f}</b></span>)}</div>
    </div>
  );
}

/** The areas whose result is seen on the sample (typography has it inside its tester) */
const SAMPLE_AREAS = new Set<SystemArea>(["color", "layout", "motion", "voice"]);

// ─── The view ────────────────────────────────────────────────────────────────

export default function SystemView({ project, system, onSystem, board, library, inbox, onFile, imageOf, onOpenBoard, focusArea, onOpenChange }: Props) {
  const { t } = useT();
  const setSystem = onSystem;
  const [visuals, setVisuals] = useState<RefVisual[]>([]);
  const [history, setHistory] = useState<Record<string, AreaRevision[]>>({});
  const [boardStamp, setBoardStamp] = useState<{ stamp: string; itemIds: string[] } | null>(null);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<Set<SystemArea>>(() => new Set());
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [open, setOpenNow] = useState<SystemArea | null>(null);
  // Opening an area clears the bento for its stage: the tiles fold into tabs (and back) as one movement where the browser can
  const setOpen = useCallback((next: SystemArea | null) => {
    const doc = document as Document & { startViewTransition?: (fn: () => void) => unknown };
    if (doc.startViewTransition && window.matchMedia("(min-width: 801px)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(() => flushSync(() => setOpenNow(next)));
    else setOpenNow(next);
  }, []);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !(e.target as HTMLElement | null)?.closest?.("input, textarea, [contenteditable]")) setOpen(null); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, setOpen]);
  useEffect(() => { if (focusArea) setOpen(focusArea.area); }, [focusArea]);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  // The sample every area paints: what has been tried on it, which colour role the next swatch fills, and its replay
  const [choices, setChoice] = useSampleChoices(project.id);
  const [colorRole, setColorRole] = useState<ColorRole>("bg");
  const [replay, setReplay] = useState(0);
  // Picking: the team chooses, among the area's references, the ones it should be decided from
  const [picking, setPicking] = useState<Set<string> | null>(null);
  useEffect(() => { setPicking(null); }, [open]);
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
  const unread = !!stale && (stale.unread > 0 || stale.wordsChanged);
  const byItem = useMemo(() => new Map(visuals.map((v) => [v.itemId, v])), [visuals]);
  const visualsFor = (a: SystemAreaState): { vs: RefVisual[]; fromBoard: boolean } => {
    const own = a.evidence.map((e) => byItem.get(e.itemId)).filter((v): v is RefVisual => !!v);
    return own.length ? { vs: own, fromBoard: false } : { vs: visuals, fromBoard: true };
  };

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

  // criterio.md in blocks: the file to copy or download, and the Markdown view, where a block is edited in place
  const blocks = useMemo(() => criterioBlocks({
    project: project.name, system: sys,
    items: Object.fromEntries(library.filter((i) => i.id).map((i) => [i.id!, { name: i.name, web: i.web }])),
    labels, strings: t.system.md,
  }), [sys, project.name, library, labels, t]);
  const markdown = useMemo(() => blocksToMd(blocks), [blocks]);
  // The system, as the tiles a person reads or as the file an agent reads: the same thing, seen two ways. Kept on this machine
  const [view, setViewNow] = useState<"bento" | "md">("bento");
  useEffect(() => { try { if (localStorage.getItem("criterio:system-view") === "md") setViewNow("md"); } catch { /* private mode */ } }, []);
  const setView = (v: "bento" | "md") => { setViewNow(v); try { localStorage.setItem("criterio:system-view", v); } catch { /* it lasts the visit */ } };
  const copy = async () => { try { await navigator.clipboard.writeText(markdown); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* the download still works */ } };
  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-criterio.md`; a.click(); URL.revokeObjectURL(a.href);
  };

  const openArea = open ? sys.areas.find((a) => a.area === open) ?? null : null;
  // The faces of the sample come from typography's references wherever it is shown; with none filed yet, from the first of the board
  const typeArea = sys.areas.find((a) => a.area === "typography");
  const typeOwn = (typeArea?.evidence ?? []).map((e) => itemOf(e.itemId)).filter((x): x is InspoItem => !!x);
  const typeRefs = typeOwn.length ? typeOwn : board.slice(0, 8);
  // A reference joins or leaves an area from its stage. One from the Inbox is filed in the project first
  const [pendingRefs, setPendingRefs] = useState<Set<string>>(() => new Set());
  const toggleRef = async (area: SystemArea, item: InspoItem, on: boolean) => {
    const id = item.id;
    if (!id || pendingRefs.has(id)) return;
    setPendingRefs((s) => new Set([...s, id])); setError("");
    try {
      const filing = on && !board.some((i) => i.id === id);
      if (filing) await onFile(item);
      const r = await assignSystemArea(project.id, area, id, on).catch((e) => ({ ok: false as const, error: String(e) }));
      if (!r.ok) throw new Error(r.error);
      setSystem(r.data);
      // Filing made the view load the system again, maybe from before this: the last word is read once more
      if (filing) void loadSystem(project.id).then((x) => { if (x.ok) setSystem(x.data.system); });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setPendingRefs((s) => { const n = new Set(s); n.delete(id); return n; }); }
  };
  const tileFor = (a: SystemAreaState, stage = false) => {
    const { vs, fromBoard } = visualsFor(a);
    return (
      <Tile key={a.area} stage={stage} area={a} label={labels[a.area]} visuals={vs} fromBoard={fromBoard} sample={project.name} history={history[a.area] ?? []}
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
    <div className={`sysv${openArea ? " is-stage" : ""}`} aria-busy={!system}>
      {/* The system at a glance: the project on top, one tile per area showing its material. A tile opens its stage */}
      <div className="sysv-sea sysb">
        <div className="sysb-inner">
          <header className="sysb-head">
            <div className="sysb-head__text">
              <h1 className="sysb-title">{project.name}</h1>
              {project.intent && <p className="sysb-intent">{project.intent}</p>}
            </div>
            <div className="sysb-head__side">
              <div className="tt-modes sysb-views" role="tablist" aria-label={t.system.views.label}>
                <button type="button" role="tab" aria-selected={view === "bento"} className={`tt-mode${view === "bento" ? " is-on" : ""}`} onClick={() => setView("bento")}>{t.system.views.bento}</button>
                <button type="button" role="tab" aria-selected={view === "md"} className={`tt-mode${view === "md" ? " is-on" : ""}`} onClick={() => setView("md")}>{t.system.views.markdown}</button>
              </div>
              {filled > 0 ? (
                <p className="sysn-core__state" title={t.system.polishHint}>
                  <svg className="sysn-core__ring" viewBox="0 0 14 14" width="14" height="14" aria-hidden>
                    <circle cx="7" cy="7" r="5.25" />
                    <circle cx="7" cy="7" r="5.25" pathLength={100} strokeDasharray={`${polishPct} 100`} transform="rotate(-90 7 7)" />
                  </svg>
                  <b>{t.system.polishPct(polishPct)}</b>
                  <span>{t.system.filled(filled, SYSTEM_AREAS.length)}</span>
                </p>
              ) : (
                <p className="sysn-core__summary sysv-muted">{board.length ? (running ? t.system.running : t.system.runHint(board.length)) : t.system.noBoard}</p>
              )}
              {/* One thing asks for attention at a time: reading the board is solid only while there is something unread */}
              <div className="sysn-core__actions">
                <Button variant={board.length && (unread || !filled) ? "primary" : "default"} size="sm" onClick={() => void run()} disabled={running || !board.length} title={sys.run ? t.system.rerun : t.system.run}>
                  {running ? <><span className="spinner spinner--sm" /> {t.system.running}</> : <>{Icons.spark} {!sys.run ? t.system.run : stale && stale.unread > 0 ? t.system.readNew(stale.unread) : stale?.wordsChanged ? t.system.readWords : t.system.rerun}</>}
                </Button>
                {filled > 0 && (
                  <span className="sysn-core__file">
                    <Button size="sm" onClick={() => void copy()} title={t.system.exportHint}>{copied ? t.system.copied : t.system.export}</Button>
                    <Button size="sm" onClick={download} aria-label={t.system.download} title={t.system.download}>{Icons.arrow}</Button>
                  </span>
                )}
                {!board.length && <Button variant="primary" size="sm" onClick={onOpenBoard}>{Icons.plus} {t.system.addRefs}</Button>}
              </div>
            </div>
          </header>
          {error && <p className="sysv-error" role="alert">{error}</p>}
          {view === "md" && (
            <SystemMarkdown blocks={blocks} busy={busy} onOpen={setOpen}
              onSave={(area, decision, why) => withBusy(area, () => decideSystemArea(project.id, area, { decision, why }))} />
          )}
          {view === "bento" && sys.summary && (
            <details className="sysn-core__criterio sysb-criterio">
              <summary>{t.system.criterio}{Icons.chevron}</summary>
              <p className="sysn-core__summary">{sys.summary}</p>
            </details>
          )}

          {view === "bento" && <div className="sysb-grid">
            {sys.areas.map((a) => {
              const level = confidenceOf(a);
              const { vs } = visualsFor(a);
              const own = a.evidence.map((e) => itemOf(e.itemId)).filter((x): x is InspoItem => !!x);
              const go = () => setOpen(a.area);
              return (
                <article key={a.area} role="button" tabIndex={0} aria-label={labels[a.area]}
                  className={`sysb-tile sysb-tile--${a.area} is-${level}${a.source === "team" ? " is-team" : ""}${a.decision ? "" : " is-open"}${running || busy.has(a.area) ? " is-busy" : ""}`}
                  style={{ gridArea: a.area, viewTransitionName: `sysa-${a.area}` }}
                  onClick={go} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }}>
                  <header className="sysb-tile__head">
                    <span className="sysb-tile__label">{areaIcon(a.area, 14)}{labels[a.area]}</span>
                    {/* A narrow tile has room for the number only */}
                    {a.evidence.length > 0 && <span className="sysb-tile__n">{a.area === "imagery" || a.area === "logo" || a.area === "iconography" ? a.evidence.length : t.system.evidence(a.evidence.length)}</span>}
                    <span className="sysb-tile__state">
                      {a.source === "team" ? Icons.check : a.decision ? <i className="sysv-meter"><b style={{ width: `${a.confidence}%` }} /></i> : t.system.open}
                    </span>
                  </header>
                  <div className="sysb-tile__specimen">
                    {a.area === "typography"
                      // With nothing filed under typography yet, the tile tries what the first of the board brings
                      ? <BentoType projectId={project.id} name={project.name} intent={project.intent ?? ""} summary={sys.summary} refs={typeRefs} visuals={visuals} fallback={vs} curation={a.curation} choices={choices} cta={t.system.type.comp.cta} more={t.system.sample.more} />
                      : a.area === "color" ? <BentoColor vs={vs} chosen={sampleColors(choices)} labels={t.system.sample.colorRoles} />
                      : specimenOf(a, vs, project.name)}
                  </div>
                  {/* Voice already shows its decision as the quote */}
                  <footer className="sysb-tile__foot">
                    {a.decision && a.area !== "voice" && <p className="sysb-tile__line">{headlineOf(a.decision)}</p>}
                    {/* The references behind the area, in sight */}
                    {own.length > 0 && a.area !== "layout" && a.area !== "imagery" && <span className="sysb-tile__refs">{own.slice(0, a.area === "typography" || a.area === "color" ? 6 : 4).map((it) => <Thumb key={it.id} item={it} image={imageOf(it)} />)}</span>}
                  </footer>
                </article>
              );
            })}
          </div>}
        </div>
      </div>

      {/* An open area takes the screen: the nodes are its tabs, the canvas its stage, the decision beside it */}
      {openArea && (() => {
        const a = openArea;
        const own = a.evidence.map((e) => itemOf(e.itemId)).filter((x): x is InspoItem => !!x);
        const { vs } = visualsFor(a);
        const verdict = (id: string, keep: boolean, reason?: string) => void withBusy(a.area, () => setSystemVerdict(project.id, a.area, { id, keep, reason }));
        const specimen = specimenOf(a, vs, project.name);
        return (
          <div className="sysf">
            <AreaTabs areas={sys.areas} labels={labels} open={a.area} onOpen={setOpen} onBack={() => setOpen(null)} projectName={project.name} />
            <div className="sysf-body">
              <div className="sysf-main" key={a.area}>
                {error && <p className="sysv-error" role="alert">{error}</p>}
                {/* First what the area draws from: each reference with what it brings, to touch and try on the sample */}
                <RefStrip areaLabel={labels[a.area]} refs={own} board={board} inbox={inbox} pending={pendingRefs}
                  tall={a.area === "imagery"} imageOf={a.area === "imagery" ? (i) => byItem.get(i.id!)?.scroll ?? imageOf(i) : imageOf}
                  material={(i) => (
                    <RefMaterial area={a.area} v={byItem.get(i.id!)}
                      onColor={(hex) => { setChoice({ [colorRole]: hex }); setColorRole(COLOR_ROLES[(COLOR_ROLES.indexOf(colorRole) + 1) % COLOR_ROLES.length]); }}
                      onRadius={(radius) => setChoice({ radius })}
                      onEasing={(easing, ms) => { setChoice({ easing, ...(ms ? { durationMs: ms } : {}) }); setReplay((n) => n + 1); }}
                      onHeadline={(headline) => setChoice({ headline })} />
                  )}
                  onToggle={(item, on) => void toggleRef(a.area, item, on)}
                  picking={picking ? { picked: picking, toggle: (id) => setPicking((p) => { if (!p) return p; const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }) } : null} />
                {a.area === "typography" ? (
                  // With nothing filed under typography yet, the tester tries what the whole board brings
                  <TypeTester projectId={project.id} projectName={project.name} intent={project.intent ?? ""} summary={sys.summary} refs={own.length ? own : board} visuals={visuals}
                    curation={a.curation} curating={curatingArea === a.area} busy={busy.has(a.area)} itemOf={itemOf} imageOf={imageOf}
                    onFlip={(id, keep) => verdict(id, keep)} onReason={verdict} choices={choices} onChoice={setChoice}
                    onUse={(decision) => void withBusy(a.area, () => decideSystemArea(project.id, a.area, { decision, why: a.why }))} />
                ) : (
                  <>
                    {/* The result, seen: the same sample typography is tried on, painted with this area's choices */}
                    {SAMPLE_AREAS.has(a.area) && (
                      <AreaSample area={a.area} projectId={project.id} projectName={project.name} intent={project.intent ?? ""} summary={sys.summary}
                        typeRefs={typeRefs} visuals={visuals} areaVisuals={vs} typeCuration={typeArea?.curation ?? null}
                        choices={choices} onChoice={setChoice} colorRole={colorRole} onColorRole={setColorRole} replay={replay} onReplay={() => setReplay((n) => n + 1)}
                        busy={busy.has(a.area)}
                        onUse={a.area === "color" ? (decision) => void withBusy(a.area, () => decideSystemArea(project.id, a.area, { decision, why: a.why })) : undefined} />
                    )}
                    {curatingArea === a.area ? (
                      <p className="sysv-muted"><span className="spinner spinner--sm" /> {t.system.curating}</p>
                    ) : a.curation ? (
                      <AreaTable curation={a.curation} sample={project.name} busy={busy.has(a.area)} itemOf={itemOf} imageOf={imageOf}
                        onFlip={(id, keep) => verdict(id, keep)} onReason={(id, reason) => verdict(id, a.curation!.verdicts.find((v) => v.id === id)?.keep ?? false, reason)} />
                    ) : !SAMPLE_AREAS.has(a.area) && specimen && <div className="sysv-tile__specimen sysf-specimen">{specimen}</div>}
                  </>
                )}
              </div>
              <aside className="sysf-aside" aria-label={labels[a.area]}>{tileFor(a, true)}</aside>
            </div>
          </div>
        );
      })()}

      {/* Phones: the bento needs room, so the cards stack instead */}
      <div className="sysv-stack">{sys.areas.map((a) => tileFor(a))}</div>
    </div>
  );
}
