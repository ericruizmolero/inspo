"use client";
// "Add to project" from a card: a checklist of the workspace's projects (a reference can be in several)
// and, at the bottom, a field that creates a project and files the card in it in one go. Each project opens
// onto the eight areas of its system: one tap files the reference in the project and under that area at once.
import { useEffect, useState, type ReactNode } from "react";
import type { Project } from "@/types/inspo";
import { SYSTEM_AREAS, type SystemArea } from "@/types/system";
import { areaIcon } from "./area-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";

export const IconFolder = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M2 4.5A1.5 1.5 0 013.5 3h2.8l1.5 1.7h4.7A1.5 1.5 0 0114 6.2v5.3a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5z" />
  </svg>
);

export default function ProjectPicker({ projects, filed, onToggle, onCreate, onOpenChange, className, label, children, areasIn, onToggleArea }: {
  projects: Project[];
  /** Ids of the projects this reference is already in */
  filed: string[];
  onToggle: (projectId: string, on: boolean) => void;
  onCreate: (name: string) => Promise<void>;
  onOpenChange?: (open: boolean) => void;
  className: string;
  label: string;
  children: ReactNode;
  /** The areas this reference backs in each project's system */
  areasIn?: Record<string, SystemArea[]>;
  /** Files it under an area of a project (in the project too, if it was not) */
  onToggleArea?: (projectId: string, area: SystemArea, on: boolean) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  // Two steps, like a phone's menu: first the project, then what it is for there (the areas of its system)
  const [inside, setInside] = useState<string | null>(null);
  const [made, setMade] = useState<string | null>(null);
  const labels = t.system.areas as Record<SystemArea, string>;
  const change = (o: boolean) => { setOpen(o); if (!o) { setName(""); setInside(null); } onOpenChange?.(o); };
  // A project just created opens straight onto its areas
  useEffect(() => {
    if (!made) return;
    const p = projects.find((x) => x.name === made);
    if (p) { setInside(p.id); setMade(null); }
  }, [made, projects]);

  const create = async () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    try { await onCreate(n); setName(""); if (onToggleArea) setMade(n); } finally { setBusy(false); }
  };
  const project = inside ? projects.find((p) => p.id === inside) : undefined;

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger className={className} aria-label={label} data-tip={open ? undefined : label} onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      {/* Clicks inside the portal still bubble through React to the card: stopped here */}
      <PopoverContent align="end" className={`pp${onToggleArea ? " pp--steps" : ""}`} onClick={(e) => e.stopPropagation()}>
        {project && onToggleArea ? (() => {
          const on = filed.includes(project.id);
          const areas = areasIn?.[project.id] ?? [];
          return (
            <div className="pp-step" key={project.id}>
              <button type="button" className="pp-step__back" onClick={() => setInside(null)}>
                <span className="pp-step__chev is-back" aria-hidden>{Icons.chevron}</span>
                <span className="pp-step__title">{project.name}</span>
              </button>
              <button type="button" className={`pp-in${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => onToggle(project.id, !on)}>
                <span className="pp__icon" aria-hidden>{IconFolder}</span>
                <span className="pp-in__text">{on ? t.projects.inProject : t.projects.addToProject}</span>
                <i className="pp-in__switch" aria-hidden />
              </button>
              <p className="pp-step__ask">{t.projects.whatFor}</p>
              <div className="pp-areas">
                {SYSTEM_AREAS.map((k) => {
                  const has = areas.includes(k);
                  return (
                    <button key={k} type="button" className={`pp-area${has ? " is-on" : ""}`} aria-pressed={has} onClick={() => onToggleArea(project.id, k, !has)}>
                      <span className="pp-area__icon">{has ? Icons.check : areaIcon(k, 15)}</span>
                      <span className="pp-area__name">{labels[k]}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" className="pp-step__done" onClick={() => change(false)}>{t.projects.done}</button>
            </div>
          );
        })() : (
          <>
            <div className="ws__section">{t.projects.fileIn}</div>
            {projects.length === 0 && <div className="pp__none">{t.projects.none}</div>}
            <div className="pp__list">
              {projects.map((p) => {
                const on = filed.includes(p.id);
                const areas = areasIn?.[p.id] ?? [];
                return onToggleArea ? (
                  // The row says where it already is (the areas, as their icons) and leads inside
                  <button key={p.id} type="button" className={`ws__item pp-proj${on ? " is-active" : ""}`} onClick={() => setInside(p.id)}>
                    <span className="pp__icon" aria-hidden>{on ? Icons.check : IconFolder}</span>
                    <span className="ws__item-name">{p.name}</span>
                    {areas.length > 0 && <span className="pp-proj__areas" aria-label={areas.map((k) => labels[k]).join(", ")}>{areas.slice(0, 4).map((k) => <i key={k}>{areaIcon(k, 11)}</i>)}{areas.length > 4 && <b>+{areas.length - 4}</b>}</span>}
                    <span className="pp-step__chev" aria-hidden>{Icons.chevron}</span>
                  </button>
                ) : (
                  <button key={p.id} type="button" className={`ws__item${on ? " is-active" : ""}`} aria-pressed={on} onClick={() => onToggle(p.id, !on)}>
                    <span className="pp__icon" aria-hidden>{IconFolder}</span>
                    <span className="ws__item-name">{p.name}</span>
                    {on && <span className="ws__item-check">{Icons.check}</span>}
                  </button>
                );
              })}
            </div>
            <div className="ws__divider" />
            <form className="pp__new" onSubmit={(e) => { e.preventDefault(); create(); }}>
              <span className="ws__plus" aria-hidden>{busy ? <span className="spinner spinner--sm" /> : Icons.plus}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.projects.newProject}
                aria-label={t.projects.namePlaceholder}
                maxLength={60}
                disabled={busy}
              />
              {name.trim() && <button type="submit" className="pp__create" disabled={busy}>{t.projects.create(name.trim())}</button>}
            </form>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
