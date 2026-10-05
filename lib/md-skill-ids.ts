// The skills criterio.md can carry, as ids only: the menu lists them without loading their text (lib/md-skills.ts)
export const MD_SKILLS = ["fonts", "color-tokens", "grid", "gsap", "transitions", "icons", "logo-svg", "images", "microcopy", "no-ai-slop", "a11y", "tailwind"] as const;
export type MdSkill = (typeof MD_SKILLS)[number];
