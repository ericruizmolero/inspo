// The skills for agents that Discover lists (components/DiscoverSkills.tsx). Several can come from the same catalog.
// What each one does lives in lib/i18n/<locale>/ui.ts (discover.skills.items), keyed by its URL.
// The places to look for references moved to the marketing site (marketing-site/src/resources.ts).
import type { MdSkill } from "@/lib/md-skill-ids";

/** What a skill is about: Discover lists the skills under these, in this order (the system's areas first, then
 *  building an interface and looking it over). Their titles are in lib/i18n/<locale>/ui.ts (discover.skills.topics). */
export const SKILL_TOPICS = ["foundations", "motion", "assets", "voice", "interface", "review"] as const;
export type SkillTopic = (typeof SKILL_TOPICS)[number];

/** Lowercase, without accents, for searching: "diseño" finds "Diseno" and the other way round */
export const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export interface AgentSkill {
  name: string;
  url: string;
  /** The day it joined the list (yyyy-mm-dd), for the ones that came after the first batch: Discover shows it as new */
  added?: string;
  /** A skill criterio.md can carry too (an id of MD_SKILLS in lib/md-skills.ts): Discover says so on its row */
  skill?: string;
  /** A skill for agents: the command that installs it (its GitHub owner is its author) */
  install?: string;
  /** A skill for agents: what it is about */
  topic?: SkillTopic;
}

/** Discover › Skills: one entry per skill, with the command that installs it. The one without a command is the catalog
 *  they come from. Their text is discover.skills.items */
export const SKILLS: AgentSkill[] = [
  { name: "frontend-design", topic: "interface", url: "https://ui-skills.com/skills/anthropics/frontend-design", added: "2026-10-05", install: "npx skills add https://github.com/anthropics/skills --skill frontend-design" },
  { name: "emil-design-eng", topic: "interface", url: "https://ui-skills.com/skills/emilkowalski/emil-design-eng", added: "2026-10-05", install: "npx skills add https://github.com/emilkowalski/skills --skill emil-design-eng" },
  { name: "apple-design", topic: "motion", url: "https://ui-skills.com/skills/emilkowalski/apple-design", added: "2026-10-05", install: "npx skills add https://github.com/emilkowalski/skills --skill apple-design" },
  { name: "interaction-design", topic: "motion", url: "https://ui-skills.com/skills/wshobson/interaction-design", added: "2026-10-05", install: "npx skills add https://github.com/wshobson/agents --skill interaction-design" },
  { name: "beautiful-shadows", topic: "foundations", url: "https://ui-skills.com/skills/mengto/beautiful-shadows", added: "2026-10-05", install: "npx skills add https://github.com/MengTo/Skills --skill beautiful-shadows" },
  { name: "adapt", topic: "foundations", url: "https://ui-skills.com/skills/pbakaus/adapt", added: "2026-10-05", install: "npx skills add https://github.com/pbakaus/impeccable --skill adapt" },
  { name: "shadcn", topic: "interface", url: "https://ui-skills.com/skills/shadcn-ui/shadcn", added: "2026-10-05", install: "npx skills add https://github.com/shadcn-ui/ui --skill shadcn" },
  { name: "accessibility", topic: "review", url: "https://ui-skills.com/skills/addyosmani/accessibility", added: "2026-10-05", install: "npx skills add https://github.com/addyosmani/web-quality-skills --skill accessibility", skill: "a11y" },
  { name: "design-review", topic: "review", url: "https://ui-skills.com/skills/superfuture/design-review", added: "2026-10-05", install: "npx skills add https://github.com/Superfuture/design-review --skill design-review" },
  { name: "better-interface", topic: "review", url: "https://ui-skills.com/skills/jakubkrehel/better-interface", added: "2026-10-05", install: "npx skills add https://github.com/jakubkrehel/skills --skill better-interface" },
  { name: "iso-figure", topic: "assets", url: "https://github.com/MrBongoC/ai-iso-skill", added: "2026-10-05", skill: "iso-figure", install: "npx skills add https://github.com/MrBongoC/ai-iso-skill --skill iso-figure" },
  { name: "gsap-skills", topic: "motion", url: "https://github.com/greensock/gsap-skills", added: "2026-10-05", skill: "gsap", install: "npx skills add https://github.com/greensock/gsap-skills" },
  { name: "no-ai-slop", topic: "voice", url: "https://github.com/petergyang/no-ai-slop", added: "2026-10-05", skill: "no-ai-slop", install: "npx skills add https://github.com/petergyang/no-ai-slop --skill no-ai-slop" },
];

/** The skills Discover features: a handful picked by hand, criterio.design's by id and the others by URL */
export const FEATURED_SKILLS: readonly string[] = [
  "gsap", "no-ai-slop", "a11y",
  "https://ui-skills.com/skills/anthropics/frontend-design",
  "https://ui-skills.com/skills/emilkowalski/emil-design-eng",
  "https://ui-skills.com/skills/emilkowalski/apple-design",
];

/** The same for criterio.design's own skills: a new one does not compile until it has its topic */
export const MD_SKILL_TOPIC: Record<MdSkill, SkillTopic> = {
  fonts: "foundations", "color-tokens": "foundations", grid: "foundations", tailwind: "foundations",
  gsap: "motion", transitions: "motion",
  icons: "assets", "logo-svg": "assets", images: "assets", "iso-figure": "assets",
  microcopy: "voice", "no-ai-slop": "voice",
  a11y: "review",
};

/** Joined the list in the last 30 days */
export const NEW_DAYS = 30;
export function isNewSkill(site: AgentSkill, now = Date.now()): boolean {
  return !!site.added && now - Date.parse(site.added) < NEW_DAYS * 86400000;
}
