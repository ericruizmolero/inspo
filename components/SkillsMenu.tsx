"use client";
import { MD_SKILLS } from "@/lib/md-skill-ids";
import { useT } from "./I18nProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import "./SkillsMenu.css";

/** The skills criterio.md can carry (lib/md-skills.ts): each one switched on adds a section to the file */
export default function SkillsMenu({ on, onToggle }: { on: string[]; onToggle: (id: string) => void }) {
  const { t } = useT();
  return (
    <Popover>
      <PopoverTrigger className={`mdv-btn sys-skills__trigger${on.length ? " is-on" : ""}`} title={t.system.skillsHint}>
        {t.system.skills}{on.length > 0 && <span className="sys-skills__n">{on.length}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="pp sys-skills">
        <p className="sys-skills__hint">{t.system.skillsHint}</p>
        {MD_SKILLS.map((id) => {
          const s = t.system.skillsList[id];
          const active = on.includes(id);
          return (
            <button key={id} type="button" role="switch" aria-checked={active} className={`sys-skills__row${active ? " is-on" : ""}`} onClick={() => onToggle(id)}>
              <span className="sys-skills__text"><span className="sys-skills__name">{s?.name ?? id}</span><span className="sys-skills__what">{s?.what}</span></span>
              <span className="sys-skills__switch" aria-hidden><span /></span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
