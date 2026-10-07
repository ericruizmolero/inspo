"use client";
// "Improve with AI": before the model works, the team says what it wants from the pass (put order, sharpen the
// writing, read the references again), in which areas (any of the eight), and anything else in its own words. Under
// that, what to expect from it. The choice travels with the run (SystemFocus, lib/system.ts): what is left out stays as it was.
import { useState } from "react";
import { IMPROVE_AIMS, IMPROVE_NOTE_MAX, SYSTEM_AREAS, type ImproveAim, type ProjectSystem, type SystemArea, type SystemFocus } from "@/types/system";
import { Dialog, DialogDescription, DialogWindow } from "@/components/ui/dialog";
import { useT } from "./I18nProvider";
import { areaIcon } from "./area-icons";
import { Button, Card, Chip, Switch, TextArea } from "@/components/criterio";
import "./ImproveModal.css";

export default function ImproveModal({ system, onRun, onClose }: {
  system: ProjectSystem;
  onRun: (focus: SystemFocus) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const m = t.system.improveModal;
  // Every area can be improved, the ones the team decided too: there the decision stands and its telling gets better
  const team = system.areas.filter((a) => a.source === "team").length;
  const [aims, setAims] = useState<Set<ImproveAim>>(() => new Set(IMPROVE_AIMS));
  const [areas, setAreas] = useState<Set<SystemArea>>(() => new Set(SYSTEM_AREAS));
  const [note, setNote] = useState("");
  const toggle = <T,>(set: Set<T>, v: T) => { const next = new Set(set); if (!next.delete(v)) next.add(v); return next; };
  const all = areas.size === SYSTEM_AREAS.length;
  const ready = areas.size > 0 && (aims.size > 0 || note.trim().length > 0);

  const run = () => {
    if (!ready) return;
    onRun({ aims: IMPROVE_AIMS.filter((a) => aims.has(a)), areas: SYSTEM_AREAS.filter((a) => areas.has(a)), note: note.trim() });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogWindow className="imp" bar={m.bar} heading={t.system.improve} closeLabel={t.common.close}
        footer={
          <div className="modal__footer">
            <Button onClick={onClose}>{t.common.cancel}</Button>
            <Button variant="primary" type="submit" form="improve-ai" icon="sparkle" disabled={!ready}>{m.run}</Button>
          </div>
        }>
        <form id="improve-ai" className="imp__body" onSubmit={(e) => { e.preventDefault(); run(); }}>
          <DialogDescription className="imp__lead">{m.lead}</DialogDescription>

          <section className="imp__group">
            <h3 className="t-label imp__label">{m.aimsLabel}</h3>
            <div className="imp__aims">
              {/* The whole row toggles; the Switch inside it is the control the keyboard and screen readers reach */}
              {IMPROVE_AIMS.map((a) => (
                <div key={a} className={`imp-aim${aims.has(a) ? " is-on" : ""}`} onClick={() => setAims((s) => toggle(s, a))}>
                  <span className="imp-aim__text"><b>{m.aims[a].name}</b><span>{m.aims[a].what}</span></span>
                  <Switch checked={aims.has(a)} label={m.aims[a].name} />
                </div>
              ))}
            </div>
          </section>

          <section className="imp__group">
            <h3 className="t-label imp__label">{m.areasLabel}</h3>
            <div className="pills" role="group" aria-label={m.areasLabel}>
              <Chip pressed={all} onClick={() => setAreas(all ? new Set() : new Set(SYSTEM_AREAS))}>{m.allAreas}</Chip>
              {SYSTEM_AREAS.map((a) => (
                <Chip key={a} className="imp__area" pressed={areas.has(a)} onClick={() => setAreas((s) => toggle(s, a))}>
                  {areaIcon(a, 13)}{t.system.areas[a]}
                </Chip>
              ))}
            </div>
          </section>

          <label className="imp__group">
            <span className="t-label imp__label">{m.noteLabel} <small>{m.optional}</small></span>
            <TextArea rows={2} maxLength={IMPROVE_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} placeholder={m.notePlaceholder} />
          </label>

          <Card as="section" tone="paper" className="imp__expect" eyebrow={m.expectLabel}>
            <ul>
              <li>{m.expect.words}</li>
              <li>{m.expect.time}</li>
              {team > 0 && <li>{m.expect.team}</li>}
              <li>{m.expect.empty}</li>
              <li>{m.expect.undo}</li>
            </ul>
          </Card>
        </form>
      </DialogWindow>
    </Dialog>
  );
}
