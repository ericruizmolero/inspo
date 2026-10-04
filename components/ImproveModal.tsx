"use client";
// "Improve with AI": before the model works, the team says what it wants from the pass (put order, sharpen the
// writing, read the references again), in which areas, and anything else in its own words. Under that, what to
// expect from it. The choice travels with the run (SystemFocus, lib/system.ts): what is left out stays as it was.
import { useState } from "react";
import { IMPROVE_AIMS, IMPROVE_NOTE_MAX, SYSTEM_AREAS, type ImproveAim, type ProjectSystem, type SystemArea, type SystemFocus } from "@/types/system";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { areaIcon } from "./area-icons";
import "./ImproveModal.css";

export default function ImproveModal({ system, onRun, onClose }: {
  system: ProjectSystem;
  onRun: (focus: SystemFocus) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const m = t.system.improveModal;
  // What a person decided is not the model's to change: those areas are shown, and locked
  const team = new Set(system.areas.filter((a) => a.source === "team").map((a) => a.area));
  const open = SYSTEM_AREAS.filter((a) => !team.has(a));
  const [aims, setAims] = useState<Set<ImproveAim>>(() => new Set(IMPROVE_AIMS));
  const [areas, setAreas] = useState<Set<SystemArea>>(() => new Set(open));
  const [note, setNote] = useState("");
  const toggle = <T,>(set: Set<T>, v: T) => { const next = new Set(set); if (!next.delete(v)) next.add(v); return next; };
  const all = areas.size === open.length;
  const ready = areas.size > 0 && (aims.size > 0 || note.trim().length > 0);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="imp">
        <div className="modal__header">
          <DialogTitle>{t.system.improve}</DialogTitle>
          <DialogClose render={<Button variant="icon" aria-label={t.common.close} />}>{Icons.x}</DialogClose>
        </div>
        <form className="modal__body imp__body" onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          onRun({ aims: IMPROVE_AIMS.filter((a) => aims.has(a)), areas: SYSTEM_AREAS.filter((a) => areas.has(a)), note: note.trim() });
          onClose();
        }}>
          <DialogDescription className="imp__lead">{m.lead}</DialogDescription>

          <section className="imp__group">
            <h3 className="imp__label">{m.aimsLabel}</h3>
            <div className="imp__aims">
              {IMPROVE_AIMS.map((a) => (
                <button key={a} type="button" role="switch" aria-checked={aims.has(a)} className={`imp-aim${aims.has(a) ? " is-on" : ""}`} onClick={() => setAims((s) => toggle(s, a))}>
                  <span className="imp-aim__text"><b>{m.aims[a].name}</b><span>{m.aims[a].what}</span></span>
                  <span className="imp-aim__switch" aria-hidden><span /></span>
                </button>
              ))}
            </div>
          </section>

          <section className="imp__group">
            <h3 className="imp__label">{m.areasLabel}</h3>
            <div className="pills" role="group" aria-label={m.areasLabel}>
              <button type="button" aria-pressed={all} className={`pill${all ? " is-on" : ""}`} disabled={!open.length} onClick={() => setAreas(all ? new Set() : new Set(open))}>{m.allAreas}</button>
              {SYSTEM_AREAS.map((a) => (
                <button key={a} type="button" aria-pressed={areas.has(a)} disabled={team.has(a)} title={team.has(a) ? m.teamArea : undefined}
                  className={`pill imp__area${areas.has(a) ? " is-on" : ""}`} onClick={() => setAreas((s) => toggle(s, a))}>
                  {areaIcon(a, 13)}{t.system.areas[a]}
                </button>
              ))}
            </div>
          </section>

          <label className="imp__group">
            <span className="imp__label">{m.noteLabel} <small>{m.optional}</small></span>
            <textarea className="input" rows={2} maxLength={IMPROVE_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} placeholder={m.notePlaceholder} />
          </label>

          <section className="imp__expect">
            <h3 className="imp__label">{m.expectLabel}</h3>
            <ul>
              <li>{m.expect.time}</li>
              <li>{team.size ? m.expect.team(team.size) : m.expect.noTeam}</li>
              <li>{m.expect.empty}</li>
              <li>{m.expect.undo}</li>
            </ul>
          </section>

          <div className="modal__footer">
            <Button variant="ghost" type="button" onClick={onClose}>{t.common.cancel}</Button>
            <Button variant="primary" type="submit" disabled={!ready}>{Icons.spark} {m.run}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
