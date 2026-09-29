"use client";
// "Add to project" from a card: a checklist of the workspace's projects (a reference can be in several)
// and, at the bottom, a field that creates a project and files the card in it in one go.
import { useState, type ReactNode } from "react";
import type { Project } from "@/types/inspo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";

export const IconFolder = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M2 4.5A1.5 1.5 0 013.5 3h2.8l1.5 1.7h4.7A1.5 1.5 0 0114 6.2v5.3a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5z" />
  </svg>
);

export default function ProjectPicker({ projects, filed, onToggle, onCreate, onOpenChange, className, label, children }: {
  projects: Project[];
  /** Ids of the projects this reference is already in */
  filed: string[];
  onToggle: (projectId: string, on: boolean) => void;
  onCreate: (name: string) => Promise<void>;
  onOpenChange?: (open: boolean) => void;
  className: string;
  label: string;
  children: ReactNode;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (o: boolean) => { setOpen(o); if (!o) setName(""); onOpenChange?.(o); };

  const create = async () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    try { await onCreate(n); setName(""); } finally { setBusy(false); }
  };

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger className={className} aria-label={label} data-tip={open ? undefined : label} onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      {/* Clicks inside the portal still bubble through React to the card: stopped here */}
      <PopoverContent align="end" className="pp" onClick={(e) => e.stopPropagation()}>
        <div className="ws__section">{t.projects.fileIn}</div>
        {projects.length === 0 && <div className="pp__none">{t.projects.none}</div>}
        <div className="pp__list">
          {projects.map((p) => {
            const on = filed.includes(p.id);
            return (
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
      </PopoverContent>
    </Popover>
  );
}
