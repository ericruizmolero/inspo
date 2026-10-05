"use client";
// Several references at once, like Cosmos: ⌘ or ⇧-click a card (or its circle) and this bar takes the dock's place.
// In the library it files the selection in a project; inside a project it moves it to another one or takes it out.
import type { Project } from "@/types/inspo";
import ProjectPicker, { IconFolder } from "./ProjectPicker";
import { useT } from "./I18nProvider";
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
    <aside className={`selbar${closing ? " is-closing" : ""}`} aria-label={s.selected(count)} inert={closing}
      onTransitionEnd={(e) => { if (closing && e.target === e.currentTarget && e.propertyName === "opacity") onClosed(); }}>
      <span className="selbar__count" role="status" aria-live="polite">{s.selected(count)}</span>
      <span className="selbar__sep" aria-hidden />
      {current ? (
        <ProjectPicker projects={projects.filter((p) => p.id !== current.id)} filed={[]} onToggle={(id) => onMove(id)} onCreate={onCreate}
          side="top" closeOnPick className="selbar__btn" label={s.moveTo}>
          {IconFolder}<span>{s.move}</span>
        </ProjectPicker>
      ) : (
        <ProjectPicker projects={projects} filed={filed} partly={partly} onToggle={onFile} onCreate={onCreate}
          side="top" className="selbar__btn" label={s.addTo}>
          {IconFolder}<span>{s.add}</span>
        </ProjectPicker>
      )}
      {current && (
        <button type="button" className="selbar__btn" onClick={onRemove} aria-label={s.removeFrom(current.name)} data-tip={s.removeFrom(current.name)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 8.2a1.5 1.5 0 001.5 1.3h3.6a1.5 1.5 0 001.5-1.3l.7-8.2" />
          </svg>
          <span>{s.remove}</span>
        </button>
      )}
      <span className="selbar__sep" aria-hidden />
      <button type="button" className="selbar__done" onClick={onDone}>{t.projects.done}</button>
    </aside>
  );
}
