"use client";
// Discover › Skills: every skill is an agent skill, as cards and not rows. Each one says who made it, what it does
// and the command that installs it, ready to copy; a click elsewhere on the card opens its page. First the thirteen
// of criterio.design (lib/md-skill-ids.ts), which also travel inside criterio.md as sections; then the ones from
// other authors, and the ones criterio.md carries too say so. The catalog they come from waits in the header.
import { useRef, useState } from "react";
import type { DirectorySite } from "@/lib/directory";
import { MD_SKILLS, skillInstall, skillPage } from "@/lib/md-skill-ids";
import { useT } from "./I18nProvider";

/** The GitHub owner of the repo the command installs from: the skill's author */
const ownerOf = (install: string) => install.match(/github\.com\/([^/\s]+)/)?.[1] ?? "";

interface Skill { owner: string; avatar: string; name: string; what: string; url: string; install: string; inMd?: boolean }

export default function DiscoverSkills({ sites }: { sites: DirectorySite[] }) {
  const { t } = useT();
  const catalog = sites.find((s) => !s.install);
  const group = t.directory.groups.skills;
  const own: Skill[] = MD_SKILLS.map((id) => ({ owner: "criterio.design", avatar: "/icon-512.png", ...t.system.skillsList[id], url: skillPage(id), install: skillInstall(id) }));
  const others: Skill[] = sites.filter((s) => s.install).map((s) => {
    const owner = ownerOf(s.install!);
    return { owner, avatar: `https://github.com/${owner}.png?size=64`, name: s.name, what: t.directory.items[s.url] ?? "", url: s.url, install: s.install!, inMd: !!s.skill };
  });
  return (
    <div className="disc-list">
      <section className="disc-list__group">
        <header className="disc-list__head disc-skills__head">
          <div><h2>{group.title}</h2><p>{group.hint}</p></div>
          {catalog && <a className="disc-skills__catalog" href={catalog.url} target="_blank" rel="noopener noreferrer">{t.discover.skills.catalog(catalog.name)} ↗</a>}
        </header>
        <ul className="disc-skills">
          {[...own, ...others].map((s) => <SkillCard key={s.url} skill={s} />)}
        </ul>
      </section>
    </div>
  );
}

function SkillCard({ skill }: { skill: Skill }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);
  const copy = async () => {
    try { await navigator.clipboard.writeText(skill.install); } catch { return; }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <li className="disc-skill">
      <div className="disc-skill__by">
        {/* A missing avatar leaves the initial underneath */}
        <span className="disc-skill__avatar" aria-hidden>{skill.owner.slice(0, 1).toUpperCase()}<img src={skill.avatar} alt="" loading="lazy" onError={(e) => e.currentTarget.remove()} /></span>
        <span>{skill.owner}</span>
        {skill.inMd && <i className="disc-row__skill" title={t.discover.inCriterioHint}>{t.discover.inCriterio}</i>}
      </div>
      {/* The name's link covers the whole card; the copy button sits above it */}
      <a className="disc-skill__name" href={skill.url} target="_blank" rel="noopener noreferrer">{skill.name}</a>
      <p className="disc-skill__what">{skill.what}</p>
      <button type="button" className={`disc-skill__install${copied ? " is-copied" : ""}`} onClick={() => void copy()} title={t.discover.skills.copy}>
        <code>{skill.install}</code>
        <span>{copied ? t.discover.skills.copied : t.discover.skills.copy}</span>
      </button>
    </li>
  );
}
