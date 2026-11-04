// The skills criterio.md recommends at the end of each area: the best of other authors' for that area, free and public,
// picked on 2026-11-03 and checked on GitHub (repo, path and name) that day. Ours only show when switched on (they are
// already whole further down the file): ours installed from GitHub would point at Eric's personal account, so never.
// The playbook this belongs to is decided in docs/design-system/decisiones/ (the MD as a guided playbook).
import { OWN_SKILLS } from "../marketing-site/src/skills";
import type { MdSkill } from "@/lib/md-skill-ids";
import type { SystemArea } from "@/types/system";

type Text = { en: string; es: string };
type Locale = "en" | "es";

/** `only`: a skill written for one language, offered only in the criterio.md of that language */
export interface ExternalSkill { name: string; author: string; install: string; what: Text; only?: Locale }

const ext = (name: string, repo: string, what: Text, skill = name, only?: Locale): ExternalSkill =>
  ({ name, author: repo.split("/")[0], install: `npx skills add https://github.com/${repo} --skill ${skill}`, what, only });

const IMPECCABLE = (cmd: string, what: Text) => ext(`impeccable (${cmd})`, "pbakaus/impeccable", what, "impeccable");

/** "all": what crosses every area (slop, accessibility, the stack) */
export const AREA_SKILLS: Record<SystemArea | "all", { ours: MdSkill[]; external: ExternalSkill[] }> = {
  typography: { ours: ["fonts"], external: [
    ext("better-typography", "jakubkrehel/skills", { en: "Scale, leading, OpenType features, line breaks and punctuation", es: "Escala, interlineado, rasgos OpenType, cortes de línea y puntuación" }),
    IMPECCABLE("typeset", { en: "Fixes typefaces, hierarchy and sizes on existing code", es: "Arregla fuentes, jerarquía y tamaños sobre código que ya existe" }),
  ] },
  color: { ours: ["color-tokens"], external: [
    ext("better-colors", "jakubkrehel/skills", { en: "Palettes, semantic token names and contrast", es: "Paletas, nombres de tokens semánticos y contraste" }),
    IMPECCABLE("colorize", { en: "Brings colour to grey interfaces without going loud", es: "Da color a interfaces grises sin caer en lo chillón" }),
  ] },
  layout: { ours: ["grid"], external: [
    ext("better-layout", "jakubkrehel/skills", { en: "Grouping, alignment, reading order and responsive", es: "Agrupación, alineación, orden de lectura y responsive" }),
    ext("baseline-ui", "ibelick/ui-skills", { en: "A quick pass on spacing and hierarchy", es: "Una pasada rápida de espaciado y jerarquía" }),
  ] },
  motion: { ours: ["gsap", "transitions"], external: [
    ext("gsap-scrolltrigger", "greensock/gsap-skills", { en: "GSAP's official skills: the current API, ScrollTrigger and React", es: "Las skills oficiales de GSAP: la API actual, ScrollTrigger y React" }),
    ext("animate", "emilkowalski/skills", { en: "Whether to animate, which curve, how long, how it is interrupted", es: "Si animar, qué curva, cuánto dura y cómo se interrumpe" }),
    ext("vercel-react-view-transitions", "vercel-labs/agent-skills", { en: "Native view transitions in React and Next", es: "View Transitions nativas en React y Next" }),
  ] },
  iconography: { ours: [], external: [
    ext("better-icons", "better-auth/better-icons", { en: "Searches Iconify's libraries and returns the SVG", es: "Busca en las librerías de Iconify y devuelve el SVG" }),
  ] },
  logo: { ours: [], external: [] },
  imagery: { ours: ["images"], external: [
    ext("unsplash-asset-images", "MengTo/Skills", { en: "Picks real Unsplash photos with their URL", es: "Elige fotos reales de Unsplash con su URL" }),
  ] },
  voice: { ours: ["microcopy", "no-ai-slop"], external: [
    // Written for English copy: in Spanish its method holds, its formulas and punctuation do not
    ext("copywriting", "coreyhaines31/marketingskills", { en: "Landing, pricing and About copy", es: "Copy de landing, precios y About. Pensada para inglés: escribe en castellano, con comillas rectas y sin calcos" }),
    // The same job in each language: humanizer reads English tells (Wikipedia's list), humanamente Spanish ones
    // (checked 2026-11-04: MIT, one SKILL.md at the root named humanamente)
    ext("humanizer", "blader/humanizer", { en: "Strips the habits of generated text", es: "Quita los tics del texto generado" }, "humanizer", "en"),
    ext("humanamente", "vicentealvarezasencio/humanamente", { en: "Strips the habits of generated Spanish text", es: "Quita los tics del texto generado en castellano (gerundios, \"cabe destacar\", \"no solo… sino\") y usa la tipografía española, salvo las comillas: rectas, nunca «»" }, "humanamente", "es"),
  ] },
  all: { ours: ["no-ui-slop", "a11y", "tailwind"], external: [
    ext("frontend-design", "anthropics/skills", { en: "Anthropic's: distinctive interfaces, away from the generic", es: "La de Anthropic: interfaces con carácter, lejos de lo genérico" }),
    ext("web-design-guidelines", "vercel-labs/agent-skills", { en: "Vercel's review of an interface against web guidelines", es: "La revisión de Vercel de una interfaz contra sus pautas web" }),
    ext("design-taste-frontend", "Leonxlnx/taste-skill", { en: "Taste rules against interfaces that read as generated", es: "Reglas de gusto contra interfaces que parecen generadas" }),
    ext("better-accessibility", "jakubkrehel/skills", { en: "WCAG 2.2: keyboard, focus, contrast and motion", es: "WCAG 2.2: teclado, foco, contraste y movimiento" }),
  ] },
};

const HEADING: Text = { en: "Recommended skills", es: "Skills recomendadas" };
const ON: Text = { en: "on: its section is further down", es: "activada: su sección está más abajo" };

/** The lines an area ends with: ours switched on, then the others', each with what it brings and how to install it */
export function areaSkillLines(area: SystemArea | "all", on: readonly string[], locale: Locale): string[] {
  const set = AREA_SKILLS[area];
  // Ours are offered only as a pointer to their section: no install line, it would send people to a personal repo
  const own = set.ours.filter((id) => on.includes(id)).map((id) => {
    const s = OWN_SKILLS.find((x) => x.id === id);
    const name = s ? s.name[locale] : id;
    const what = s ? s.what[locale] : "";
    return `  - **${name}** (criterio.design)${what ? `: ${what}` : ""}. _${ON[locale]}_`;
  });
  const theirs = set.external.filter((s) => !s.only || s.only === locale).map((s) => `  - **${s.name}** (${s.author}): ${s.what[locale]}. \`${s.install}\``);
  const lines = [...own, ...theirs];
  return lines.length ? [`- **${HEADING[locale]}:**`, ...lines] : [];
}
