"use client";
// Discover › Skills: the skills for agents as cards, not rows. Each one says who made it, what it does and the command
// that installs it, ready to copy; a click elsewhere on the card opens its page. The ones criterio.md carries too
// say so. The catalog they come from waits in the header.
import { useRef, useState } from "react";
import type { DirectorySite } from "@/lib/directory";
import { useT } from "./I18nProvider";

/** The GitHub owner of the repo the command installs from: the skill's author */
const ownerOf = (install: string) => install.match(/github\.com\/([^/\s]+)/)?.[1] ?? "";

export default function DiscoverSkills({ sites }: { sites: DirectorySite[] }) {
  const { t } = useT();
  const skills = sites.filter((s) => s.install);
  const catalog = sites.find((s) => !s.install);
  const group = t.directory.groups.skills;
  return (
    <div className="disc-list">
      <section className="disc-list__group">
        <header className="disc-list__head disc-skills__head">
          <div><h2>{group.title}</h2><p>{group.hint}</p></div>
          {catalog && <a className="disc-skills__catalog" href={catalog.url} target="_blank" rel="noopener noreferrer">{t.discover.skills.catalog(catalog.name)} ↗</a>}
        </header>
        <ul className="disc-skills">
          {skills.map((s) => <SkillCard key={s.url} site={s} />)}
        </ul>
      </section>
    </div>
  );
}

function SkillCard({ site }: { site: DirectorySite }) {
  const { t } = useT();
  const owner = ownerOf(site.install!);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);
  const copy = async () => {
    try { await navigator.clipboard.writeText(site.install!); } catch { return; }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <li className="disc-skill">
      <div className="disc-skill__by">
        {/* A missing avatar leaves the initial underneath */}
        <span className="disc-skill__avatar" aria-hidden>{owner.slice(0, 1).toUpperCase()}<img src={`https://github.com/${owner}.png?size=64`} alt="" loading="lazy" onError={(e) => e.currentTarget.remove()} /></span>
        <span>{owner}</span>
        {site.skill && <i className="disc-row__skill" title={t.discover.inCriterioHint}>{t.discover.inCriterio}</i>}
      </div>
      {/* The name's link covers the whole card; the copy button sits above it */}
      <a className="disc-skill__name" href={site.url} target="_blank" rel="noopener noreferrer">{site.name}</a>
      <p className="disc-skill__what">{t.directory.items[site.url] ?? ""}</p>
      <button type="button" className={`disc-skill__install${copied ? " is-copied" : ""}`} onClick={() => void copy()} title={t.discover.skills.copy}>
        <code>{site.install}</code>
        <span>{copied ? t.discover.skills.copied : t.discover.skills.copy}</span>
      </button>
    </li>
  );
}
