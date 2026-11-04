// The skills criterio.md can carry, as ids only: the menu lists them without loading their text (lib/md-skills.ts)
export const MD_SKILLS = ["fonts", "color-tokens", "grid", "gsap", "transitions", "images", "copy", "no-ui-slop", "a11y", "tailwind"] as const;
export type MdSkill = (typeof MD_SKILLS)[number];

/** Two ways to build the same area: switching one on switches the other off, so the file never gives an agent both */
export const MD_SKILL_EXCLUSIVE: Partial<Record<MdSkill, MdSkill>> = { gsap: "transitions", transitions: "gsap" };

/** Every skill is an agent skill too: this repo holds them as SKILL.md files under skills/<id>/ (the ten written by
 *  scripts/build-skills.ts, the connector's by hand), so Claude, Cursor or Codex install one like any other and read the
 *  project's numbers from its criterio.md */
/** Switched on until the team chooses: copy decides a landing, so a new file carries it */
export const DEFAULT_SKILLS: readonly MdSkill[] = ["copy"];
/** Stored when the team switched everything off: an empty list reads as never chosen */
export const NO_SKILLS = "none";
const FOLDED: Readonly<Record<string, MdSkill>> = { microcopy: "copy", "no-ai-slop": "copy" };

/** The skills a project's file carries, from its doc: a list saved before copy existed keeps what those skills became */
export function skillsOf(doc: Readonly<Record<string, string>> | null | undefined): MdSkill[] {
  const raw = doc?.skills;
  if (!raw) return [...DEFAULT_SKILLS];
  return [...new Set(raw.split(",").filter(Boolean).map((id) => FOLDED[id] ?? id))].filter((id): id is MdSkill => (MD_SKILLS as readonly string[]).includes(id));
}

export const SKILLS_REPO = "https://github.com/ericruizmolero/inspo";
export const skillInstall = (id: MdSkill) => `npx skills add ${SKILLS_REPO} --skill ${id}`;
export const skillPage = (id: MdSkill) => `${SKILLS_REPO}/tree/main/skills/${id}`;
