"use client";
// The project's system: eight areas, each with the decision the board supports so far. Alive from
// the first reference: a run reads the board and proposes, a person confirms, rewrites or hands an
// area back to the board. Empty areas stay visible: they are what the project has not decided yet.
// Exports criterio.md, the file an agent reads before designing.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { InspoItem, Project } from "@/types/inspo";
import { SYSTEM_AREAS, confidenceOf, emptySystem, staleness, DECISION_MAX, type ProjectSystem, type SystemArea, type SystemAreaState } from "@/types/system";
import { renderCriterioMd } from "@/lib/criterio-md";
import { loadSystem, decideSystemArea, releaseSystemArea } from "@/app/actions/system";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { cachedCardImage } from "./InspoCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Props {
  project: Project;
  /** The references in the project, as the grid shows them */
  board: InspoItem[];
  /** The whole library: evidence may point at a reference that left the project */
  library: InspoItem[];
  imageOf: (item: InspoItem) => string | null;
  onClose: () => void;
}

function Thumb({ item, image }: { item: InspoItem; image: string | null }) {
  const [at, setAt] = useState(0);
  const srcs = [image, cachedCardImage(item.web), `/api/og?url=${encodeURIComponent(item.web)}`].filter((x): x is string => !!x);
  const src = srcs[at];
  return (
    <span className="sys-thumb" aria-hidden>
      {src ? <img key={src} src={src} alt="" loading="lazy" decoding="async" onError={() => setAt((i) => i + 1)} /> : item.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

interface CardProps {
  area: SystemAreaState;
  label: string;
  busy: boolean;
  running: boolean;
  itemOf: (id: string) => InspoItem | undefined;
  imageOf: (item: InspoItem) => string | null;
  onDecide: (decision: string) => Promise<void>;
  onRelease: () => Promise<void>;
}

function AreaCard({ area, label, busy, running, itemOf, imageOf, onDecide, onRelease }: CardProps) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(area.decision);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!editing) setDraft(area.decision); }, [area.decision, editing]);
  const level = confidenceOf(area);
  const evidence = area.evidence.map((e) => ({ ...e, item: itemOf(e.itemId) })).filter((e) => e.item);
  const badge = area.source === "team" ? t.system.confidence.team : level === "high" ? t.system.confidence.high : level === "low" ? t.system.confidence.low : null;
  const save = async () => { await onDecide(draft); setEditing(false); };

  return (
    <article className={`sys-card is-${level}${area.source === "team" ? " is-team" : ""}${busy || running ? " is-busy" : ""}`} aria-busy={busy || running}>
      <header className="sys-card__head">
        <h3 className="sys-card__name">{label}</h3>
        {badge && <span className={`sys-badge sys-badge--${area.source === "team" ? "team" : level}`}>{area.source === "team" && Icons.check}{badge}</span>}
      </header>

      {editing ? (
        <div className="sys-edit">
          <textarea className="input sys-edit__text" rows={4} maxLength={DECISION_MAX} value={draft} autoFocus
            placeholder={t.system.placeholder} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void save(); }} />
          <div className="sys-card__actions">
            <Button variant="primary" size="sm" disabled={busy || !draft.trim()} onClick={() => void save()}>{t.system.save}</Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(false)}>{t.system.cancel}</Button>
            {area.decision && <Button variant="ghost" size="sm" className="sys-card__clear" disabled={busy} onClick={() => { setDraft(""); void onDecide("").then(() => setEditing(false)); }}>{t.system.clear}</Button>}
          </div>
        </div>
      ) : area.decision ? (
        <>
          <p className="sys-card__decision">{area.decision}</p>
          {evidence.length > 0 && (
            <div className="sys-evidence">
              <button type="button" className="sys-evidence__row" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                <span className="sys-evidence__thumbs">{evidence.slice(0, 6).map((e) => <Thumb key={e.itemId} item={e.item!} image={imageOf(e.item!)} />)}</span>
                <span className="sys-evidence__count">{t.system.evidence(evidence.length)}</span>
                <span className={`sys-evidence__chev${open ? " is-open" : ""}`}>{Icons.chevron}</span>
              </button>
              {open && (
                <ul className="sys-evidence__list">
                  {evidence.map((e) => (
                    <li key={e.itemId}><span className="sys-evidence__name">{e.item!.name}</span>{e.take && <span className="sys-evidence__take">{e.take}</span>}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="sys-card__actions">
            {area.source === "model" && <Button variant="primary" size="sm" disabled={busy} onClick={() => void onDecide(area.decision)}>{Icons.check} {t.system.confirm}</Button>}
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(true)}>{t.system.edit}</Button>
            {area.source === "team" && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void onRelease()}>{t.system.release}</Button>}
          </div>
        </>
      ) : (
        <>
          <p className="sys-card__empty">{t.system.empty}</p>
          <p className="sys-card__hint">{t.system.emptyHint}</p>
          <div className="sys-card__actions">
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(true)}>{t.system.write}</Button>
          </div>
        </>
      )}
    </article>
  );
}

export default function SystemModal({ project, board, library, imageOf, onClose }: Props) {
  const { t } = useT();
  const [system, setSystem] = useState<ProjectSystem | null>(null);
  const [boardStamp, setBoardStamp] = useState<{ stamp: string; itemIds: string[] } | null>(null);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<Set<SystemArea>>(() => new Set());
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    loadSystem(project.id).then((r) => {
      if (!alive) return;
      if (!r.ok) { setError(r.error); setSystem(emptySystem(project.id)); return; }
      setSystem(r.data.system); setBoardStamp(r.data.board);
    });
    return () => { alive = false; };
  }, [project.id]);

  const itemOf = useMemo(() => { const m = new Map(library.filter((i) => i.id).map((i) => [i.id!, i])); return (id: string) => m.get(id); }, [library]);
  const labels = t.system.areas as Record<SystemArea, string>;
  const filled = system ? system.areas.filter((a) => a.decision).length : 0;
  const stale = system && boardStamp ? staleness(system, boardStamp.itemIds, boardStamp.stamp) : null;

  const run = useCallback(async () => {
    setRunning(true); setError("");
    try {
      const res = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id }) });
      const json = await res.json().catch(() => ({})) as ProjectSystem & { error?: string };
      if (!res.ok || json.error) throw new Error(json.error || t.system.failed);
      setSystem(json);
      setBoardStamp((b) => (b && json.run ? { stamp: json.run.stamp, itemIds: json.run.itemIds } : b));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setRunning(false); }
  }, [project.id, t]);

  const withBusy = async (area: SystemArea, fn: () => Promise<{ ok: true; data: ProjectSystem } | { ok: false; error: string }>) => {
    setBusy((s) => new Set([...s, area])); setError("");
    try {
      const r = await fn().catch((e) => ({ ok: false as const, error: String(e) }));
      if (!r.ok) throw new Error(r.error);
      setSystem(r.data);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy((s) => { const n = new Set(s); n.delete(area); return n; }); }
  };

  const markdown = useMemo(() => system ? renderCriterioMd({
    project: project.name, system,
    items: Object.fromEntries(library.filter((i) => i.id).map((i) => [i.id!, { name: i.name, web: i.web }])),
    labels, strings: t.system.md,
  }) : "", [system, project.name, library, labels, t]);
  const copy = async () => { try { await navigator.clipboard.writeText(markdown); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked: the download still works */ } };
  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-criterio.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="modal--system" aria-busy={!system}>
        <header className="sys-head">
          <div className="sys-head__text">
            <DialogTitle className="sys-title">{t.system.title(project.name)}</DialogTitle>
            <p className="sys-lead">{system ? t.system.filled(filled, SYSTEM_AREAS.length) : t.system.lead}</p>
          </div>
          <div className="sys-head__actions">
            {system && (
              <>
                <Button variant="ghost" size="sm" onClick={() => void copy()} disabled={!filled} title={t.system.exportHint}>{copied ? t.system.copied : <>{t.system.copy} {t.system.export}</>}</Button>
                <Button variant="ghost" size="sm" onClick={download} disabled={!filled} title={t.system.exportHint}>{t.system.download}</Button>
                <Button variant="primary" size="sm" onClick={() => void run()} disabled={running || !board.length}>
                  {running ? <><span className="spinner spinner--sm" /> {t.system.running}</> : <>{Icons.spark} {system.run ? t.system.rerun : t.system.run}</>}
                </Button>
              </>
            )}
            <DialogClose render={<Button variant="icon" aria-label={t.common.close} />}>{Icons.x}</DialogClose>
          </div>
        </header>

        <div className="sys-body">
          {!system ? <div className="polish-loading"><span className="spinner" /></div> : <>
            {error && <p className="sys-error" role="alert">{error}</p>}
            {!board.length ? (
              <p className="sys-note">{t.system.noBoard}</p>
            ) : !system.run ? (
              <p className="sys-note">{t.system.runHint(board.length)}</p>
            ) : stale && (stale.unread > 0 || stale.wordsChanged) ? (
              <p className="sys-note sys-note--stale">{stale.unread > 0 ? t.system.stale(stale.unread) : t.system.staleWords}</p>
            ) : null}

            {system.summary && (
              <section className="sys-summary">
                <h2 className="sys-summary__title">{t.system.summaryTitle}</h2>
                <p className="sys-summary__text">{system.summary}</p>
              </section>
            )}

            <div className="sys-grid">
              {system.areas.map((a) => (
                <AreaCard key={a.area} area={a} label={labels[a.area]} busy={busy.has(a.area)} running={running} itemOf={itemOf} imageOf={imageOf}
                  onDecide={(decision) => withBusy(a.area, () => decideSystemArea(project.id, a.area, { decision }))}
                  onRelease={() => withBusy(a.area, () => releaseSystemArea(project.id, a.area))} />
              ))}
            </div>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
