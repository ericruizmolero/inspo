// The skills for agents as Discover lists them (components/DiscoverSkills.tsx). One source for the app and the
// marketing site: marketing-site/src/skills.ts holds the list, its topics and its text in both languages, criterio.design's
// own first. Here, only what Discover adds on top: what we feature and what came in lately.
import { SKILLS, SKILL_TOPICS, isNew, type Skill, type SkillTopic } from "../marketing-site/src/skills";
import { skillPage } from "@/lib/md-skill-ids";

export { SKILLS, SKILL_TOPICS, type Skill, type SkillTopic };

/** Joined the list in the last 30 days (NEW_DAYS in the marketing site's file). criterio.design's own carry no date */
export const isNewSkill = (s: Skill, now = Date.now()) => isNew(s, now);

/** The skills Discover features: a handful picked by hand, by the page each one opens */
export const FEATURED_SKILLS: readonly string[] = [
  skillPage("gsap"), skillPage("no-ai-slop"), skillPage("a11y"),
  "https://ui-skills.com/skills/anthropics/frontend-design",
  "https://ui-skills.com/skills/emilkowalski/emil-design-eng",
  "https://ui-skills.com/skills/emilkowalski/apple-design",
];
