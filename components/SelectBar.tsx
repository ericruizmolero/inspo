"use client";
// Several references at once, like Cosmos: ⌘ or ⇧-click a card (or its circle) and this bar takes the dock's place.
// In the library and the Inbox it files the selection in a project or deletes it for good; inside a project it
// moves it to another one or takes it out. "Select all" takes the whole board on screen (⌘A does the same).
import type { Project } from "@/types/inspo";
import ProjectPicker from "./ProjectPicker";
import { useT } from "./I18nProvider";
import { Button, Icon, Separator } from "@/components/criterio";
import "./SelectBar.css";

export default function SelectBar({ count, total, closing, onClosed, projects, filed, partly, current, onAll, onFile, onMove, onCreate, onRemove, onDelete, onDone }: {
  count: number;
  /** How many the board on screen holds: with all of them picked there is nothing left to offer */
  total: number;
  /** The selection emptied: it fades down and out, then onClosed unmounts it */
  closing: boolean; onClosed: () => void;
  projects: Project[];
  /** Projects every selected reference is in, and the ones only some are in */
  filed: string[]; partly: string[];
  /** The project on screen, if any: then the bar moves and takes out, instead of filing */
  current: Project | null;
  onAll: () => void;
  onFile: (projectId: string, on: boolean) => void;
  onMove: (projectId: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRemove: () => void;
  onDelete: () => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const s = t.select;
  return (
    <aside className={`selbar cr-on-chrome${closing ? " is-closing" : ""}`} aria-label={s.selected(count)} inert={closing}
      onTransitionEnd={(e) => { if (closing && e.target === e.currentTarget && e.propertyName === "opacity") onClosed(); }}>
      <span className="t-title-m selbar__count" role="status" aria-live="polite">{s.selected(count)}</span>
      {count < total && (
        <Button variant="quiet" size="s" icon="check" className="selbar__btn" onClick={onAll} aria-label={s.all} data-tip={s.all}>
          <span>{s.all}</span>
        </Button>
      )}
      <Separator vertical className="selbar__sep" />
      {current ? (
        <ProjectPicker projects={projects.filter((p) => p.id !== current.id)} filed={[]} onToggle={(id) => onMove(id)} onCreate={onCreate}
          side="top" closeOnPick className="cr-btn cr-btn-quiet cr-btn-m selbar__btn" label={s.moveTo}>
          <Icon name="folder" size={20} /><span>{s.move}</span>
        </ProjectPicker>
      ) : (
        <ProjectPicker projects={projects} filed={filed} partly={partly} onToggle={onFile} onCreate={onCreate}
          side="top" className="cr-btn cr-btn-quiet cr-btn-m selbar__btn" label={s.addTo}>
          <Icon name="folder" size={20} /><span>{s.add}</span>
        </ProjectPicker>
      )}
      {current && (
        <button type="button" className="cr-btn cr-btn-quiet cr-btn-m selbar__btn" onClick={onRemove} aria-label={s.removeFrom(current.name)} data-tip={s.removeFrom(current.name)}>
          <Icon name="trash" size={20} />
          <span>{s.remove}</span>
        </button>
      )}
      {!current && (
        <Button variant="quiet" size="s" icon="trash" className="selbar__btn" onClick={onDelete} aria-label={s.deleteSelection} data-tip={s.deleteSelection}>
          <span>{t.common.delete}</span>
        </Button>
      )}
      <Separator vertical className="selbar__sep" />
      <Button className="selbar__done" onClick={onDone}>{t.projects.done}</Button>
    </aside>
  );
}
