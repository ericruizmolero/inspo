"use client";
// "To the system" from a card: the eight areas of the project's system, ticked where this piece
// already counts. A web, a clip, a GIF or a sound goes to the node it belongs to.
import { useState, type ReactNode } from "react";
import { SYSTEM_AREAS, type SystemArea } from "@/types/system";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { areaIcon } from "./area-icons";

export default function AreaPicker({ backs, onToggle, onOpenChange, className, label, children }: {
  /** Areas this reference already backs in the current project */
  backs: SystemArea[];
  onToggle: (area: SystemArea, on: boolean) => void;
  onOpenChange?: (open: boolean) => void;
  className: string;
  label: string;
  children: ReactNode;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const labels = t.system.areas as Record<SystemArea, string>;
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); onOpenChange?.(o); }}>
      <PopoverTrigger className={className} aria-label={label} data-tip={open ? undefined : label} onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="end" className="pp" onClick={(e) => e.stopPropagation()}>
        <div className="ws__section">{t.system.fileUnder}</div>
        <div className="pp__list">
          {SYSTEM_AREAS.map((k) => {
            const on = backs.includes(k);
            return (
              <button key={k} type="button" className={`ws__item${on ? " is-active" : ""}`} aria-pressed={on} onClick={() => onToggle(k, !on)}>
                <span className="pp__icon">{areaIcon(k)}</span>
                <span className="ws__item-name">{labels[k]}</span>
                {on && <span className="ws__item-check">{Icons.check}</span>}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
