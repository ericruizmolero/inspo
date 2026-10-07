"use client";
// Several references at once, like Cosmos: ⌘ or ⇧-click a card (or its circle) and this bar takes the dock's place.
// In the library it files the selection in a project; inside a project it moves it to another one or takes it out.
import type { Project } from "@/types/inspo";
import ProjectPicker, { IconFolder } from "./ProjectPicker";
import { useT } from "./I18nProvider";
import { Button, Icon, Separator } from "@/components/criterio";
import "./SelectBar.css";

export default function SelectBar({ count, closing, onClosed, projects, filed, partly, current, onFile, onMove, onCreate, onRemove, onDone }: {
  count: number;
  /** The selection emptied: it fades down and out, then onClosed unmounts it */
  closing: boolean; onClosed: () => void;
  projects: Project[];
  /** Projects every selected reference is in, and the ones only some are in */
  filed: string[]; partly: string[];
  /** The project on screen, if any: then the bar moves and takes out, instead of filing */
  current: Project | null;
  onFile: (projectId: string, on: boolean) => void;
  onMove: (projectId: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRemove: () => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const s = t.select;
  return (
    <aside className={`selbar cr-on-chrome${closing ? " is-closing" : ""}`} aria-label={s.selected(count)} inert={closing}
      onTransitionEnd={(e) => { if (closing && e.target === e.currentTarget && e.propertyName === "opacity") onClosed(); }}>
      <span className="t-title-m selbar__count" role="status" aria-live="polite">{s.selected(count)}</span>
      <Separator vertical className="selbar__sep" />
      {current ? (
        <ProjectPicker projects={projects.filter((p) => p.id !== current.id)} filed={[]} onToggle={(id) => onMove(id)} onCreate={onCreate}
          side="top" closeOnPick className="btn btn--quiet selbar__btn" label={s.moveTo}>
          {IconFolder}<span>{s.move}</span>
        </ProjectPicker>
      ) : (
        <ProjectPicker projects={projects} filed={filed} partly={partly} onToggle={onFile} onCreate={onCreate}
          side="top" className="btn btn--quiet selbar__btn" label={s.addTo}>
          {IconFolder}<span>{s.add}</span>
        </ProjectPicker>
      )}
      {current && (
        <button type="button" className="btn btn--quiet selbar__btn" onClick={onRemove} aria-label={s.removeFrom(current.name)} data-tip={s.removeFrom(current.name)}>
          <Icon name="trash" size={16} />
          <span>{s.remove}</span>
        </button>
      )}
      <Separator vertical className="selbar__sep" />
      <Button className="selbar__done" onClick={onDone}>{t.projects.done}</Button>
    </aside>
  );
}
