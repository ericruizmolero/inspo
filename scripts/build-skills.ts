// Writes the fourteen skills of criterio.md as agent skills into this repo's skills/: one SKILL.md per skill, in the
// layout `npx skills add` reads (skills/<id>/SKILL.md), plus skills/README.md. The craft is the same text the file's sections carry
// (lib/md-skills.ts, lib/md-skills-more.ts); what changes is the project half: an installed skill cannot know the
// project, so it tells the agent to read the area in the project's criterio.md first. English only: that is the
// language agents read skills in. No model call. The connector's skills (written by hand, with their scripts) live
// in the same folder and only get their README row here.
//   npm run skills:build
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { MD_SKILLS, skillCraft, type MdSkill } from "../lib/md-skills";
import { SKILLS_REPO, skillInstall } from "../lib/md-skill-ids";
import { ui } from "../lib/i18n/en/ui";

const names = ui.system.skillsList as Record<MdSkill, { name: string; what: string }>;

/** The skills that work the MCP connector, kept as folders in skills/ (SKILL.md, scripts, references) */
const CONNECTOR_SKILLS = [
  { id: "bring-brand", name: "Bring in a brand", what: "Reads a site or a repo and fills the project's presentation through the criterio MCP" },
];

/** What criterio.md is, for an agent that has never seen one */
const ABOUT = "`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.";

function skillFile(id: MdSkill): string {
  const c = skillCraft(id, "en");
  const { name, what } = names[id];
  const section = c.heading;
  const lead = c.lead.replace(/ above\b/, "");
  const L: string[] = [
    "---",
    `name: ${id}`,
    `description: ${what}. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.`,
    "metadata:",
    "  source: criterio.design",
    `  area: ${c.area ?? "all"}`,
    "---",
    "",
    `# ${name}`,
    "",
    lead,
    "",
    "## Read the project first",
    "",
    ABOUT,
    "",
    "1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.",
    c.area
      ? `2. Read its **${c.areaName}** area: the decision, the references it kept and its **Never** list. The area rules: where it and this skill disagree, the area wins.`
      : "2. Read every area: this skill crosses them all, and each one's decision and **Never** list bound what you write.",
    `3. If the file has a section titled **${section}**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.`,
    c.area
      ? `4. If the ${c.areaName} area is still open, or there is no file, use the defaults below and say so in what you deliver.`
      : "4. If an area is still open, or there is no file, use the defaults below and say so in what you deliver.",
    "",
  ];
  if (c.defaults?.length) L.push("## Defaults, while the area names no numbers", "", ...c.defaults.map((d) => `- ${d}`), "");
  L.push("## The craft", "");
  if (c.setup) L.push(c.setup, "");
  L.push(...c.rules.map((r) => `- ${r}`), "");
  return L.join("\n");
}

function readme(): string {
  const L: string[] = [
    "# Criterio skills",
    "",
    `The skills of criterio.md as agent skills, for Claude Code, Cursor, Codex and any agent that reads \`SKILL.md\`. ${ABOUT}`,
    "",
    "Each skill builds one part of that system with a given tool: it reads the project's `criterio.md` first and then applies the craft with the project's numbers. Switched on in criterio.design, the same skill travels inside the file as a section, with nothing to install.",
    "",
    "## Install",
    "",
    "```sh",
    `npx skills add ${SKILLS_REPO} --skill <name>`,
    "```",
    "",
    "## Skills",
    "",
    "| Skill | What it builds | Install |",
    "| --- | --- | --- |",
  ];
  for (const id of MD_SKILLS) L.push(`| [${names[id].name}](${id}/SKILL.md) | ${names[id].what} | \`${skillInstall(id)}\` |`);
  for (const s of CONNECTOR_SKILLS) L.push(`| [${s.name}](${s.id}/SKILL.md) | ${s.what} | \`npx skills add ${SKILLS_REPO} --skill ${s.id}\` |`);
  L.push("", "The fourteen are written by `scripts/build-skills.ts` from the same text criterio.md carries (`lib/md-skills.ts`): edit it there and run `npm run skills:build`. The connector's are written by hand in their folder.", "");
  return L.join("\n");
}

const dir = resolve("skills");
for (const id of MD_SKILLS) {
  mkdirSync(join(dir, id), { recursive: true });
  writeFileSync(join(dir, id, "SKILL.md"), skillFile(id));
}
for (const s of CONNECTOR_SKILLS) if (!existsSync(join(dir, s.id, "SKILL.md"))) throw new Error(`skills/${s.id}/SKILL.md is missing`);
writeFileSync(join(dir, "README.md"), readme());
console.log(`${MD_SKILLS.length} skills written to ${dir}; ${CONNECTOR_SKILLS.length} of the connector listed`);
