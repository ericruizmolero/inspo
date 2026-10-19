// The skills criterio.md can carry, as ids only: the menu lists them without loading their text (lib/md-skills.ts)
export const MD_SKILLS = ["fonts", "color-tokens", "grid", "gsap", "transitions", "icons", "logo-svg", "images", "iso-figure", "microcopy", "no-ai-slop", "no-ui-slop", "a11y", "tailwind"] as const;
export type MdSkill = (typeof MD_SKILLS)[number];

/** Two ways to build the same area: switching one on switches the other off, so the file never gives an agent both */
export const MD_SKILL_EXCLUSIVE: Partial<Record<MdSkill, MdSkill>> = { gsap: "transitions", transitions: "gsap" };

/** Every skill is an agent skill too: this repo holds them as SKILL.md files under skills/<id>/ (the fourteen written by
 *  scripts/build-skills.ts, the connector's by hand), so Claude, Cursor or Codex install one like any other and read the
 *  project's numbers from its criterio.md */
export const SKILLS_REPO = "https://github.com/ericruizmolero/inspo";
export const skillInstall = (id: MdSkill) => `npx skills add ${SKILLS_REPO} --skill ${id}`;
export const skillPage = (id: MdSkill) => `${SKILLS_REPO}/tree/main/skills/${id}`;
