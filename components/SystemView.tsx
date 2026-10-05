"use client";
// The project's system as the first thing you see in a project: a bento of light cards, one per area,
// each showing the material behind the decision (the palette, the families, the radii, the easing, the
// captures) instead of describing it. A card is a negotiation between the board (the model proposes,
// with a confidence) and the team (confirms, rewrites, steps back, hands it back to the board).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { InspoItem, Project } from "@/types/inspo";
import { SYSTEM_AREAS, confidenceOf, emptySystem, staleness, DECISION_MAX, NEVER_MAX, type ProjectSystem, type SystemArea, type SystemAreaState, type SystemEvidence, type AreaCandidate, type AreaCuration, type SystemFocus } from "@/types/system";
import type { AreaOption, AreaRevision, RefVisual } from "@/lib/system";
import { blocksToMd, criterioBlocks, type RefInfo } from "@/lib/criterio-md";
import { saveProjectBrief } from "@/app/actions/brief";
import { fontStack } from "@/lib/font-names";
import SkillsMenu from "./SkillsMenu";
import ImproveModal from "./ImproveModal";
import { saveDocPart } from "@/app/actions/system";
import { loadSystem, loadSystemVisuals, decideSystemArea, setSystemNever, releaseSystemArea, undoSystemArea, setSystemVerdict, assignSystemArea } from "@/app/actions/system";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { areaIcon } from "./area-icons";
import AreaThread from "./AreaThread";
import { AreaFaces, RecentChanges, VoiceBand, useSystemActivity } from "./SystemBento";
import { AreaSample, AreaTabs, RefStrip, Thumb, TypeTester, pairStyle, useTypePair, useTypeRows } from "./SystemStage";
import { COLOR_ROLES, RefMaterial, Sample, bezierOf, luminance, sampleColors, useSampleChoices, type ColorRole, type SampleChoices } from "./SystemSample";
import SystemDoc from "./SystemDoc";
import AreaStarter, { useAreaIdeals } from "./SystemStarter";
import SystemTray from "./SystemTray";
import type { NoteCaption } from "./InspoCard";
import { areaCandidates } from "@/lib/candidates";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  /** A reference's entry to bring into sight under References (its code, R3), asked for from its panel */
  focusRef?: { code: string; n: number } | null;
  onOpenChange?: (area: SystemArea | null) => void;
  /** A redesign: marks which reference is the client's current site (null clears it) */
  onClient?: (itemId: string | null) => Promise<void>;
  /** Opens a reference's card in the panel */
  onOpenItem?: (item: InspoItem) => void;
  /** The line under a reference: its note or first comment, and who is in its thread */
  noteOf?: (item: InspoItem) => NoteCaption | null;
  /** A reference as criterio.md tells it: what it is, who saved it, what the team said (lib/ref-info.ts) */
  refInfo?: (item: InspoItem) => RefInfo;
  /** Writes the words of a text reference, typed in the file's Content */
  onText?: (itemId: string, text: string) => Promise<void>;
  /** Gives a text reference another title, typed over its heading */
  onTextTitle?: (itemId: string, title: string) => Promise<void>;
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

function Palette({ vs, max, bare }: { vs: RefVisual[]; max?: number; bare?: boolean }) {
  const colors = palette(vs, max);
  if (!colors.length) return null;
  return (
    <div className="sysv-palette">
      {colors.map((c) => (
        <span key={c.hex} className="sysv-swatch" title={`${c.name} ${c.hex}`}>
          <i style={{ background: c.hex }} />
          {!bare && <small>{c.hex.slice(0, 7)}</small>}
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
  /** What the area must never do, one rule per line */
  onNever: (never: string) => Promise<void>;
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

/** What an area must never do, under its decision: the rules the team threw away, one a line */
function NeverList({ text, label, onEdit }: { text: string; label: string; onEdit: () => void }) {
  return (
    <div className="sysv-never" onClick={onEdit} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onEdit(); }}>
      <b>{label}</b>
      <ul>{text.split("\n").filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
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

function Tile({ area, label, visuals, fromBoard, sample, history, busy, running, hasBoard, itemOf, imageOf, onDecide, onNever, onRelease, onUndo, onOptions, picking, onCurate, onVerdict, curating, stage }: TileProps) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(area.decision);
  const [whyDraft, setWhyDraft] = useState(area.why);
  useEffect(() => { setWhyDraft(area.why); }, [area.why]);
  const [neverDraft, setNeverDraft] = useState(area.never);
  useEffect(() => { setNeverDraft(area.never); }, [area.never]);
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
  const save = async () => {
    if (draft.trim() !== area.decision.trim() || whyDraft.trim() !== area.why.trim()) await onDecide(draft, undefined, whyDraft);
    if (neverDraft.trim() !== area.never.trim()) await onNever(neverDraft);
    setEditing(false);
  };

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
              <label className="sysv-never__label">{t.system.md.never}</label>
              <textarea className="input sysv-edit__text sysv-edit__why" rows={3} maxLength={NEVER_MAX} value={neverDraft} placeholder={t.system.neverPlaceholder}
                onChange={(e) => setNeverDraft(e.target.value)}
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
              {area.never && <NeverList text={area.never} label={t.system.md.never} onEdit={() => setEditing(true)} />}
              {area.source !== "team" && <Button variant="primary" size="sm" disabled={busy} onClick={() => void onDecide(area.decision, undefined, area.why)}>{Icons.check} {t.system.confirmWhy}</Button>}
            </div>
          ) : (
            <>
              <p className="sysv-tile__empty">{hasBoard ? t.system.emptyHint : t.system.noBoardShort}</p>
              {area.never && <NeverList text={area.never} label={t.system.md.never} onEdit={() => setEditing(true)} />}
            </>
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


/** A system with no references behind it yet (a project started from a template) still shows its result: the
 *  colours, radii, curve and families its decisions name, read from their words, as if one reference carried them */
function visualFromDecisions(sys: ProjectSystem): RefVisual | null {
  const text = (k: SystemArea) => sys.areas.find((a) => a.area === k)?.decision ?? "";
  const colors = [...new Set((text("color").match(/#[0-9a-f]{6}\b/gi) ?? []).map((h) => h.toLowerCase()))]
    // A colour with hue is the brand; greys, near-blacks and near-whites are the neutrals
    .map((hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255); return { name: hex, hex, group: (Math.max(r, g, b) - Math.min(r, g, b) > 0.3 ? "brand" : "neutral") as "brand" | "neutral" }; });
  // Only the sentences that speak of radii: a layout decision also names widths and gutters in px
  const radiusText = text("layout").split(/(?<=[.;])\s/).filter((s) => /radi|radius|redonde/i.test(s)).join(" ");
  const radii = [...new Set(radiusText.match(/\b\d{1,2}px\b/g) ?? [])].filter((v) => parseInt(v) <= 40).map((value) => ({ element: "decision", value }));
  const easing = text("motion").match(/cubic-bezier\([^)]*\)/)?.[0] ?? (/power2\.in\b/.test(text("motion")) ? "cubic-bezier(0.55, 0.085, 0.68, 0.53)" : null);
  const fams = [...text("typography").matchAll(/([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2}) (?=\d00\b)/g)].map((m) => m[1]).filter((f, i, all) => all.indexOf(f) === i);
  const fonts = fams.map((family, i) => ({ family, role: (i === 0 ? "display" : /mono/i.test(family) ? "mono" : "body") as "display" | "body" | "mono", weights: [400] }));
  if (!colors.length && !radii.length && !easing && !fonts.length) return null;
  return { itemId: "decisions", name: "", web: "", cover: null, scroll: null, colors, fonts, radii, easing, durationMs: null, logo: null, icons: [], voice: null, tagline: null };
}

/** The families a system names, loaded from Google Fonts when they are there (a face it does not have is simply not found) */
function useNamedFonts(families: string[]) {
  const key = families.join("|");
  useEffect(() => {
    if (!families.length) return;
    const id = `named-fonts-${key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600`).join("&")}&display=swap`;
    document.head.appendChild(link);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── The bento: what each area shows on its tile ───────────────────────────────

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

/** Typography on the bento: the sample itself, small. The project's name and its sentence in the pairing
 *  chosen on the area's stage, in the references' real faces, on the colours and the radius the other areas
 *  have put on it. Until the faces arrive, the families by name. */
function BentoType({ projectId, name, intent, summary, refs, visuals, fallback, curation, clientItemId, choices, cta, more }: {
  projectId: string; name: string; intent: string; summary: string;
  refs: InspoItem[]; visuals: RefVisual[]; fallback: RefVisual[]; curation: AreaCuration | null; clientItemId: string | null;
  choices: SampleChoices; cta: string; more: string;
}) {
  const { rows } = useTypeRows(projectId, refs, visuals);
  const pair = useTypePair(projectId, rows, curation, clientItemId);
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

/** Whether the references carry something to show for an area whose specimen is their own material (an empty box says nothing) */
const hasMaterial = (area: SystemArea, vs: RefVisual[]) =>
  area === "logo" ? vs.some((v) => v.logo) : area === "iconography" ? vs.some((v) => v.icons.length) : area === "imagery" ? vs.some((v) => v.cover || v.scroll) : true;

/** A redesign: the reference that is the client's current site, named under the project. Its copy, typefaces, logo and figures rule the system */
function ClientChip({ client, imageOf, onPick }: { client: InspoItem; imageOf: (item: InspoItem) => string | null; onPick: (itemId: string | null) => Promise<void> }) {
  const { t } = useT();
  const s = t.system.client;
  const [busy, setBusy] = useState(false);
  return (
    <div className="sysb-client">
      <span className="sysb-client__on" title={s.hint}>
        <Thumb item={client} image={imageOf(client)} />
        <span>{s.redesignOf} <b>{client.name}</b></span>
        <button type="button" className="sysb-client__x" disabled={busy} aria-label={s.clear} title={s.clear} onClick={() => { setBusy(true); void onPick(null).finally(() => setBusy(false)); }}>{Icons.x}</button>
      </span>
    </div>
  );
}

/** Which of the board's sites is the client's */
const IcDots = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden><circle cx="2.5" cy="7" r="1.25" /><circle cx="7" cy="7" r="1.25" /><circle cx="11.5" cy="7" r="1.25" /></svg>
);

/** What the header does not need in sight: reading the board again. One button, there only while it has that to offer */
function MoreMenu({ rerun }: { rerun: { label: string; run: () => void } | null }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  if (!rerun) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="btn btn--sm sysb-more" aria-label={t.system.more} title={t.system.more}>{IcDots}</PopoverTrigger>
      <PopoverContent align="end" className="sysb-more__pop is-menu">
        <button type="button" className="sysb-more__item" onClick={() => { setOpen(false); rerun.run(); }}>{rerun.label}</button>
      </PopoverContent>
    </Popover>
  );
}

/** The areas whose result is seen on the sample (typography has it inside its tester) */
const SAMPLE_AREAS = new Set<SystemArea>(["color", "layout", "motion", "voice"]);

// ─── The view ────────────────────────────────────────────────────────────────

export default function SystemView({ project, system, onSystem, board, library, inbox, onFile, imageOf, onOpenBoard, focusArea, focusRef, onOpenChange, onClient, onOpenItem, noteOf, refInfo, onText, onTextTitle }: Props) {
  const { t, locale } = useT();
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
  // A reference's entry asked for from its panel: its heading line in sight, lit a moment. What is above it can
  // still grow while the file loads (the conversation, the pictures), so it lands again once that has had time
  useEffect(() => {
    if (!focusRef) return;
    const find = () => Array.from(document.querySelectorAll<HTMLElement>("#sdoc-refs .mdv-line, #sdoc-refs .mdv-eline"))
      .find((el) => el.textContent?.startsWith(`### ${focusRef.code} \u00b7`));
    const ids = [60, 700, 1500].map((ms, i) => setTimeout(() => {
      const el = find();
      if (!el) return;
      el.scrollIntoView({ behavior: i ? "auto" : "smooth", block: "center" });
      if (!i) { el.classList.remove("is-flash"); void el.offsetWidth; el.classList.add("is-flash"); }
    }, ms));
    return () => ids.forEach(clearTimeout);
  }, [focusRef]);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  // The sample every area paints: what has been tried on it, which colour role the next swatch fills, and its replay
  const [tried, setChoice] = useSampleChoices(project.id);
  const [colorRole, setColorRole] = useState<ColorRole>("bg");
  const [replay, setReplay] = useState(0);
  // The references that are ideal for the open area (a base, no model): the picker offers them first
  const ideals = useAreaIdeals(project.id, open);
  // The areas opened with nothing behind them: their starter stays until the area is decided, also after a first reference comes in
  const [starting, setStarting] = useState<Set<SystemArea>>(() => new Set());
  useEffect(() => {
    if (!open || !system) return;
    const a = system.areas.find((x) => x.area === open);
    if (a && !a.decision && !a.evidence.length) setStarting((s) => (s.has(open) ? s : new Set([...s, open])));
  }, [open, system]);
  // Picking: the team chooses, among the area's references, the ones it should be decided from
  const [picking, setPicking] = useState<Set<string> | null>(null);
  useEffect(() => { setPicking(null); }, [open]);
  // A pass asked for from "Improve with AI" carries what the team wants from it (ImproveModal); the plain one reads everything
  const [improving, setImproving] = useState(false);
  const run = useCallback(async (focus?: SystemFocus) => {
    setRunning(true); setError("");
    try {
      const res = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id, focus }) });
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
  // A redesign: the client's current site, filed in the project
  const clientItem = project.clientItemId ? board.find((i) => i.id === project.clientItemId) ?? null : null;
  const sys = system ?? emptySystem(project.id);
  const filled = sys.areas.filter((a) => a.decision).length;
  // How polished the system is: every area counts, a team decision as 100, an open area as 0
  const polishPct = Math.round(sys.areas.reduce((n, a) => n + (a.source === "team" ? 100 : a.decision ? a.confidence : 0), 0) / SYSTEM_AREAS.length);
  const stale = boardStamp ? staleness(sys, boardStamp.itemIds, boardStamp.stamp) : null;
  const unread = !!stale && (stale.unread > 0 || stale.wordsChanged);
  const byItem = useMemo(() => new Map(visuals.map((v) => [v.itemId, v])), [visuals]);
  // With no references behind the system yet, its own decisions are the material
  const fromWords = useMemo(() => (visuals.length ? null : visualFromDecisions(sys)), [visuals.length, sys]);
  useNamedFonts(fromWords?.fonts.map((f) => f.family) ?? []);
  // ...and, until the team tries something else on it, the sample wears what those decisions say
  const decidedLook = useMemo(() => {
    if (!fromWords) return {};
    const cs = [...fromWords.colors].sort((a, b) => luminance(a.hex) - luminance(b.hex));
    const dark = /oscur|dark|negro|black/i.test(sys.areas.find((a) => a.area === "color")?.decision ?? "");
    const neutrals = cs.filter((c) => c.group === "neutral");
    const look: Partial<SampleChoices> = {};
    if (neutrals.length >= 2) { look.bg = (dark ? neutrals[0] : neutrals[neutrals.length - 1]).hex; look.ink = (dark ? neutrals[neutrals.length - 1] : neutrals[0]).hex; }
    const brand = fromWords.colors.find((c) => c.group === "brand");
    if (brand) look.accent = brand.hex;
    if (fromWords.radii.length) look.radius = [...fromWords.radii].sort((a, b) => parseInt(b.value) - parseInt(a.value))[0].value;
    if (fromWords.easing) look.easing = fromWords.easing;
    return look;
  }, [fromWords, sys.areas]);
  const choices = useMemo(() => ({ ...decidedLook, ...tried }), [decidedLook, tried]);
  const visualsFor = (a: SystemAreaState): { vs: RefVisual[]; fromBoard: boolean } => {
    const own = a.evidence.map((e) => byItem.get(e.itemId)).filter((v): v is RefVisual => !!v);
    return own.length ? { vs: own, fromBoard: false } : fromWords ? { vs: [fromWords], fromBoard: false } : { vs: visuals, fromBoard: true };
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
    // Only when the board offers something for the area: with nothing to lay on the table the area starts another way (AreaStarter)
    if (a && !a.curation && visuals.length && board.length && !curatedOnce.current.has(open) && areaCandidates(open, visuals).length) { curatedOnce.current.add(open); void curate(open); }
  }, [open, system, visuals.length, board.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = useCallback(async (area: SystemArea, itemIds?: string[]): Promise<AreaOption[]> => {
    setError("");
    const res = await fetch("/api/system/options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id, area, itemIds }) });
    const json = await res.json().catch(() => ({})) as { options?: AreaOption[]; error?: string };
    if (!res.ok || json.error || !json.options) { setError(json.error || t.system.optionsFailed); throw new Error(json.error || t.system.optionsFailed); }
    return json.options;
  }, [project.id, t]);

  // The latest changes and each area's conversation (the bento's band, and the file): read again whenever an area moves
  const [talkN, setTalkN] = useState(0);
  // What the project is, as it was last written in the file (the brief), until the page loads it again
  const [aboutNow, setAboutNow] = useState<string | null>(null);
  const activity = useSystemActivity(project.id, `${sys.areas.map((a) => a.updatedAt ?? "").join("|")}|${talkN}`);
  // Oldest first: a reference keeps its code (R1, R2…) when more arrive
  const boardIds = useMemo(() => board.map((i) => i.id!).filter(Boolean).reverse(), [board]);
  // The skills switched on for criterio.md, kept with the system so the whole team copies the same file
  const skillsOn = useMemo(() => (sys.doc?.skills ?? "").split(",").filter(Boolean), [sys.doc?.skills]);
  const toggleSkill = async (id: string) => {
    const next = skillsOn.includes(id) ? skillsOn.filter((s) => s !== id) : [...skillsOn, id];
    const r = await saveDocPart(project.id, "skills", next.length ? next.join(",") : null);
    if (r.ok) setSystem(r.data); else setError(r.error);
  };
  // criterio.md in blocks: the file to copy or download, and the Markdown view, where a block is edited in place.
  // It carries the whole project: what it is, each area with its references and what was said, and every reference once
  const blocks = useMemo(() => criterioBlocks({
    project: project.name, system: sys,
    items: Object.fromEntries(library.filter((i) => i.id).map((i) => [i.id!, refInfo ? refInfo(i) : { name: i.name, web: i.web }])),
    labels, strings: t.system.md,
    client: clientItem ? { name: clientItem.name, web: clientItem.web } : null,
    about: aboutNow ?? project.intent, board: boardIds, talk: activity?.notes,
    origin: typeof window === "undefined" ? "" : window.location.origin,
    skills: skillsOn, locale,
  }), [sys, project.name, project.intent, aboutNow, library, boardIds, labels, t, clientItem, refInfo, activity, skillsOn, locale]);
  const markdown = useMemo(() => blocksToMd(blocks), [blocks]);
  // The system, as the tiles a person reads or as the file an agent reads: the same thing, seen two ways. Kept on this machine
  // The system's result is the document, criterio.md (components/SystemDoc.tsx). The bento is not shown any more
  // (Eric, 2026-10-04); its code below waits for the cleanup
  const view = "md" as "bento" | "md";
  const copy = async () => { try { await navigator.clipboard.writeText(markdown); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* the download still works */ } };
  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-criterio.md`; a.click(); URL.revokeObjectURL(a.href);
  };

  // The areas' stage is gone with the bento (Eric, 2026-10-04): an area asked for (by the agent, by a link) is its
  // part of the file, scrolled to. The stage's code below waits for the cleanup
  const openArea = null as SystemAreaState | null;
  useEffect(() => { if (open) document.getElementById(`sdoc-${open}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [open]);
  // The faces of the sample come from typography's references wherever it is shown; with none filed yet, from the first of the board
  const typeArea = sys.areas.find((a) => a.area === "typography");
  const typeOwn = (typeArea?.evidence ?? []).map((e) => itemOf(e.itemId)).filter((x): x is InspoItem => !!x);
  const typeRefs = useMemo(() => {
    const base = typeOwn.length ? typeOwn : board.slice(0, 8);
    return clientItem && !base.some((i) => i.id === clientItem.id) ? [clientItem, ...base] : base;
  }, [typeOwn.map((i) => i.id).join(), board, clientItem]); // eslint-disable-line react-hooks/exhaustive-deps
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
  // The tray of the bento: a reference picked up (dragged, or clicked) lands in the tile it is dropped on
  const [carrying, setCarrying] = useState<InspoItem | null>(null);
  const [over, setOver] = useState<SystemArea | null>(null);
  const [landed, setLanded] = useState<{ area: SystemArea; n: number } | null>(null);
  useEffect(() => {
    if (!carrying) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setCarrying(null); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [carrying]);
  const drop = (area: SystemArea, item: InspoItem | null | undefined) => {
    setCarrying(null); setOver(null);
    if (!item?.id) return;
    const a = sys.areas.find((x) => x.area === area);
    if (a?.evidence.some((e) => e.itemId === item.id)) return;
    void toggleRef(area, item, true);
    setLanded((l) => ({ area, n: (l?.n ?? 0) + 1 }));
  };
  useEffect(() => { if (!landed) return; const tm = setTimeout(() => setLanded(null), 1600); return () => clearTimeout(tm); }, [landed]);

  const tileFor = (a: SystemAreaState, stage = false) => {
    const { vs, fromBoard } = visualsFor(a);
    return (
      <Tile key={a.area} stage={stage} area={a} label={labels[a.area]} visuals={vs} fromBoard={fromBoard} sample={project.name} history={history[a.area] ?? []}
        busy={busy.has(a.area)} running={running} hasBoard={board.length > 0} itemOf={itemOf} imageOf={imageOf}
        onDecide={(decision, evidence, why) => withBusy(a.area, () => decideSystemArea(project.id, a.area, { decision, evidence, why }))}
        onNever={(never) => withBusy(a.area, () => setSystemNever(project.id, a.area, never))}
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

  const voiceArea = sys.areas.find((a) => a.area === "voice");
  const voiceHas = !!carrying && !!voiceArea?.evidence.some((e) => e.itemId === carrying.id);

  return (
    <div className={`sysv${openArea ? " is-stage" : ""}`} aria-busy={!system}>
      {/* The system at a glance: the project on top, one tile per area showing one thing, its material. The words,
          the references and the numbers are a click away, on the area's stage */}
      <div className="sysv-sea sysb">
        <div className={`sysb-inner${view === "bento" ? " is-fit" : ""}`}>
          <header className="sysb-head">
            <div className="sysb-head__text">
              <h1 className="sysb-title">{project.name}</h1>
              {project.intent && <p className="sysb-intent">{project.intent}</p>}
              {onClient && clientItem && <ClientChip client={clientItem} imageOf={imageOf} onPick={onClient} />}
            </div>
            <div className="sysb-head__side">
              {filled > 0 ? (
                <p className="sysn-core__state" title={`${t.system.filled(filled, SYSTEM_AREAS.length)}. ${t.system.polishHint}`}>
                  <svg className={`sysn-core__ring${polishPct === 100 ? " is-full" : ""}`} viewBox="0 0 14 14" width="14" height="14" aria-hidden>
                    <circle cx="7" cy="7" r="5.25" />
                    <circle cx="7" cy="7" r="5.25" pathLength={100} strokeDasharray={`${polishPct} 100`} transform="rotate(-90 7 7)" />
                  </svg>
                  <b>{t.system.polishPct(polishPct)}</b>
                </p>
              ) : (
                <p className="sysn-core__summary sysv-muted">{board.length ? (running ? t.system.running : t.system.runHint(board.length)) : t.system.noBoard}</p>
              )}
              {/* One thing asks for attention at a time: reading the board is in sight only while there is something
                  unread; after that it waits in the menu with the rest */}
              <div className="sysn-core__actions">
                {/* On the file, the references are already in it: the model's pass is what puts order in it, sharpens
                    the copy and reads them better, so it is offered as that, and always. It asks first what to improve */}
                {view === "md" && board.length > 0 ? (
                  <Button variant="primary" size="sm" onClick={() => setImproving(true)} disabled={running} title={t.system.improveHint}>
                    {running ? <><span className="spinner spinner--sm" /> {t.system.running}</> : <>{Icons.spark} {t.system.improve}</>}
                  </Button>
                ) : board.length > 0 && (unread || !filled || running) && (
                  <Button variant="primary" size="sm" onClick={() => void run()} disabled={running} title={sys.run ? t.system.rerun : t.system.run}>
                    {running ? <><span className="spinner spinner--sm" /> {t.system.running}</> : <>{Icons.spark} {!sys.run ? t.system.run : stale && stale.unread > 0 ? t.system.readNew(stale.unread) : stale?.wordsChanged ? t.system.readWords : t.system.rerun}</>}
                  </Button>
                )}
                {filled > 0 && (
                  <span className="sysn-core__file">
                    <Button size="sm" onClick={() => void copy()} title={t.system.exportHint}>{copied ? t.system.copied : t.system.export}</Button>
                    <Button size="sm" onClick={download} aria-label={t.system.download} title={t.system.download}>{Icons.arrow}</Button>
                  </span>
                )}
                {!board.length && <Button variant="primary" size="sm" onClick={onOpenBoard}>{Icons.plus} {t.system.addRefs}</Button>}
                <MoreMenu rerun={view !== "md" && board.length > 0 && filled > 0 && !unread && !running ? { label: t.system.rerun, run: () => void run() } : null} />
              </div>
            </div>
          </header>
          {error && <p className="sysv-error" role="alert">{error}</p>}
          {improving && <ImproveModal system={sys} onRun={(focus) => void run(focus)} onClose={() => setImproving(false)} />}
          {view === "md" && (
            <SystemDoc blocks={blocks} system={sys} labels={labels} boardIds={boardIds} itemOf={itemOf} imageOf={imageOf} refInfo={refInfo} activity={activity}
              onSystem={setSystem} onTalk={() => setTalkN((n) => n + 1)}
              onAbout={async (text) => { const r = await saveProjectBrief(project.id, { about: text }); if (r.ok) setAboutNow(r.data.brief?.about ?? text); else setError(r.error); }} onOpenItem={onOpenItem} onText={onText} onTextTitle={onTextTitle}
              fileTools={<SkillsMenu on={skillsOn} onToggle={(id) => void toggleSkill(id)} />}
              busy={busy} onOpen={setOpen} onCopy={() => void copy()} onDownload={download} copied={copied} markdown={markdown} projectId={project.id} projectName={project.name} hasRecipe={!!project.hasRecipe}
              onSave={async (area, next) => {
                const cur = sys.areas.find((x) => x.area === area)!;
                if (next.decision !== cur.decision.trim() || next.why !== cur.why.trim()) await withBusy(area, () => decideSystemArea(project.id, area, { decision: next.decision, why: next.why }));
                if (next.never !== cur.never.trim()) await withBusy(area, () => setSystemNever(project.id, area, next.never));
              }} />
          )}
          {/* How it talks, with the latest changes beside it; under them, how it looks */}
          {view === "bento" && (
            <div className="sysb-top">
              <VoiceBand summary={sys.summary} voice={voiceArea} onOpen={() => setOpen("voice")}
                className={`${running || busy.has("voice") ? " is-busy" : ""}${over === "voice" ? " is-over" : ""}${voiceHas ? " is-has" : ""}${landed?.area === "voice" ? " is-landed" : ""}`}>
                {carrying && <span className="sysb-tile__drop" aria-hidden>{voiceHas ? t.system.start.added : t.system.tray.dropOn(labels.voice)}</span>}
                {landed?.area === "voice" && !carrying && <span className="sysb-tile__drop is-done" aria-live="polite">{t.system.tray.landed(labels.voice)}</span>}
              </VoiceBand>
              <RecentChanges activity={activity} labels={labels} onOpen={setOpen} />
            </div>
          )}
          {view === "bento" && <p className="sysb-rule">{t.bento.looks}</p>}

          {view === "bento" && <div className="sysb-body">
          <div className={`sysb-grid sysb-grid--visual${carrying ? " is-carrying" : ""}`}>
            {sys.areas.filter((a) => a.area !== "voice").map((a) => {
              const level = confidenceOf(a);
              const { vs } = visualsFor(a);
              const own = a.evidence.map((e) => itemOf(e.itemId)).filter((x): x is InspoItem => !!x);
              const go = () => setOpen(a.area);
              const has = !!carrying && a.evidence.some((e) => e.itemId === carrying.id);
              return (
                <article key={a.area} role="button" tabIndex={0} aria-label={labels[a.area]}
                  className={`sysb-tile sysb-tile--${a.area} is-${level}${a.source === "team" ? " is-team" : ""}${a.decision ? "" : " is-open"}${running || busy.has(a.area) ? " is-busy" : ""}${over === a.area ? " is-over" : ""}${has ? " is-has" : ""}${landed?.area === a.area ? " is-landed" : ""}`}
                  style={{ gridArea: a.area, viewTransitionName: `sysa-${a.area}` }}
                  onClick={go} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }}
                  data-area={a.area}>
                  {carrying && <span className="sysb-tile__drop" aria-hidden>{has ? t.system.start.added : t.system.tray.dropOn(labels[a.area])}</span>}
                  {landed?.area === a.area && !carrying && <span className="sysb-tile__drop is-done" aria-live="polite">{t.system.tray.landed(labels[a.area])}</span>}
                  <header className="sysb-tile__head">
                    <span className="sysb-tile__label">{areaIcon(a.area, 14)}{labels[a.area]}{own.length > 0 && <b>{own.length}</b>}</span>
                    <span className="sysb-tile__state">
                      {a.source === "team" ? Icons.check : a.decision ? <i className="sysv-meter"><b style={{ width: `${a.confidence}%` }} /></i> : t.system.open}
                    </span>
                  </header>
                  <div className="sysb-tile__specimen">
                    {a.area === "typography"
                      // With nothing filed under typography yet, the tile tries what the first of the board brings
                      ? <BentoType projectId={project.id} name={project.name} intent={project.intent ?? ""} summary={sys.summary} refs={typeRefs} visuals={visuals} fallback={vs} curation={a.curation} clientItemId={clientItem?.id ?? null} choices={choices} cta={t.system.type.comp.cta} more={t.system.sample.more} />
                      : a.area === "color" ? <BentoColor vs={vs} chosen={sampleColors(choices)} labels={t.system.sample.colorRoles} />
                      : specimenOf(a, vs, project.name)}
                  </div>
                  {/* The decision in one line (voice already shows it as the quote), and the references behind it, small */}
                  <footer className="sysb-tile__foot">
                    {a.decision && <p className="sysb-tile__line">{headlineOf(a.decision)}</p>}
                    <AreaFaces talk={activity?.talk[a.area]} />
                    {own.length > 0 && <span className="sysb-tile__refs">{own.slice(0, 3).map((it) => <Thumb key={it.id} item={it} image={imageOf(it)} />)}</span>}
                  </footer>
                </article>
              );
            })}
          </div>
          {/* The references at hand, beside the bento so it keeps the whole screen */}
          <SystemTray board={board} inbox={inbox} imageOf={imageOf} carrying={carrying} onCarry={setCarrying} onOver={setOver}
            onDrop={(area, item) => drop(area, item)} onOpen={onOpenItem} noteOf={noteOf} pending={pendingRefs} />
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
                  quiet={!a.decision && (own.length === 0 || starting.has(a.area))}
                  ideal={ideals ? [...ideals.board, ...ideals.library].map((x) => itemOf(x.itemId)).filter((x): x is InspoItem => !!x) : []}
                  tall={a.area === "imagery"} imageOf={a.area === "imagery" ? (i) => byItem.get(i.id!)?.scroll ?? imageOf(i) : imageOf}
                  material={(i) => (
                    <RefMaterial area={a.area} v={byItem.get(i.id!)}
                      onColor={(hex) => { setChoice({ [colorRole]: hex }); setColorRole(COLOR_ROLES[(COLOR_ROLES.indexOf(colorRole) + 1) % COLOR_ROLES.length]); }}
                      onRadius={(radius) => setChoice({ radius })}
                      onEasing={(easing, ms) => { setChoice({ easing, ...(ms ? { durationMs: ms } : {}) }); setReplay((n) => n + 1); }}
                      onHeadline={(headline) => setChoice({ headline })} />
                  )}
                  onToggle={(item, on) => void toggleRef(a.area, item, on)} onOpen={onOpenItem}
                  picking={picking ? { picked: picking, toggle: (id) => setPicking((p) => { if (!p) return p; const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }) } : null} />
                {!a.decision && (own.length === 0 || starting.has(a.area)) && (
                  <AreaStarter projectId={project.id} area={a.area} areaLabel={labels[a.area]} inArea={new Set(own.map((i) => i.id!))} itemOf={itemOf} imageOf={imageOf}
                    pending={pendingRefs} busy={busy.has(a.area)} onAdd={(item) => void toggleRef(a.area, item, true)}
                    onDecide={(decision, why) => void withBusy(a.area, () => decideSystemArea(project.id, a.area, { decision, why }))} />
                )}
                {a.area === "typography" ? (
                  // With nothing filed under typography yet, the tester tries what the whole board brings
                  <TypeTester projectId={project.id} projectName={project.name} intent={project.intent ?? ""} summary={sys.summary} refs={own.length ? own : board} visuals={visuals}
                    curation={a.curation} curating={curatingArea === a.area} busy={busy.has(a.area)} itemOf={itemOf} imageOf={imageOf}
                    onFlip={(id, keep) => verdict(id, keep)} onReason={verdict} choices={choices} onChoice={setChoice} clientItemId={clientItem?.id ?? null}
                    onUse={(decision) => void withBusy(a.area, () => decideSystemArea(project.id, a.area, { decision, why: a.why }))} />
                ) : (
                  <>
                    {/* The result, seen: the same sample typography is tried on, painted with this area's choices */}
                    {SAMPLE_AREAS.has(a.area) && (
                      <AreaSample area={a.area} projectId={project.id} projectName={project.name} intent={project.intent ?? ""} summary={sys.summary}
                        typeRefs={typeRefs} visuals={visuals} areaVisuals={vs} typeCuration={typeArea?.curation ?? null}
                        choices={choices} onChoice={setChoice} colorRole={colorRole} onColorRole={setColorRole} replay={replay} onReplay={() => setReplay((n) => n + 1)}
                        busy={busy.has(a.area)} clientItemId={clientItem?.id ?? null}
                        namedFaces={fromWords ? { title: fromWords.fonts[0]?.family, body: fromWords.fonts.find((f) => f.role === "body")?.family ?? fromWords.fonts[0]?.family } : undefined}
                        onUse={a.area === "color" ? (decision) => void withBusy(a.area, () => decideSystemArea(project.id, a.area, { decision, why: a.why })) : undefined} />
                    )}
                    {curatingArea === a.area ? (
                      <p className="sysv-muted"><span className="spinner spinner--sm" /> {t.system.curating}</p>
                    ) : a.curation ? (
                      <AreaTable curation={a.curation} sample={project.name} busy={busy.has(a.area)} itemOf={itemOf} imageOf={imageOf}
                        onFlip={(id, keep) => verdict(id, keep)} onReason={(id, reason) => verdict(id, a.curation!.verdicts.find((v) => v.id === id)?.keep ?? false, reason)} />
                    ) : !SAMPLE_AREAS.has(a.area) && hasMaterial(a.area, vs) && <div className="sysv-tile__specimen sysf-specimen">{specimen}</div>}
                  </>
                )}
              </div>
              <aside className="sysf-aside" aria-label={labels[a.area]}>{tileFor(a, true)}<AreaThread projectId={project.id} area={a.area} refs={own} /></aside>
            </div>
          </div>
        );
      })()}

      {/* Phones: the bento needs room, so the cards stack instead */}
      <div className="sysv-stack">{sys.areas.map((a) => tileFor(a))}</div>
    </div>
  );
}
