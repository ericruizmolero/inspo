"use client";
// Discover: the templates (whole systems to start a project from) and the skills for agents, a list of their own
// with its topics in a menu. The two share one head, in the column of the content. The places to look for references
// live on the marketing site (MARKETING_URL/resources/).
import { useState } from "react";
import { SKILLS, SKILL_TOPICS, isNewSkill, type SkillTopic } from "@/lib/agent-skills";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";
import DiscoverSkills from "./DiscoverSkills";
import { Icon, MenuItem, SegmentedControl } from "@/components/criterio";
import "./Discover.css";
import { afterPaint } from "@/components/ui/liquid";

/** Everything, what came in lately (the last 30 days), or what we feature */
type Shelf = "all" | "new" | "featured";

export type Section = "templates" | "skills";

/** The skills that came in lately: the first batch (criterio.design's own) carries no date */
const FRESH_SKILLS = SKILLS.filter((s) => s.install && isNewSkill(s)).length;

/** Discover: the templates, whole systems to start a project from, and the skills for agents */
export default function Discover({ section, onSection, templates }: {
  section: Section;
  onSection: (s: Section) => void;
  /** The templates' own view, rendered when that section is chosen, under the page's head */
  templates: (head: React.ReactNode) => React.ReactNode;
}) {
  const { t } = useT();
  /** Words typed over the skills: they narrow what the shelf and the topic leave */
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<SkillTopic | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [skillShelf, setSkillShelf] = useState<Shelf>("all");
  // One topic, or all of them: the menu on the right of the row. The trigger is a secondary Button; the popup the system's Menu, a check on the one chosen
  const picker = <K extends string>(p: { open: boolean; onOpen: (o: boolean) => void; value: K | null; onPick: (k: K | null) => void; label: string; options: { key: K; title: string }[] }) => (
    <Popover open={p.open} onOpenChange={p.onOpen}>
      <PopoverTrigger className={`cr-btn cr-btn-secondary cr-btn-s disc__group${p.value ? " is-pressed" : ""}`}>
        {p.options.find((o) => o.key === p.value)?.title ?? p.label} <Icon name="chevron-down" size={16} />
      </PopoverTrigger>
      <PopoverContent align="end" className="cr-menu disc__menu">
        <MenuItem checked={p.value === null} onClick={() => { p.onPick(null); p.onOpen(false); }}>{t.discover.all}</MenuItem>
        {p.options.map((o) => (
          <MenuItem key={o.key} checked={p.value === o.key} onClick={() => { p.onPick(o.key); p.onOpen(false); }}>{o.title}</MenuItem>
        ))}
      </PopoverContent>
    </Popover>
  );
  // The head of the page, the same in both sections and in their column, as a project's page has it: the name
  // (the page's h1) on top with what the open section holds, and below one row with the sections on the left and, on
  // the right, what the open one is looked through with. It scrolls away with the page, so its tabs are the paper
  // SegmentedControl, as a project's are, in the toolbar size (s, 34) so the row does not outweigh the titles
  const SECTIONS = ["templates", "skills"] as const;
  const head = (lead: string, side?: React.ReactNode) => (
    <>
      <header className="disc-head">
        <h1 className="disc-title">{t.sidebar.discover}</h1>
        <p className="t-body disc-lead">{lead}</p>
      </header>
      <div className="disc-bar">
        <SegmentedControl tone="paper" size="s" label={t.discover.sections.label} active={SECTIONS.indexOf(section)} onChange={(i) => afterPaint(() => onSection(SECTIONS[i]))}
          items={SECTIONS.map((k) => ({ label: t.discover.sections[k] }))} />
        {side && <div className="disc-bar__side">{side}</div>}
      </div>
    </>
  );
  if (section === "templates") return templates(head(t.templates.lead));
  // What to look at first: everything, what just came in, what we feature
  const shelves = (value: Shelf, onPick: (s: Shelf) => void, fresh: number) => {
    const keys = (["all", "new", "featured"] as const).filter((k) => k !== "new" || fresh > 0);
    return (
      <SegmentedControl tone="paper" size="s" className="disc__shelves" label={t.discover.shelves} active={keys.indexOf(value)} onChange={(i) => onPick(keys[i])}
        items={keys.map((k) => ({ label: t.discover.shelf[k], count: k === "new" ? fresh : undefined }))} />
    );
  };
  // A few words over the skills: the field at the toolbar size, the search icon inside. Escape empties it
  const search = (placeholder: string) => (
    <label className="disc-search">
      <Icon name="search" size={14} />
      <input className="cr-input cr-input-s" type="search" value={query} aria-label={placeholder} placeholder={placeholder} autoComplete="off"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && query) { e.preventDefault(); e.stopPropagation(); setQuery(""); } }} />
    </label>
  );
  return <DiscoverSkills sites={SKILLS} topic={topic} shelf={skillShelf} query={query} head={head(t.discover.skills.lead, (
    <>
      {search(t.discover.skills.search)}
      {shelves(skillShelf, setSkillShelf, FRESH_SKILLS)}
      {picker({ open: topicsOpen, onOpen: setTopicsOpen, value: topic, onPick: setTopic, label: t.discover.skills.topicsLabel,
        options: SKILL_TOPICS.map((k) => ({ key: k, title: t.discover.skills.topics[k] })) })}
    </>
  ))} />;
}
