// The skills for agents on /skills/, grouped by topic. They left the app's Discover on 2026-10-11.
// criterio.design's own (OWN_SKILLS) are a copy of the app's MD_SKILLS (lib/md-skill-ids.ts) with their names and
// text from system.skillsList (lib/i18n/<locale>/ui.ts): tests/marketing-site-copy.test.ts fails when they drift.
// CONNECTOR_SKILLS are criterio.design's too, but they work the connector instead of a section of criterio.md: they
// live as folders in the app's skills/, next to the thirteen that build-skills writes there.
import type { Locale } from "./i18n";

type Text = Record<Locale, string>;

/** What a skill is about, in the page's order: the system's areas first, then building an interface and looking it over */
export const SKILL_TOPICS = [
  { key: "foundations", title: { en: "Typography, color and layout", es: "Tipografía, color y layout" } },
  { key: "motion", title: { en: "Motion", es: "Movimiento" } },
  { key: "assets", title: { en: "Icons, logo and imagery", es: "Iconos, logo e imagen" } },
  { key: "voice", title: { en: "Voice", es: "Voz" } },
  { key: "interface", title: { en: "Interface and components", es: "Interfaz y componentes" } },
  { key: "review", title: { en: "Review and accessibility", es: "Revisión y accesibilidad" } },
  { key: "connect", title: { en: "The criterio connector", es: "El conector de Criterio" } },
] as const satisfies readonly { key: string; title: Text }[];
export type SkillTopic = (typeof SKILL_TOPICS)[number]["key"];

export interface Skill {
  /** criterio.design's own have a name in each language; the others keep their id */
  name: Text;
  url: string;
  install: string;
  topic: SkillTopic;
  text: Text;
  /** The GitHub owner of the repo it installs from, or criterio.design for its own */
  author: string;
  /** The day it joined the list (yyyy-mm-dd): the page marks it new for NEW_DAYS */
  added?: string;
  /** Another author's skill that criterio.md can carry too: the id of that skill in the app's MD_SKILLS */
  inCriterio?: string;
}

/** The repo that holds criterio.design's skills as SKILL.md files under skills/ (SKILLS_REPO in lib/md-skill-ids.ts) */
export const SKILLS_REPO = "https://github.com/ericruizmolero/inspo";

/** criterio.design's own: the skills criterio.md can carry, in the app's order, with the app's names and text */
export const OWN_SKILLS = [
  { id: "fonts", topic: "foundations", name: { en: "Web fonts", es: "Fuentes web" }, what: { en: "Typography: loading the families decided, and a fluid scale", es: "Tipografía: cargar las familias decididas y una escala fluida" } },
  { id: "color-tokens", topic: "foundations", name: { en: "Colour tokens", es: "Tokens de color" }, what: { en: "Colour: the palette as variables, light and dark, and contrast", es: "Color: la paleta como variables, tema claro y oscuro y contraste" } },
  { id: "grid", topic: "foundations", name: { en: "CSS grid", es: "Retícula CSS" }, what: { en: "Layout: grid, container queries, and spacing and radii as tokens", es: "Layout: grid, container queries y espacios y radios como tokens" } },
  { id: "gsap", topic: "motion", name: { en: "GSAP", es: "GSAP" }, what: { en: "Smooth micro-animations, with the curves and durations of the Motion area", es: "Microanimaciones suaves, con las curvas y duraciones del área de Movimiento" } },
  { id: "transitions", topic: "motion", name: { en: "Native transitions", es: "Transiciones nativas" }, what: { en: "Motion without a library: CSS, view transitions and scroll", es: "Movimiento sin librería: CSS, view transitions y scroll" } },
  { id: "icons", topic: "assets", name: { en: "Icon set", es: "Set de iconos" }, what: { en: "Iconography: one library, one stroke, and how to draw the missing ones", es: "Iconografía: una librería, un trazo y cómo dibujar los que falten" } },
  { id: "logo-svg", topic: "assets", name: { en: "Logo as SVG", es: "Logo en SVG" }, what: { en: "Logo: versions, clear space, favicon and share image", es: "Logo: versiones, área de respeto, favicon e imagen para compartir" } },
  { id: "images", topic: "assets", name: { en: "Responsive images", es: "Imágenes responsive" }, what: { en: "Imagery: formats, sizes, crops and one treatment", es: "Imagen: formatos, tamaños, encuadres y un único tratamiento" } },
  { id: "iso-figure", topic: "assets", name: { en: "Isometric figure", es: "Figura isométrica" }, what: { en: "Imagery: an object as an interactive isometric line drawing in SVG", es: "Imagen: un objeto como dibujo isométrico interactivo en SVG" } },
  { id: "microcopy", topic: "voice", name: { en: "Microcopy", es: "Microcopy" }, what: { en: "Voice: buttons, errors, empty screens, forms and metadata", es: "Voz: botones, errores, vacíos, formularios y metadatos" } },
  { id: "no-ai-slop", topic: "voice", name: { en: "Avoid AI slop", es: "Evitar AI Slop" }, what: { en: "Voice: writing without the patterns of generated text (no-ai-slop, by Peter Yang)", es: "Voz: escribir sin los tics del texto generado (no-ai-slop, de Peter Yang)" } },
  { id: "no-ui-slop", topic: "review", name: { en: "Avoid UI slop", es: "Evitar UI Slop" }, what: { en: "The whole system: the habits that make an interface read as generated, as rules with an id", es: "Todo el sistema: los vicios que hacen que una interfaz parezca generada, como reglas con id" } },
  { id: "a11y", topic: "review", name: { en: "Accessibility", es: "Accesibilidad" }, what: { en: "The whole system: keyboard, focus, contrast and reduced motion", es: "Todo el sistema: teclado, foco, contraste y movimiento reducido" } },
  { id: "tailwind", topic: "foundations", name: { en: "Tailwind", es: "Tailwind" }, what: { en: "The whole system as a Tailwind 4 theme", es: "Todo el sistema como tema de Tailwind 4" } },
] as const satisfies readonly { id: string; topic: SkillTopic; name: Text; what: Text }[];

/** criterio.design's own skills that are not sections of criterio.md: they work through the MCP connector */
const CONNECTOR_SKILLS: Skill[] = [
  { name: { en: "Bring in a brand", es: "Traer una marca" }, topic: "connect", url: `${SKILLS_REPO}/tree/main/skills/bring-brand`, install: `npx skills add ${SKILLS_REPO} --skill bring-brand`, added: "2026-10-13", author: "criterio.design",
    text: { en: "Reads a site or a repo (tokens, components, logo, fonts) and fills the project's presentation through the criterio MCP.", es: "Lee una web o un repo (tokens, componentes, logo, fuentes) y rellena la presentación del proyecto por el MCP de Criterio." } },
];

/** Other authors' skills. The GitHub owner in the install command is the author */
const OTHERS: (Omit<Skill, "author" | "name"> & { name: string })[] = [
  { name: "frontend-design", topic: "interface", url: "https://ui-skills.com/skills/anthropics/frontend-design", added: "2026-10-05", install: "npx skills add https://github.com/anthropics/skills --skill frontend-design",
    text: { en: "Anthropic's own: distinctive, production-grade interfaces that steer clear of the generic AI look.", es: "La de Anthropic: interfaces con carácter y listas para producción, lejos del aspecto genérico de la IA." } },
  { name: "emil-design-eng", topic: "interface", url: "https://ui-skills.com/skills/emilkowalski/emil-design-eng", added: "2026-10-05", install: "npx skills add https://github.com/emilkowalski/skills --skill emil-design-eng",
    text: { en: "Emil Kowalski's design engineering: polish, components, animation and frontend craft ready for production.", es: "La ingeniería de diseño de Emil Kowalski: pulido, componentes, animación y oficio de frontend para producción." } },
  { name: "apple-design", topic: "motion", url: "https://ui-skills.com/skills/emilkowalski/apple-design", added: "2026-10-05", install: "npx skills add https://github.com/emilkowalski/skills --skill apple-design",
    text: { en: "Apple's way with interfaces and fluid, physical motion, brought to the web: gestures, springs, transitions.", es: "La forma de Apple de hacer interfaces y movimiento fluido y físico, llevada a la web: gestos, muelles, transiciones." } },
  { name: "interaction-design", topic: "motion", url: "https://ui-skills.com/skills/wshobson/interaction-design", added: "2026-10-05", install: "npx skills add https://github.com/wshobson/agents --skill interaction-design",
    text: { en: "Micro-interactions, transitions and feedback patterns, designed and built.", es: "Microinteracciones, transiciones y patrones de respuesta, diseñados y construidos." } },
  { name: "beautiful-shadows", topic: "foundations", url: "https://ui-skills.com/skills/mengto/beautiful-shadows", added: "2026-10-05", install: "npx skills add https://github.com/MengTo/Skills --skill beautiful-shadows",
    text: { en: "Depth, elevation and shadows that never turn muddy.", es: "Profundidad, elevación y sombras que nunca quedan sucias." } },
  { name: "adapt", topic: "foundations", url: "https://ui-skills.com/skills/pbakaus/adapt", added: "2026-10-05", install: "npx skills add https://github.com/pbakaus/impeccable --skill adapt",
    text: { en: "Adapts a design across breakpoints, devices and platforms without losing the interaction.", es: "Adapta un diseño a cada breakpoint, dispositivo y plataforma sin perder la interacción." } },
  { name: "shadcn", topic: "interface", url: "https://ui-skills.com/skills/shadcn-ui/shadcn", added: "2026-10-05", install: "npx skills add https://github.com/shadcn-ui/ui --skill shadcn",
    text: { en: "The official shadcn/ui workflow: find, add, compose and fix components the right way.", es: "El flujo oficial de shadcn/ui: buscar, añadir, componer y arreglar componentes como toca." } },
  { name: "accessibility", topic: "review", url: "https://ui-skills.com/skills/addyosmani/accessibility", added: "2026-10-05", install: "npx skills add https://github.com/addyosmani/web-quality-skills --skill accessibility", inCriterio: "a11y",
    text: { en: "Addy Osmani's accessibility audit and fixes against WCAG 2.2.", es: "La auditoría de accesibilidad de Addy Osmani, con arreglos según WCAG 2.2." } },
  { name: "design-review", topic: "review", url: "https://ui-skills.com/skills/superfuture/design-review", added: "2026-10-05", install: "npx skills add https://github.com/Superfuture/design-review --skill design-review",
    text: { en: "A sharp, prioritised design critique of a URL, a screenshot or a component: hierarchy, type, spacing, colour.", es: "Una crítica de diseño afilada y por prioridades de una URL, una captura o un componente: jerarquía, tipografía, espaciado, color." } },
  { name: "better-interface", topic: "review", url: "https://ui-skills.com/skills/jakubkrehel/better-interface", added: "2026-10-05", install: "npx skills add https://github.com/jakubkrehel/skills --skill better-interface",
    text: { en: "A whole interface review: accessibility, layout, writing, type, colour and finish.", es: "Una revisión completa de la interfaz: accesibilidad, layout, textos, tipografía, color y acabado." } },
  { name: "iso-figure", topic: "assets", url: "https://github.com/MrBongoC/ai-iso-skill", added: "2026-10-05", install: "npx skills add https://github.com/MrBongoC/ai-iso-skill --skill iso-figure", inCriterio: "iso-figure",
    text: { en: "Draws an object as an interactive isometric line figure in one HTML file, with parts that work when pressed.", es: "Dibuja un objeto como figura isométrica de línea en un solo HTML, con partes que funcionan al pulsarlas." } },
  { name: "gsap-skills", topic: "motion", url: "https://github.com/greensock/gsap-skills", added: "2026-10-05", install: "npx skills add https://github.com/greensock/gsap-skills", inCriterio: "gsap",
    text: { en: "GreenSock's own: GSAP done right, from timelines and ScrollTrigger to SplitText and Flip, with cleanup in React.", es: "La de GreenSock: GSAP bien hecho, de las timelines y ScrollTrigger a SplitText y Flip, con limpieza en React." } },
  { name: "no-ai-slop", topic: "voice", url: "https://github.com/petergyang/no-ai-slop", added: "2026-10-05", install: "npx skills add https://github.com/petergyang/no-ai-slop --skill no-ai-slop", inCriterio: "no-ai-slop",
    text: { en: "Peter Yang's: writes, edits and audits text so it doesn't read as generated.", es: "La de Peter Yang: escribe, edita y revisa textos para que no suenen a generados." } },
  { name: "slopmonster", topic: "voice", url: "https://github.com/ItsssssJack/SlopMonster", added: "2026-10-12", install: "npx skills add https://github.com/ItsssssJack/SlopMonster --skill slopmonster",
    text: { en: "Scores English copy out of 5 for AI tells with a local checker, then rewrites it and asks a rival model for a second pass.", es: "Puntúa el copy en inglés sobre 5 por tics de IA con un comprobador local, lo reescribe y pide una segunda pasada a un modelo rival." } },
];

const ownerOf = (install: string) => install.match(/github\.com\/([^/\s]+)/)?.[1] ?? "";

/** Every skill, criterio.design's own first under each topic (the page groups them) */
export const SKILLS: Skill[] = [
  ...OWN_SKILLS.map((s) => ({
    name: s.name, url: `${SKILLS_REPO}/tree/main/skills/${s.id}`, install: `npx skills add ${SKILLS_REPO} --skill ${s.id}`,
    topic: s.topic, text: s.what, author: "criterio.design",
  })),
  ...CONNECTOR_SKILLS,
  ...OTHERS.map((s) => ({ ...s, name: { en: s.name, es: s.name }, author: ownerOf(s.install) })),
];

/** Joined the list in the last 30 days, counted when the site is built */
export const NEW_DAYS = 30;
export const isNew = (s: Skill, now: number) => !!s.added && now - Date.parse(s.added) < NEW_DAYS * 86400000;
