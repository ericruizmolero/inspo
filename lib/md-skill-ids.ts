// The skills criterio.md can carry, as ids only: the menu lists them without loading their text (lib/md-skills.ts)
export const MD_SKILLS = ["fonts", "color-tokens", "grid", "gsap", "transitions", "icons", "logo-svg", "images", "iso-figure", "microcopy", "no-ai-slop", "a11y", "tailwind"] as const;
export type MdSkill = (typeof MD_SKILLS)[number];

/** Every skill is an agent skill too: the public repo that holds them as SKILL.md files (built by scripts/build-skills.ts),
 *  so Claude, Cursor or Codex install one like any other and read the project's numbers from its criterio.md */
export const SKILLS_REPO = "https://github.com/ericruizmolero/criterio-skills";
export const skillInstall = (id: MdSkill) => `npx skills add ${SKILLS_REPO} --skill ${id}`;
export const skillPage = (id: MdSkill) => `${SKILLS_REPO}/tree/main/skills/${id}`;
