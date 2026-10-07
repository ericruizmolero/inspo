"use client";
import { MD_SKILLS } from "@/lib/md-skill-ids";
import { useT } from "./I18nProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/criterio";
import "./SkillsMenu.css";

/** The skills criterio.md can carry (lib/md-skills.ts): each one switched on adds a section to the file */
export default function SkillsMenu({ on, onToggle }: { on: string[]; onToggle: (id: string) => void }) {
  const { t } = useT();
  return (
    <Popover>
      <PopoverTrigger className={`btn btn--sm btn--quiet mdv-btn sys-skills__trigger${on.length ? " is-on" : ""}`} data-tip={t.system.skillsHint}>
        {t.system.skills}{on.length > 0 && <span className="sys-skills__n">{on.length}</span>}
      </PopoverTrigger>
      {/* The system's Menu: a paper window; each skill a row with the system's Switch. A click anywhere on the row
          flips it; the Switch is the control the keyboard and screen readers reach */}
      <PopoverContent align="end" className="cr-menu sys-skills">
        <p className="sys-skills__hint">{t.system.skillsHint}</p>
        {MD_SKILLS.map((id) => {
          const s = t.system.skillsList[id];
          const active = on.includes(id);
          return (
            <div key={id} className={`sys-skills__row${active ? " is-on" : ""}`} onClick={() => onToggle(id)}>
              <span className="sys-skills__text"><span className="sys-skills__name">{s?.name ?? id}</span><span className="sys-skills__what">{s?.what}</span></span>
              <span onClick={(e) => e.stopPropagation()}><Switch checked={active} label={s?.name ?? id} onChange={() => onToggle(id)} /></span>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
