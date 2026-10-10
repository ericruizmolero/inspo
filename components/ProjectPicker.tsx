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
import { Busy, Icon } from "@/components/criterio";

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
      {/* Clicks inside the portal still bubble through React to the card: stopped here. The panel is the
          system's ProjectPicker: a search over a heavy ink rule, then the projects with a folder, the name on one
          line and a checkbox; ticked ones turn ink and semibold */}
      <PopoverContent align="start" side={side} className="pp pp--pick cr-picker" onClick={(e) => e.stopPropagation()}
        initialFocus={(type) => (type === "touch" ? true : input.current)}>
        <form className="cr-picker-search" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {busy ? <Busy label={t.projects.findOrCreate} /> : <Icon name="search" size={16} />}
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); change(false); } }}
            placeholder={t.projects.findOrCreate}
            aria-label={t.projects.findOrCreate}
            maxLength={60}
            disabled={busy}
          />
        </form>
        <ul className="cr-picker-list cr-scroll-fade" role="group" aria-label={label}>
          {shown.map((p) => {
            const on = filed.includes(p.id);
            const some = !on && partly.includes(p.id);
            const areas = areasIn?.[p.id] ?? [];
            return (
              <li key={p.id}>
                <button type="button" className={`cr-picker-item${on ? " is-checked" : ""}`} aria-pressed={some ? "mixed" : on} onClick={() => pick(p.id, !on)}>
                  <Icon name="folder" size={16} />
                  <span className="cr-picker-name" title={p.name}>{p.name}</span>
                  {/* The quote mark: this reference already speaks in that project's criterio.md (the areas it backs) */}
                  {areas.length > 0 && (
                    <span className="cr-picker-note" title={areas.map((k) => labels[k]).join(", ")}>
                      <Icon name="quote" size={16} /><span className="cr-visually-hidden">{areas.map((k) => labels[k]).join(", ")}</span>
                    </span>
                  )}
                  <span className="cr-check-box" aria-hidden>
                    {on ? <Icon name="check" size={14} weight="bold" /> : some ? <i className="cr-picker-dash" /> : null}
                  </span>
                </button>
              </li>
            );
          })}
          {q && !exact && (
            <li>
              <button type="button" className="cr-picker-create" onClick={create} disabled={busy}>
                <Icon name="plus" size={16} /><span>{t.projects.create(q)}</span>
              </button>
            </li>
          )}
          {projects.length === 0 && !q && <li className="cr-picker-empty">{t.projects.none}</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
