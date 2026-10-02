"use client";
// Organise the Inbox: the model proposes, for each unfiled reference, the project it serves and the
// areas of that project's system it speaks to. The team reviews the list (untick what is wrong, move
// a reference to another project) and applies it in one go.
import { useEffect, useMemo, useRef, useState } from "react";
import type { InspoItem, Project } from "@/types/inspo";
import { SYSTEM_AREAS, type ProjectSystem, type SystemArea } from "@/types/system";
import type { TriageProposal } from "@/lib/system";
import { applySystemTriage } from "@/app/actions/system";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { cachedCardImage } from "./InspoCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Props {
  /** The unfiled references */
  inbox: InspoItem[];
  projects: Project[];
  imageOf: (item: InspoItem) => string | null;
  /** Applied: which references went where, so the library updates without a reload */
  onApplied: (picks: { itemId: string; projectId: string }[], systems: Record<string, ProjectSystem>) => void;
  onClose: () => void;
}

function Thumb({ item, image }: { item: InspoItem; image: string | null }) {
  const [at, setAt] = useState(0);
  const srcs = [image, cachedCardImage(item.web), `/api/og?url=${encodeURIComponent(item.web)}`].filter((x): x is string => !!x);
  const src = srcs[at];
  return <span className="sysv-thumb triage__thumb" aria-hidden>{src ? <img key={src} src={src} alt="" loading="lazy" decoding="async" onError={() => setAt((i) => i + 1)} /> : item.name.slice(0, 1).toUpperCase()}</span>;
}

type Row = TriageProposal & { on: boolean };

export default function TriageModal({ inbox, projects, imageOf, onApplied, onClose }: Props) {
  const { t } = useT();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [running, setRunning] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const labels = t.system.areas as Record<SystemArea, string>;
  const itemOf = useMemo(() => new Map(inbox.filter((i) => i.id).map((i) => [i.id!, i])), [inbox]);
  const projectOf = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  // One call per open: development mounts effects twice, and this one costs money
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/system/triage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemIds: inbox.map((i) => i.id).filter(Boolean) }) });
        const json = await res.json().catch(() => ({})) as { proposals?: TriageProposal[]; error?: string };
        if (!res.ok || json.error || !json.proposals) throw new Error(json.error || t.triage.failed);
        if (alive) setRows(json.proposals.filter((p) => itemOf.has(p.itemId)).map((p) => ({ ...p, on: !!p.projectId })));
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : String(e)); }
      finally { if (alive) setRunning(false); }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const g = new Map<string | null, Row[]>();
    for (const r of rows ?? []) g.set(r.projectId, [...(g.get(r.projectId) ?? []), r]);
    const order = [...projects.map((p) => p.id), null].filter((k) => g.has(k));
    return order.map((k) => ({ projectId: k, rows: g.get(k)! }));
  }, [rows, projects]);
  const picked = (rows ?? []).filter((r) => r.on && r.projectId);
  const patch = (itemId: string, p: Partial<Row>) => setRows((rs) => rs?.map((r) => (r.itemId === itemId ? { ...r, ...p } : r)) ?? rs);

  const apply = async () => {
    setApplying(true); setError("");
    const picks = picked.map((r) => ({ itemId: r.itemId, projectId: r.projectId!, areas: r.areas }));
    const r = await applySystemTriage(picks).catch((e) => ({ ok: false as const, error: String(e) }));
    setApplying(false);
    if (!r.ok) { setError(r.error); return; }
    onApplied(picks, r.data.systems);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="modal--triage" aria-busy={running}>
        <header className="sys-head">
          <div className="sys-head__text">
            <DialogTitle className="sys-title">{t.triage.title}</DialogTitle>
            <p className="sys-lead">{running ? t.triage.running(inbox.length) : rows ? t.triage.summary(picked.length, rows.length) : ""}</p>
          </div>
          <div className="sys-head__actions">
            <Button variant="primary" size="sm" disabled={running || applying || !picked.length} onClick={() => void apply()}>{applying ? <span className="spinner spinner--sm" /> : Icons.check} {t.triage.apply(picked.length)}</Button>
            <DialogClose render={<Button variant="icon" aria-label={t.common.close} />}>{Icons.x}</DialogClose>
          </div>
        </header>
        <div className="sys-body triage">
          {error && <p className="sysv-error" role="alert">{error}</p>}
          {running && <div className="polish-loading"><span className="spinner" /></div>}
          {groups.map(({ projectId, rows }) => (
            <section key={projectId ?? "none"} className="triage__group">
              <h3 className="triage__project">{projectId ? projectOf.get(projectId)?.name : t.triage.noProject}<span className="triage__n">{rows.length}</span></h3>
              <ul className="triage__list">
                {rows.map((r) => {
                  const item = itemOf.get(r.itemId)!;
                  return (
                    <li key={r.itemId} className={`triage__row${r.on && r.projectId ? "" : " is-off"}`}>
                      <label className="triage__pick"><input type="checkbox" checked={r.on && !!r.projectId} disabled={!r.projectId} onChange={(e) => patch(r.itemId, { on: e.target.checked })} /><Thumb item={item} image={imageOf(item)} /></label>
                      <div className="triage__text">
                        <span className="triage__name">{item.name}</span>
                        <span className="triage__reason">{r.reason}</span>
                        <span className="triage__areas">
                          {SYSTEM_AREAS.map((k) => {
                            const on = r.areas.includes(k);
                            return <button key={k} type="button" className={`sysv-chip triage__chip${on ? " is-on" : ""}`} aria-pressed={on}
                              onClick={() => patch(r.itemId, { areas: on ? r.areas.filter((a) => a !== k) : [...r.areas, k] })}>{labels[k]}</button>;
                          })}
                        </span>
                      </div>
                      <select className="input triage__select" value={r.projectId ?? ""} aria-label={t.triage.project}
                        onChange={(e) => patch(r.itemId, { projectId: e.target.value || null, on: !!e.target.value })}>
                        <option value="">{t.triage.noProject}</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {!running && rows && rows.length === 0 && <p className="sysv-muted">{t.triage.empty}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
