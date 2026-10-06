"use client";
// Discover › Skills: every skill is an agent skill, as cards and not rows. Each one says who made it, what it does
// and the command that installs it, ready to copy; a click elsewhere on the card opens its page. They are sorted by
// what they are about (SKILL_TOPICS in lib/directory.ts), and under each topic criterio.design's own come first
// (lib/md-skill-ids.ts, which also travel inside criterio.md as sections), then the ones from other authors; the
// ones criterio.md carries too say so. The page's head chooses what is shown: everything, what just came in or the
// featured ones (FEATURED_SKILLS), and one topic or all of them.
import { useRef, useState } from "react";
import { FEATURED_SKILLS, MD_SKILL_TOPIC, SKILL_TOPICS, isNewSite, type DirectorySite, type SkillTopic } from "@/lib/directory";
import { MD_SKILLS, skillInstall, skillPage } from "@/lib/md-skill-ids";
import { useT } from "./I18nProvider";

/** The GitHub owner of the repo the command installs from: the skill's author */
const ownerOf = (install: string) => install.match(/github\.com\/([^/\s]+)/)?.[1] ?? "";

interface Skill { owner: string; avatar: string; name: string; what: string; url: string; install: string; topic: SkillTopic; inMd?: boolean; fresh: boolean; featured: boolean }

export default function DiscoverSkills({ sites, topic, shelf, head }: { sites: DirectorySite[]; topic: SkillTopic | null; shelf: "all" | "new" | "featured"; head: React.ReactNode }) {
  const { t } = useT();
  const own: Skill[] = MD_SKILLS.map((id) => ({ owner: "criterio.design", avatar: "/icon-512.png", ...t.system.skillsList[id], url: skillPage(id), install: skillInstall(id), topic: MD_SKILL_TOPIC[id], fresh: false, featured: FEATURED_SKILLS.includes(id) }));
  const others: Skill[] = sites.filter((s) => s.install).map((s) => {
    const owner = ownerOf(s.install!);
    return { owner, avatar: `https://github.com/${owner}.png?size=64`, name: s.name, what: t.directory.items[s.url] ?? "", url: s.url, install: s.install!, topic: s.topic ?? "interface", inMd: !!s.skill, fresh: isNewSite(s), featured: FEATURED_SKILLS.includes(s.url) };
  });
  const all = [...own, ...others].filter((s) => shelf === "all" || (shelf === "new" ? s.fresh : s.featured));
  const groups = SKILL_TOPICS.filter((k) => !topic || k === topic).map((k) => ({ topic: k, skills: all.filter((s) => s.topic === k) })).filter((g) => g.skills.length);
  return (
    <div className="disc-list">
      {head}
      {groups.map((g) => (
        <section key={g.topic} className="disc-list__group">
          <header className="disc-list__head"><h2>{t.discover.skills.topics[g.topic]}</h2></header>
          <ul className="disc-skills">
            {g.skills.map((s) => <SkillCard key={s.url} skill={s} />)}
          </ul>
        </section>
      ))}
      {!groups.length && <p className="disc-list__none">{t.discover.skills.none}</p>}
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
