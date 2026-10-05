"use client";
// "Add to project" from a card: a checklist of the workspace's projects (a reference can be in several)
// and, on top, one field that finds a project or creates it and files the card in it in one go. A tap on a row
// files or unfiles it.
import { useRef, useState, type ReactNode } from "react";
import type { Project } from "@/types/inspo";
import type { SystemArea } from "@/types/system";
import { areaIcon } from "./area-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";

export const IconFolder = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M2 4.5A1.5 1.5 0 013.5 3h2.8l1.5 1.7h4.7A1.5 1.5 0 0114 6.2v5.3a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5z" />
  </svg>
);

export default function ProjectPicker({ projects, filed, partly = [], onToggle, onCreate, onOpenChange, className, label, children, areasIn, side, closeOnPick }: {
  projects: Project[];
  /** Ids of the projects this reference is already in (with several selected: the ones all of them are in) */
  filed: string[];
  /** With several selected: the projects only some of them are in */
  partly?: string[];
  onToggle: (projectId: string, on: boolean) => void;
  onCreate: (name: string) => Promise<void>;
  onOpenChange?: (open: boolean) => void;
  className: string;
  label: string;
  children: ReactNode;
  /** The areas this reference backs in each project's system, shown as their icons */
  areasIn?: Record<string, SystemArea[]>;
  /** Above the trigger, for a bar at the bottom of the screen */
  side?: "top" | "bottom";
  /** One pick and it closes (moving a selection somewhere) */
  closeOnPick?: boolean;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  // One field: it narrows the list, and a name nobody has yet becomes a new project
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const labels = t.system.areas as Record<SystemArea, string>;
  const change = (o: boolean) => { setOpen(o); if (!o) setQuery(""); onOpenChange?.(o); };

  const q = query.trim();
  const needle = q.toLowerCase();
  const shown = needle ? projects.filter((p) => p.name.toLowerCase().includes(needle)) : projects;
  const exact = projects.find((p) => p.name.toLowerCase() === needle);
  const create = async () => {
    if (!q || busy) return;
    setBusy(true);
    try { await onCreate(q); setQuery(""); if (closeOnPick) change(false); } finally { setBusy(false); }
  };
  const pick = (id: string, on: boolean) => { onToggle(id, on); if (closeOnPick) change(false); };
  // Enter on a name that exists files it there; on a new one, makes it
  const submit = () => {
    if (exact) pick(exact.id, !filed.includes(exact.id));
    else if (q) create();
  };

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger className={className} aria-label={label} data-tip={open ? undefined : label} onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      {/* Clicks inside the portal still bubble through React to the card: stopped here */}
      <PopoverContent align="end" side={side} className="pp pp--pick" onClick={(e) => e.stopPropagation()}
        initialFocus={(type) => (type === "touch" ? true : input.current)}>
        <form className="pp-search" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <span className="pp-search__icon" aria-hidden>{busy ? <span className="spinner spinner--sm" /> : Icons.search}</span>
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.projects.findOrCreate}
            aria-label={t.projects.findOrCreate}
            maxLength={60}
            disabled={busy}
          />
        </form>
        {projects.length === 0 && !q && <div className="pp__none">{t.projects.none}</div>}
        {shown.length > 0 && (
          <div className="pp__list">
            {shown.map((p) => {
              const on = filed.includes(p.id);
              const some = !on && partly.includes(p.id);
              const areas = areasIn?.[p.id] ?? [];
              return (
                <div key={p.id} className={`pp-row${on ? " is-on" : ""}${some ? " is-some" : ""}`}>
                  <button type="button" className="pp-row__toggle" aria-pressed={some ? "mixed" : on} onClick={() => pick(p.id, !on)}>
                    <span className="pp-row__folder" aria-hidden>{IconFolder}</span>
                    <span className="pp-row__name">{p.name}</span>
                    {areas.length > 0 && <span className="pp-proj__areas" aria-label={areas.map((k) => labels[k]).join(", ")}>{areas.slice(0, 3).map((k) => <i key={k}>{areaIcon(k, 11)}</i>)}{areas.length > 3 && <b>+{areas.length - 3}</b>}</span>}
                    <span className="pp-row__check" aria-hidden>{on ? Icons.check : some && <i className="pp-row__dash" />}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {q && !exact && (
          <>
            {shown.length > 0 && <div className="ws__divider" />}
            <button type="button" className="pp-row__toggle pp-new" onClick={create} disabled={busy}>
              <span className="ws__plus" aria-hidden>{Icons.plus}</span>
              <span className="pp-row__name">{t.projects.create(q)}</span>
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
