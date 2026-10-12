"use client";
// Discover › Skills: every skill is an agent skill, as cards and not rows. Each one says who made it, what it does
// and the command that installs it, ready to copy; a click elsewhere on the card opens its page. They are sorted by
// what they are about (SKILL_TOPICS), and under each topic criterio.design's own come first (they also travel inside
// criterio.md as sections), then the ones from other authors; the ones criterio.md carries too say so. The list is
// the marketing site's (lib/agent-skills.ts), so criterio.design/skills/ and this page show the same. The page's head
// chooses what is shown: everything, what just came in or the featured ones, and one topic or all of them.
import { useRef, useState } from "react";
import Clouds from "@/components/Clouds";
import { FEATURED_SKILLS, SKILLS, SKILL_TOPICS, isNewSkill, type Skill, type SkillTopic } from "@/lib/agent-skills";
import { plain } from "@/lib/resources";
import { useT } from "./I18nProvider";
import { Avatar, Card, Chip, toneFor } from "@/components/criterio";

const OWN = "criterio.design";
const avatarOf = (s: Skill) => (s.author === OWN ? "/icon-512.png" : `https://github.com/${s.author}.png?size=64`);

export default function DiscoverSkills({ topic, shelf, query, head }: { topic: SkillTopic | null; shelf: "all" | "new" | "featured"; query: string; head: React.ReactNode }) {
  const { t, locale } = useT();
  // Every word typed has to be somewhere on the card: its name, what it does, its author or its install command
  const words = plain(query).split(/\s+/).filter(Boolean);
  const hit = (s: Skill) => !words.length || words.every((w) => plain([s.name[locale], s.text[locale], s.author, s.install].join(" ")).includes(w));
  const all = SKILLS.filter((s) => (shelf === "all" || (shelf === "new" ? isNewSkill(s) : FEATURED_SKILLS.includes(s.url))) && hit(s));
  const groups = SKILL_TOPICS.filter((k) => !topic || k.key === topic).map((k) => ({ ...k, skills: all.filter((s) => s.topic === k.key) })).filter((g) => g.skills.length);
  return (
    <>
    <div className="disc-list">
      {head}
      {groups.map((g) => (
        <section key={g.key} className="disc-list__group">
          <header className="disc-list__head"><h2 className="t-title-m">{g.title[locale]}</h2></header>
          <ul className="disc-skills">
            {g.skills.map((s) => <SkillCard key={s.url} skill={s} />)}
          </ul>
        </section>
      ))}
      {!groups.length && <p className="disc-list__none">{t.discover.skills.none}</p>}
    </div>
    <Clouds />
    </>
  );
}

function SkillCard({ skill }: { skill: Skill }) {
  const { t, locale } = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);
  const copy = async () => {
    try { await navigator.clipboard.writeText(skill.install); } catch { return; }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <Card as="li" className="disc-skill">
      <div className="disc-skill__by">
        {/* A missing avatar falls back to the initial (Avatar does it) */}
        <Avatar initials={skill.author.slice(0, 1).toUpperCase()} name={skill.author} tone={toneFor(skill.author)} src={avatarOf(skill)} size={20} />
        <span>{skill.author}</span>
        {skill.inCriterio && <span className="disc-skill__inmd" data-tip={t.discover.inCriterioHint}><Chip tone="moss">{t.discover.inCriterio}</Chip></span>}
      </div>
      {/* The name's link covers the whole card; the copy button sits above it */}
      <a className="t-title-s disc-skill__name" href={skill.url} target="_blank" rel="noopener noreferrer">{skill.name[locale]}</a>
      <p className="disc-skill__what">{skill.text[locale]}</p>
      {/* Not a paper Button: a sunken well with the command and a grey "Copy" key, no paper (nine paper blocks per screen read heavy; Eric, 07-10) */}
      <button type="button" className={`disc-skill__install${copied ? " is-copied" : ""}`} onClick={() => void copy()} aria-label={`${t.discover.skills.copy}: ${skill.install}`}>
        <code>{skill.install}</code>
        <span>{copied ? t.discover.skills.copied : t.discover.skills.copy}</span>
      </button>
    </Card>
  );
}
