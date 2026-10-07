"use client";
// "To the system" from a card: the eight areas of the project's system, ticked where this piece
// already counts. A web, a clip, a GIF or a sound goes to the node it belongs to.
import { useState, type ReactNode } from "react";
import { SYSTEM_AREAS, type SystemArea } from "@/types/system";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";
import { MenuItem, MenuLabel } from "@/components/criterio";
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
      {/* The system's Menu: a paper window, the eight areas as checkable rows */}
      <PopoverContent align="end" className="cr-menu area-picker" onClick={(e) => e.stopPropagation()}>
        <MenuLabel>{t.system.fileUnder}</MenuLabel>
        {SYSTEM_AREAS.map((k) => {
          const on = backs.includes(k);
          return (
            <MenuItem key={k} role="menuitemcheckbox" aria-checked={on} icon={areaIcon(k)} checked={on} onClick={() => onToggle(k, !on)}>
              {labels[k]}
            </MenuItem>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
