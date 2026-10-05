// More skills for criterio.md (see lib/md-skills.ts, which lists them and writes the GSAP one). One per area and
// two that cross them all. Each is written the same way: first the project (the area's decision, what the team
// kept in its curation, its never list), then the craft, the same for every project. Plain data in, lines out.
import type { ProjectSystem, SystemArea, SystemAreaState } from "@/types/system";

type Lang = "en" | "es";

/** In the order the file has them: the areas' order, then the ones that cross them */
export const MORE_SKILLS = ["fonts", "color-tokens", "grid", "transitions", "icons", "logo-svg", "images", "iso-figure", "microcopy", "no-ai-slop", "a11y", "tailwind"] as const;
export type MoreSkill = (typeof MORE_SKILLS)[number];

interface SkillText {
  heading: string;
  /** What it builds, as "how to build … with …" ends */
  lead: string;
  /** The first step: what to install or set up */
  setup?: string;
  /** What to do while the area gives no numbers */
  defaults?: string[];
  rules: string[];
}
interface SkillDef {
  /** The area it builds; null: it crosses them all */
  area: SystemArea | null;
  en: SkillText; es: SkillText;
  /** What the project already decided that this skill needs, as lines of the file */
  facts?: (system: ProjectSystem, lang: Lang) => string[];
}

const AREAS: Record<Lang, Record<SystemArea, string>> = {
  en: { typography: "Typography", color: "Colour", layout: "Layout", motion: "Motion", iconography: "Iconography", logo: "Logo", imagery: "Imagery", voice: "Voice and tone" },
  es: { typography: "Tipografía", color: "Color", layout: "Layout", motion: "Movimiento", iconography: "Iconografía", logo: "Logo", imagery: "Imagen", voice: "Voz y tono" },
};
const COMMON = {
  en: {
    on: (what: string, area: string | null) => `Switched on in criterio.design. ${what}${area ? ` The ${area} area rules: where it and this section disagree, the area wins.` : " The areas rule: where one and this section disagree, the area wins."}`,
    project: "This project", decided: (area: string) => `${area}, as decided`, open: (area: string) => `The ${area} area is still open. Use the defaults below until the team decides.`,
    never: (area: string) => `Never (from the ${area} area)`, defaults: "Defaults, while the area names no numbers", craft: "The craft",
    families: "Families the team kept", colors: "The colours the team kept, as tokens to start from", numbers: "Measures the decision names", theme: "The system so far, as a theme to start from", touches: "What the system decides that this touches",
  },
  es: {
    on: (what: string, area: string | null) => `Activado en criterio.design. ${what}${area ? ` Manda el área de ${area}: si esta sección y ella no coinciden, gana el área.` : " Mandan las áreas: si una y esta sección no coinciden, gana el área."}`,
    project: "Este proyecto", decided: (area: string) => `${area}, tal como se ha decidido`, open: (area: string) => `El área de ${area} sigue abierta. Usa los valores por defecto de abajo hasta que el equipo decida.`,
    never: (area: string) => `Nunca (del área de ${area})`, defaults: "Valores por defecto, mientras el área no dé números", craft: "El oficio",
    families: "Familias que el equipo se quedó", colors: "Los colores que el equipo se quedó, como tokens de partida", numbers: "Medidas que nombra la decisión", theme: "El sistema hasta ahora, como tema de partida", touches: "Lo que decide el sistema y esto toca",
  },
} satisfies Record<Lang, unknown>;

// ─── What the project already holds ──────────────────────────────────────────────────────────────

const areaOf = (system: ProjectSystem, area: SystemArea) => system.areas.find((a) => a.area === area);
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const firstSentence = (s: string) => { const t = oneLine(s); const m = t.match(/^.*?[.!?](?=\s|$)/); return m ? m[0] : t; };
const keptOf = (a: SystemAreaState | undefined) => {
  const kept = new Set((a?.curation?.verdicts ?? []).filter((v) => v.keep).map((v) => v.id));
  return (a?.curation?.candidates ?? []).filter((c) => kept.has(c.id));
};

/** The families the team kept in Typography's curation: each once, with its role and weights */
function families(system: ProjectSystem): { family: string; role: string; weights: number[] }[] {
  const out = new Map<string, { family: string; role: string; weights: number[] }>();
  for (const c of keptOf(areaOf(system, "typography"))) for (const f of c.visual.families ?? []) {
    const had = out.get(f.family);
    out.set(f.family, { family: f.family, role: had?.role || f.role, weights: [...new Set([...(had?.weights ?? []), ...f.weights])].sort((a, b) => a - b) });
  }
  return [...out.values()];
}
/** The colours the team kept in Colour's curation, and the ones its decision names by hex */
function colours(system: ProjectSystem): { hex: string; name: string }[] {
  const a = areaOf(system, "color");
  const out = new Map<string, { hex: string; name: string }>();
  for (const c of keptOf(a)) for (const col of c.visual.colors ?? []) if (/^#[0-9a-f]{3,8}$/i.test(col.hex)) out.set(col.hex.toLowerCase(), { hex: col.hex.toLowerCase(), name: col.name });
  for (const m of (a?.decision ?? "").matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)) if (!out.has(m[0].toLowerCase())) out.set(m[0].toLowerCase(), { hex: m[0].toLowerCase(), name: "" });
  return [...out.values()].slice(0, 12);
}
const slug = (s: string, i: number) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || String(i + 1);

const fontFacts = (system: ProjectSystem, lang: Lang): string[] => {
  const f = families(system);
  return f.length ? [`**${COMMON[lang].families}:**`, ...f.map((x) => `- ${x.family}${x.role ? ` (${x.role})` : ""}${x.weights.length ? `: ${x.weights.join(", ")}` : ""}`), ""] : [];
};
const colourFacts = (system: ProjectSystem, lang: Lang): string[] => {
  const c = colours(system);
  return c.length ? [`**${COMMON[lang].colors}:**`, "", "```css", ":root {", ...c.map((x, i) => `  --color-${slug(x.name, i)}: ${x.hex};`), "}", "```", ""] : [];
};
const layoutFacts = (system: ProjectSystem, lang: Lang): string[] => {
  const nums = [...new Set([...(areaOf(system, "layout")?.decision ?? "").matchAll(/\d+(?:[.,]\d+)?\s?(?:px|rem|%|vw|vh)\b/g)].map((m) => m[0].replace(/\s/g, "")))];
  return nums.length ? [`**${COMMON[lang].numbers}:** ${nums.join(", ")}`, ""] : [];
};
/** The areas a crossing skill leans on, each in a line */
const touching = (areas: SystemArea[]) => (system: ProjectSystem, lang: Lang): string[] => {
  const rows = areas.map((k) => ({ k, a: areaOf(system, k) })).filter((x) => x.a?.decision);
  return rows.length ? [`**${COMMON[lang].touches}:**`, ...rows.map((x) => `- ${AREAS[lang][x.k]}: ${firstSentence(x.a!.decision)}`), ""] : [];
};
const themeFacts = (system: ProjectSystem, lang: Lang): string[] => {
  const f = families(system), c = colours(system);
  if (!f.length && !c.length) return touching(["typography", "color", "layout", "motion"])(system, lang);
  const display = f.find((x) => /display|title|head|titular/i.test(x.role)) ?? f[0];
  const body = f.find((x) => /body|text|texto|cuerpo/i.test(x.role)) ?? f[f.length - 1];
  return [`**${COMMON[lang].theme}:**`, "", "```css", '@import "tailwindcss";', "", "@theme {",
    ...(display ? [`  --font-display: "${display.family}", ui-sans-serif, system-ui, sans-serif;`] : []),
    ...(body ? [`  --font-sans: "${body.family}", ui-sans-serif, system-ui, sans-serif;`] : []),
    ...c.map((x, i) => `  --color-${slug(x.name, i)}: ${x.hex};`),
    "}", "```", ""];
};

// ─── The skills ──────────────────────────────────────────────────────────────────────────────────

const SKILLS: Record<MoreSkill, SkillDef> = {
  fonts: {
    area: "typography", facts: fontFacts,
    en: {
      heading: "Build it: type on the web",
      lead: "How to load and set the Typography area above on a website.",
      setup: "Serve the families from your own domain as WOFF2, the variable file when the family has one. In Next.js use `next/font` (local or Google): it self-hosts the files and adjusts the fallback so the text does not jump when the font arrives.",
      defaults: ["One family for text and at most one more for display.", "Body at 1 to 1.125rem with line-height 1.6; each step of the scale 1.2 to 1.25 times the one before.", "Two weights of the text family (regular and one for emphasis) until the area asks for more."],
      rules: [
        "Ship only the weights and styles the area names. `font-synthesis: none`, so the browser never fakes a bold or an italic the family does not have.",
        "`font-display: swap` for text. Preload the one face used above the fold and no other.",
        "Subset to the languages the site speaks (`unicode-range`): a Latin subset is a third of the file.",
        "A fallback that matches the font's measures (`size-adjust`, `ascent-override`) so nothing moves on load.",
        "Sizes in `rem`, the scale fluid with `clamp()`: `font-size: clamp(2.5rem, 1.6rem + 3.6vw, 4rem)`. Body text never below 1rem.",
        "Headlines: `text-wrap: balance`, line-height 1.05 to 1.2, tracking tighter as the size grows. Body: `text-wrap: pretty`, line-height 1.5 to 1.65, 60 to 75 characters a line.",
        "Figures that line up (prices, tables, counters): `font-variant-numeric: tabular-nums`.",
        "Emphasis by weight or italic of the same family, never by a third family.",
      ],
    },
    es: {
      heading: "Construirlo: tipografía en la web",
      lead: "Cómo cargar y componer en una web el área de Tipografía de arriba.",
      setup: "Sirve las familias desde tu propio dominio en WOFF2, el fichero variable cuando la familia lo tenga. En Next.js usa `next/font` (local o Google): aloja los ficheros y ajusta la fuente de reserva para que el texto no salte cuando llega la fuente.",
      defaults: ["Una familia para el texto y como mucho otra para titulares.", "Cuerpo de 1 a 1,125rem con interlineado 1,6; cada paso de la escala, entre 1,2 y 1,25 veces el anterior.", "Dos pesos de la familia de texto (regular y uno para destacar) hasta que el área pida más."],
      rules: [
        "Carga solo los pesos y estilos que nombra el área. `font-synthesis: none`, para que el navegador nunca invente una negrita o una cursiva que la familia no tiene.",
        "`font-display: swap` en el texto. Precarga la única fuente que se ve sin hacer scroll y ninguna más.",
        "Recorta a los idiomas de la web (`unicode-range`): un subset latino pesa la tercera parte.",
        "Una fuente de reserva con las mismas medidas (`size-adjust`, `ascent-override`) para que nada se mueva al cargar.",
        "Tamaños en `rem` y escala fluida con `clamp()`: `font-size: clamp(2.5rem, 1.6rem + 3.6vw, 4rem)`. El cuerpo, nunca por debajo de 1rem.",
        "Titulares: `text-wrap: balance`, interlineado de 1,05 a 1,2 y tracking más cerrado cuanto mayor es el tamaño. Cuerpo: `text-wrap: pretty`, interlineado de 1,5 a 1,65 y de 60 a 75 caracteres por línea.",
        "Cifras que tienen que alinearse (precios, tablas, contadores): `font-variant-numeric: tabular-nums`.",
        "Se destaca con el peso o la cursiva de la misma familia, nunca con una tercera familia.",
      ],
    },
  },
  "color-tokens": {
    area: "color", facts: colourFacts,
    en: {
      heading: "Build it: colour as tokens",
      lead: "How to turn the Colour area above into tokens a whole site is painted from.",
      setup: "Two layers of CSS custom properties. The palette holds the colours (`--gray-900`); the roles say what each is for (`--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`). Components only ever use roles.",
      defaults: ["A neutral scale of 9 to 11 steps and one accent.", "Roles: `--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`, `--accent-text`.", "One accent does the acting: links, the primary button, the focus ring."],
      rules: [
        "Write the palette in OKLCH (`oklch(0.21 0.01 95)`): lightness steps are even and a hue holds across them. Keep the hex the team chose in a comment.",
        "No colour outside the tokens: a raw hex in a component is a missing token.",
        "Light and dark by redefining the roles (under `[data-theme=\"dark\"]` and `prefers-color-scheme`), never component by component. Set `color-scheme` so form controls and scrollbars follow.",
        "Contrast: text at 4.5:1 or more on its background; large text and the edges of controls at 3:1. Check every pair of text and background the site actually ships.",
        "States come from the token, not from new colours: `color-mix(in oklch, var(--accent), black 8%)` for hover, a little more for pressed.",
        "Lines and soft surfaces from the text colour with transparency (`color-mix(in oklch, var(--text) 12%, transparent)`), so they follow both themes.",
        "Colour never carries meaning alone: an error also has an icon or words.",
        "Images and illustrations sit inside the palette's contrast: a photo never becomes the only background of text without a wash over it.",
      ],
    },
    es: {
      heading: "Construirlo: el color como tokens",
      lead: "Cómo convertir el área de Color de arriba en los tokens con los que se pinta toda la web.",
      setup: "Dos capas de variables CSS. La paleta guarda los colores (`--gray-900`); los roles dicen para qué sirve cada uno (`--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`). Los componentes solo usan roles.",
      defaults: ["Una escala neutra de 9 a 11 pasos y un solo acento.", "Roles: `--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`, `--accent-text`.", "Un único acento hace el trabajo: enlaces, el botón principal y el anillo de foco."],
      rules: [
        "Escribe la paleta en OKLCH (`oklch(0.21 0.01 95)`): los pasos de luminosidad son regulares y el tono se mantiene. Deja en un comentario el hex que eligió el equipo.",
        "Ningún color fuera de los tokens: un hex suelto en un componente es un token que falta.",
        "Claro y oscuro redefiniendo los roles (bajo `[data-theme=\"dark\"]` y `prefers-color-scheme`), nunca componente a componente. Declara `color-scheme` para que formularios y barras de scroll acompañen.",
        "Contraste: texto a 4,5:1 o más sobre su fondo; texto grande y bordes de controles a 3:1. Comprueba cada pareja de texto y fondo que la web use de verdad.",
        "Los estados salen del token, no de colores nuevos: `color-mix(in oklch, var(--accent), black 8%)` para el hover y un poco más para el pulsado.",
        "Líneas y superficies suaves a partir del color del texto con transparencia (`color-mix(in oklch, var(--text) 12%, transparent)`), para que sigan a los dos temas.",
        "El color nunca lleva el significado él solo: un error tiene además un icono o palabras.",
        "Fotos e ilustraciones respetan el contraste de la paleta: una foto nunca es el único fondo de un texto sin un velo encima.",
      ],
    },
  },
  grid: {
    area: "layout", facts: layoutFacts,
    en: {
      heading: "Build it: layout with CSS grid",
      lead: "How to build the Layout area above with CSS, from the page down to a card.",
      setup: "Start from tokens: a spacing scale (`--space-1` to `--space-10`, on a base of 4 or 8px), the radii the area names and one container width. Everything else is made of them.",
      defaults: ["Spacing on a base of 8px: 4, 8, 12, 16, 24, 32, 48, 64, 96.", "A container of `min(100% - 2 * var(--gutter), 72rem)` with a gutter of `clamp(1rem, 4vw, 3rem)`.", "Sections apart by `clamp(4rem, 10vw, 8rem)`."],
      rules: [
        "Grid for two dimensions, flex for one. Space between things with `gap`, not with margins on the children.",
        "Lists of cards without breakpoints: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr))`.",
        "A component adapts to its own room, not the window's: `container-type: inline-size` on its wrapper and `@container (min-width: 40rem)` inside. Media queries are for the page.",
        "Mobile first. Breakpoints where the content breaks, not at device names. Check 360, 768, 1280 and 1920.",
        "No fixed heights. Media holds its place with `aspect-ratio`; a full screen is `min-height: 100dvh`.",
        "`subgrid` when the inner rows of cards in a row must line up (title, text, button).",
        "Logical properties (`margin-inline`, `padding-block`) and `gap` in tokens, so one change moves the whole rhythm.",
        "Nothing scrolls sideways at 320px wide, and text is never clipped to fit a box.",
      ],
    },
    es: {
      heading: "Construirlo: layout con CSS grid",
      lead: "Cómo construir con CSS el área de Layout de arriba, de la página a una tarjeta.",
      setup: "Empieza por los tokens: una escala de espacios (`--space-1` a `--space-10`, sobre una base de 4 u 8px), los radios que nombra el área y un ancho de contenedor. Todo lo demás se hace con ellos.",
      defaults: ["Espacios sobre una base de 8px: 4, 8, 12, 16, 24, 32, 48, 64, 96.", "Un contenedor de `min(100% - 2 * var(--gutter), 72rem)` con un margen de `clamp(1rem, 4vw, 3rem)`.", "Secciones separadas por `clamp(4rem, 10vw, 8rem)`."],
      rules: [
        "Grid para dos dimensiones y flex para una. El espacio entre cosas va con `gap`, no con márgenes en los hijos.",
        "Listas de tarjetas sin puntos de corte: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr))`.",
        "Un componente se adapta a su propio hueco, no a la ventana: `container-type: inline-size` en su contenedor y `@container (min-width: 40rem)` dentro. Las media queries son para la página.",
        "Primero el móvil. Los puntos de corte van donde se rompe el contenido, no en nombres de dispositivo. Comprueba 360, 768, 1280 y 1920.",
        "Sin alturas fijas. Las imágenes guardan su sitio con `aspect-ratio`; una pantalla completa es `min-height: 100dvh`.",
        "`subgrid` cuando las filas interiores de las tarjetas de una misma fila tienen que alinearse (título, texto, botón).",
        "Propiedades lógicas (`margin-inline`, `padding-block`) y `gap` en tokens, para que un solo cambio mueva todo el ritmo.",
        "Nada hace scroll lateral a 320px de ancho y ningún texto se recorta para caber en una caja.",
      ],
    },
  },
  transitions: {
    area: "motion",
    en: {
      heading: "Build it: motion without a library",
      lead: "How to build the Motion area above with what the browser already has: CSS transitions, `@starting-style`, view transitions and scroll timelines.",
      setup: "Nothing to install. Put the area's curves and durations in tokens (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1); --dur-fast: 180ms`) and use only those.",
      defaults: ["Feedback (hover, focus, press): 150 to 250ms. Things entering: 300 to 500ms. Leaving: shorter than entering.", "One curve for entering (`cubic-bezier(0.23, 1, 0.32, 1)`) and one for moving across (`cubic-bezier(0.65, 0, 0.35, 1)`).", "A press is `scale: 0.97` and back."],
      rules: [
        "Move with `translate`, `scale`, `rotate` and `opacity` only. Never transition `width`, `height`, `top`, `left` or a large `box-shadow`.",
        "Something that appears: `@starting-style { opacity: 0; translate: 0 8px; }` and a transition. From `display: none`, add `transition-behavior: allow-discrete`.",
        "A change of page or of state: `document.startViewTransition(() => update())`, with `view-transition-name` on what should travel between the two. Without support the change simply happens.",
        "Reveals on scroll without JavaScript: `animation-timeline: view(); animation-range: entry 0% cover 30%;` inside `@supports (animation-timeline: view())`. Once, not on every pass.",
        "`@media (prefers-reduced-motion: reduce)`: no travel and no scale, only a short fade, or nothing.",
        "Hover effects inside `@media (hover: hover)`, so a touch screen does not keep them stuck.",
        "Menus, dialogs and popovers with `<dialog>` and `popover`: the browser handles focus and the top layer, and `::backdrop` fades like anything else.",
        "Loops stop when they are off screen or the tab is hidden (`animation-play-state`), and nothing moves on its own for more than five seconds without a way to stop it.",
      ],
    },
    es: {
      heading: "Construirlo: movimiento sin librería",
      lead: "Cómo construir el área de Movimiento de arriba con lo que el navegador ya trae: transiciones CSS, `@starting-style`, view transitions y líneas de tiempo de scroll.",
      setup: "No hay nada que instalar. Pon las curvas y duraciones del área en tokens (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1); --dur-fast: 180ms`) y usa solo esos.",
      defaults: ["Respuesta (hover, foco, pulsación): de 150 a 250ms. Lo que entra: de 300 a 500ms. Lo que sale: más corto que al entrar.", "Una curva para entrar (`cubic-bezier(0.23, 1, 0.32, 1)`) y otra para desplazarse (`cubic-bezier(0.65, 0, 0.35, 1)`).", "Pulsar es `scale: 0.97` y volver."],
      rules: [
        "Mueve solo con `translate`, `scale`, `rotate` y `opacity`. Nunca transiciones de `width`, `height`, `top`, `left` ni de un `box-shadow` grande.",
        "Algo que aparece: `@starting-style { opacity: 0; translate: 0 8px; }` y una transición. Si viene de `display: none`, añade `transition-behavior: allow-discrete`.",
        "Un cambio de página o de estado: `document.startViewTransition(() => update())`, con `view-transition-name` en lo que debe viajar de uno a otro. Sin soporte, el cambio ocurre sin más.",
        "Apariciones al hacer scroll sin JavaScript: `animation-timeline: view(); animation-range: entry 0% cover 30%;` dentro de `@supports (animation-timeline: view())`. Una vez, no en cada pasada.",
        "`@media (prefers-reduced-motion: reduce)`: sin desplazamiento ni escala, solo un fundido corto, o nada.",
        "Los efectos de hover van dentro de `@media (hover: hover)`, para que en pantallas táctiles no se queden pegados.",
        "Menús, diálogos y popovers con `<dialog>` y `popover`: el navegador gestiona el foco y la capa superior, y `::backdrop` se funde como cualquier otra cosa.",
        "Los bucles se paran fuera de pantalla o con la pestaña oculta (`animation-play-state`), y nada se mueve solo más de cinco segundos sin una forma de pararlo.",
      ],
    },
  },
  icons: {
    area: "iconography",
    en: {
      heading: "Build it: one set of icons",
      lead: "How to bring the Iconography area above into the site as one consistent set.",
      setup: "Pick one library that matches the area and install it as components: Lucide (`lucide-react`) for a fine, round outline; Phosphor (`@phosphor-icons/react`) when the area wants several weights of the same drawing. Import icon by icon, so only the ones used are shipped.",
      defaults: ["Outline, 1.5px stroke, round caps and joins.", "16px beside text, 20px in buttons, 24px on their own.", "The icon takes the colour of its text: `currentColor`."],
      rules: [
        "One set and one weight in the whole site. A filled icon never sits beside an outlined one, and an emoji is not an icon.",
        "The stroke stays the same at every size (Lucide: `absoluteStrokeWidth`), so a 16px icon is not thinner than a 24px one.",
        "Sizes from the scale, in `em` when the icon sits in text (`1em`, `vertical-align: -0.125em`) so it follows the type.",
        "The pressable area is 44px or more even when the icon is 20: the padding belongs to the button.",
        "An icon that only decorates is `aria-hidden=\"true\"`. A button with nothing but an icon has an `aria-label` that says what it does.",
        "An icon the set lacks is drawn on its grid (24 by 24, 2px of margin, the same stroke, caps and joins) and exported as SVG with `stroke=\"currentColor\"`.",
        "Never an icon font. SVG inline or as components, optimised with SVGO keeping the `viewBox`.",
        "An icon goes with a word wherever its meaning is not universal; alone, only the ones everyone knows (close, search, menu).",
      ],
    },
    es: {
      heading: "Construirlo: un solo set de iconos",
      lead: "Cómo llevar a la web el área de Iconografía de arriba como un único set coherente.",
      setup: "Elige una librería que encaje con el área e instálala como componentes: Lucide (`lucide-react`) para un contorno fino y redondeado; Phosphor (`@phosphor-icons/react`) cuando el área pida varios pesos del mismo dibujo. Importa icono a icono, para servir solo los que se usan.",
      defaults: ["Contorno, trazo de 1,5px, extremos y uniones redondeados.", "16px junto al texto, 20px en botones y 24px cuando van solos.", "El icono toma el color de su texto: `currentColor`."],
      rules: [
        "Un solo set y un solo peso en toda la web. Un icono relleno nunca va junto a uno de contorno, y un emoji no es un icono.",
        "El trazo es el mismo a cualquier tamaño (Lucide: `absoluteStrokeWidth`), para que un icono de 16px no quede más fino que uno de 24.",
        "Tamaños de la escala, en `em` cuando el icono va dentro del texto (`1em`, `vertical-align: -0.125em`), para que siga a la tipografía.",
        "La zona pulsable mide 44px o más aunque el icono sea de 20: el relleno es del botón.",
        "Un icono que solo decora lleva `aria-hidden=\"true\"`. Un botón con solo un icono lleva un `aria-label` que dice lo que hace.",
        "Un icono que el set no tiene se dibuja sobre su retícula (24 por 24, 2px de margen, mismo trazo, extremos y uniones) y se exporta en SVG con `stroke=\"currentColor\"`.",
        "Nunca una fuente de iconos. SVG en línea o como componentes, optimizados con SVGO conservando el `viewBox`.",
        "El icono va con una palabra siempre que su significado no sea universal; solos, únicamente los que todo el mundo conoce (cerrar, buscar, menú).",
      ],
    },
  },
  "logo-svg": {
    area: "logo",
    en: {
      heading: "Build it: the logo as files",
      lead: "How to turn the Logo area above into the files a site needs: the mark, its versions, the favicon and the share image.",
      setup: "The master is one SVG: text converted to outlines, a tight `viewBox`, no fixed width or height, and `fill=\"currentColor\"` in the one-colour version so it takes the colour of where it sits.",
      defaults: ["Clear space on every side equal to the height of one of its letters.", "Smallest size on screen: 80px wide for the wordmark, 16px for the symbol.", "Versions: whole, symbol alone, one colour, and on a dark ground."],
      rules: [
        "The logo is never recoloured, stretched, outlined, tilted or given a shadow. If it does not read on a ground, use its other version, do not alter it.",
        "In the header it is inline SVG or an `<img>` whose `alt` is the name of the brand, it links home and its height comes from a token.",
        "Favicons: `icon.svg` (it can change with `prefers-color-scheme` inside the file), `favicon.ico` at 32px for old browsers, `apple-touch-icon.png` at 180px, and 192 and 512px in the web manifest, with the symbol inside the maskable safe zone.",
        "The symbol alone below 32px: a wordmark is not legible in a tab.",
        "Share image (Open Graph) at 1200 by 630: the page's own headline in the project's type, the logo small in a corner. Never the logo huge and centred.",
        "Optimise with SVGO, keep the `viewBox`, give it a `<title>` when it stands alone.",
        "It moves only if the Motion area says so, once, on arrival (for a line drawing, `stroke-dasharray`), and it stands still with reduced motion.",
        "Keep the versions together in one folder with what each is for. Nobody should have to redraw it from a screenshot.",
      ],
    },
    es: {
      heading: "Construirlo: el logo como ficheros",
      lead: "Cómo convertir el área de Logo de arriba en los ficheros que una web necesita: la marca, sus versiones, el favicon y la imagen para compartir.",
      setup: "El original es un único SVG: texto convertido a trazados, `viewBox` ajustado, sin ancho ni alto fijos y con `fill=\"currentColor\"` en la versión a un color, para que tome el color de donde se coloca.",
      defaults: ["Área de respeto en cada lado igual a la altura de una de sus letras.", "Tamaño mínimo en pantalla: 80px de ancho para el logotipo y 16px para el símbolo.", "Versiones: completo, solo símbolo, a un color y sobre fondo oscuro."],
      rules: [
        "El logo nunca se recolorea, se estira, se contornea, se inclina ni recibe sombra. Si no se lee sobre un fondo, se usa su otra versión, no se altera.",
        "En la cabecera es SVG en línea o un `<img>` cuyo `alt` es el nombre de la marca, enlaza al inicio y su altura sale de un token.",
        "Favicons: `icon.svg` (puede cambiar con `prefers-color-scheme` dentro del fichero), `favicon.ico` a 32px para navegadores antiguos, `apple-touch-icon.png` a 180px, y 192 y 512px en el manifest, con el símbolo dentro de la zona segura maskable.",
        "Por debajo de 32px, solo el símbolo: un logotipo no se lee en una pestaña.",
        "Imagen para compartir (Open Graph) a 1200 por 630: el titular de la página en la tipografía del proyecto y el logo pequeño en una esquina. Nunca el logo enorme y centrado.",
        "Optimiza con SVGO conservando el `viewBox` y ponle un `<title>` cuando vaya solo.",
        "Solo se mueve si lo dice el área de Movimiento, una vez, al llegar (en un dibujo de línea, `stroke-dasharray`), y se queda quieto con movimiento reducido.",
        "Guarda las versiones juntas en una carpeta con para qué sirve cada una. Nadie debería tener que redibujarlo desde una captura.",
      ],
    },
  },
  images: {
    area: "imagery",
    en: {
      heading: "Build it: images that load well",
      lead: "How to put the Imagery area above on a website: formats, sizes, crops and one treatment.",
      setup: "Never ship the original. Export each image at 640, 960, 1280, 1920 and 2560px wide, in AVIF (quality 55 to 65) with WebP behind it, or let the framework do it (`next/image`, an image CDN).",
      defaults: ["Ratios by use: 16:9 or 3:2 for a hero, 4:3 for cards, 4:5 for portraits.", "One grade for the whole set: the same contrast, the same warmth.", "The subject is never cropped at a joint or at the eyes."],
      rules: [
        "Every image has `width` and `height` (or `aspect-ratio`), so the page does not jump when it arrives.",
        "`sizes` says how wide it really is on screen (`sizes=\"(min-width: 64rem) 50vw, 100vw\"`); without it the browser downloads the largest.",
        "The first image in view: `fetchpriority=\"high\"` and not lazy. Everything below: `loading=\"lazy\"` and `decoding=\"async\"`.",
        "`object-fit: cover` with `object-position` on the subject, so a crop never cuts a face.",
        "On a phone, a different crop (`<picture>` with `media`), not the wide shot made small.",
        "`alt` says what matters in the picture for someone who cannot see it; a picture that only decorates has `alt=\"\"`.",
        "A placeholder while it loads: the image's own dominant colour or a blur of it, never a grey box or a spinner.",
        "Text over a photo sits on a wash that guarantees its contrast, and is never part of the image file.",
        "Video is muted, `playsinline`, with a `poster` and a way to pause; it does not start with reduced motion.",
      ],
    },
    es: {
      heading: "Construirlo: imágenes que cargan bien",
      lead: "Cómo llevar a una web el área de Imagen de arriba: formatos, tamaños, encuadres y un único tratamiento.",
      setup: "Nunca se sirve el original. Exporta cada imagen a 640, 960, 1280, 1920 y 2560px de ancho, en AVIF (calidad de 55 a 65) con WebP de respaldo, o deja que lo haga el framework (`next/image`, un CDN de imágenes).",
      defaults: ["Proporciones por uso: 16:9 o 3:2 para un hero, 4:3 para tarjetas y 4:5 para retratos.", "Un mismo revelado para todo el conjunto: el mismo contraste y la misma temperatura.", "El protagonista nunca se corta por una articulación ni por los ojos."],
      rules: [
        "Toda imagen lleva `width` y `height` (o `aspect-ratio`), para que la página no salte cuando llega.",
        "`sizes` dice cuánto ocupa de verdad en pantalla (`sizes=\"(min-width: 64rem) 50vw, 100vw\"`); sin él el navegador descarga la más grande.",
        "La primera imagen a la vista: `fetchpriority=\"high\"` y sin lazy. Todo lo de abajo: `loading=\"lazy\"` y `decoding=\"async\"`.",
        "`object-fit: cover` con `object-position` en el protagonista, para que un recorte nunca corte una cara.",
        "En el móvil, otro encuadre (`<picture>` con `media`), no el plano ancho hecho pequeño.",
        "El `alt` dice lo que importa de la imagen para quien no puede verla; una imagen que solo decora lleva `alt=\"\"`.",
        "Mientras carga, su propio color dominante o un desenfoque de ella, nunca una caja gris ni un spinner.",
        "El texto sobre una foto va sobre un velo que garantiza su contraste y nunca forma parte del fichero de imagen.",
        "El vídeo va en silencio, con `playsinline`, `poster` y una forma de pausarlo; con movimiento reducido no arranca.",
      ],
    },
  },
  "iso-figure": {
    area: "imagery",
    en: {
      heading: "Build it: an interactive isometric figure",
      lead: "How to draw an object of the project as an isometric hairline figure in one HTML file, with parts that work when pressed (after MrBongoC's iso-figure skill).",
      setup: "Plain SVG, no libraries: about 15 lines of projection turn each face of a box into an SVG `matrix()`, so flat rects, text and paths land on the right plane. Copy this kernel as it is, then build the scene:\n\n```js\nconst C = Math.cos(Math.PI/6), S = Math.sin(Math.PI/6), OX = 465, OY = 300;\nconst P = (x,y,z) => [(x-y)*C + OX, (x+y)*S - z + OY];\nconst D = (x,y,z) => [(x-y)*C, (x+y)*S - z];\nconst plane = (O,U,V) => { const o=P(...O), u=D(...U), v=D(...V);\n  return `matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${o[0]} ${o[1]})`; };\nconst TOP   = (x,y,z) => plane([x,y,z],[1,0,0],[0,1,0]);\nconst FRONT = (x,y,z) => plane([x,y,z],[1,0,0],[0,0,-1]);\nconst SIDE  = (x,y,z) => plane([x,y,z],[0,-1,0],[0,0,-1]);\nconst rect = (t,w,h,r=0,cls='face') =>\n  `<g transform=\"${t}\"><rect class=\"${cls}\" width=\"${w}\" height=\"${h}\" rx=\"${r}\"/></g>`;\nconst box = (x,y,z,w,d,h,r=0) =>\n  rect(SIDE(x+w,y+d,z+h), d,h,Math.min(r,h/4)) +\n  rect(FRONT(x,y+d,z+h), w,h,Math.min(r,h/4)) +\n  rect(TOP(x,y,z+h), w,d,r,'face top');\n```",
      defaults: ["Two greys for the lines (structure and detail) and one `--live` colour for whatever is on: the lit screen, the pressed key.", "A dark and a light set of custom properties; the drawing works in both.", "Radii of 2 to 14 units on the boxes."],
      rules: [
        "Name the output first: what pressing a part produces (typed text, a number, a note, a light). A figure you can only watch is decoration; pick another object.",
        "Axes: +x runs down-right, +y down-left, +z up. The front of the object (screen, display) goes on a FRONT face; what the hand reaches for (keys, buttons) sits at larger `y`.",
        "Break the object into 3 to 8 boxes and write their `(x, y, z, w, d, h)` as a table before drawing. Detail (vents, bezels, labels) is drawn flat inside a group with the face's transform, never as hand-typed skewed polygons.",
        "Paint back to front, the only depth sorting: smaller `x + y` first, lower `z` first; grids row by row with growing `y`. Faces need an opaque fill.",
        "Every line `vector-effect: non-scaling-stroke` at 1px, or the matrix skews the hairline. Texture comes from repetition (slits, key grids, ribs), never from shading, gradients or shadows.",
        "Each pressable part is its own `<g class=\"press\">` with its box and its label. Pressed: `translateY(4px)` in about 60ms and its stroke goes to `--live`; nothing moves with `prefers-reduced-motion`.",
        "One `state` object and one `render()`; pointer and keyboard call the same functions. Typed text shows only its tail, clipped to the glass, with `&` and `<` escaped.",
        "Frame it by numbers: project the extreme corners with `P` and set `OX`, `OY` and the `viewBox` for 8 to 15% of margin on every side.",
        "The plate: four monospace captions at the corners, `Fig N`, the object's name, the instruction and a live readout in lowercase (`on · 9 chars · key t`) that changes on every press.",
        "On the object, the project's own mark or an invented glyph, never another company's logo or a real product's silhouette.",
        "One file that runs from disk: no external scripts. The svg has `role=\"img\"`, `tabindex=\"0\"` and an `aria-label` saying what it is and how to use it.",
      ],
    },
    es: {
      heading: "Construirlo: una figura isométrica interactiva",
      lead: "Cómo dibujar un objeto del proyecto como figura isométrica de línea fina en un solo HTML, con partes que funcionan al pulsarlas (a partir de la skill iso-figure de MrBongoC).",
      setup: "SVG plano, sin librerías: unas 15 líneas de proyección convierten cada cara de una caja en un `matrix()` de SVG, así que rectángulos, textos y trazados planos caen en el plano correcto. Copia este núcleo tal cual y luego monta la escena:\n\n```js\nconst C = Math.cos(Math.PI/6), S = Math.sin(Math.PI/6), OX = 465, OY = 300;\nconst P = (x,y,z) => [(x-y)*C + OX, (x+y)*S - z + OY];\nconst D = (x,y,z) => [(x-y)*C, (x+y)*S - z];\nconst plane = (O,U,V) => { const o=P(...O), u=D(...U), v=D(...V);\n  return `matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${o[0]} ${o[1]})`; };\nconst TOP   = (x,y,z) => plane([x,y,z],[1,0,0],[0,1,0]);\nconst FRONT = (x,y,z) => plane([x,y,z],[1,0,0],[0,0,-1]);\nconst SIDE  = (x,y,z) => plane([x,y,z],[0,-1,0],[0,0,-1]);\nconst rect = (t,w,h,r=0,cls='face') =>\n  `<g transform=\"${t}\"><rect class=\"${cls}\" width=\"${w}\" height=\"${h}\" rx=\"${r}\"/></g>`;\nconst box = (x,y,z,w,d,h,r=0) =>\n  rect(SIDE(x+w,y+d,z+h), d,h,Math.min(r,h/4)) +\n  rect(FRONT(x,y+d,z+h), w,h,Math.min(r,h/4)) +\n  rect(TOP(x,y,z+h), w,d,r,'face top');\n```",
      defaults: ["Dos grises para las líneas (estructura y detalle) y un color `--live` para lo que está encendido: la pantalla iluminada, la tecla pulsada.", "Un juego de custom properties oscuro y otro claro; el dibujo funciona en los dos.", "Radios de 2 a 14 unidades en las cajas."],
      rules: [
        "Primero, qué produce: qué sale al pulsar una parte (texto tecleado, un número, una nota, una luz). Una figura que solo se mira es decoración; elige otro objeto.",
        "Ejes: +x baja a la derecha, +y baja a la izquierda, +z sube. El frente del objeto (pantalla, display) va en una cara FRONT; lo que toca la mano (teclas, botones) queda a mayor `y`.",
        "Descompón el objeto en 3 a 8 cajas y apunta sus `(x, y, z, w, d, h)` en una tabla antes de dibujar. El detalle (rejillas, biseles, etiquetas) se dibuja plano dentro de un grupo con la transformación de la cara, nunca con polígonos sesgados a mano.",
        "Se pinta de atrás adelante, la única ordenación de profundidad: primero menor `x + y`, primero menor `z`; las cuadrículas fila a fila con `y` creciente. Las caras necesitan relleno opaco.",
        "Toda línea con `vector-effect: non-scaling-stroke` a 1px, o la matriz deforma el trazo fino. La textura sale de la repetición (ranuras, rejillas de teclas, nervios), nunca de sombreados, degradados ni sombras.",
        "Cada parte pulsable es su propio `<g class=\"press\">` con su caja y su etiqueta. Al pulsar: `translateY(4px)` en unos 60ms y su trazo pasa a `--live`; con `prefers-reduced-motion` no se mueve nada.",
        "Un objeto `state` y un `render()`; puntero y teclado llaman a las mismas funciones. El texto tecleado muestra solo su final, recortado al cristal, con `&` y `<` escapados.",
        "Encuadre con números: proyecta las esquinas extremas con `P` y ajusta `OX`, `OY` y el `viewBox` para dejar de 8 a 15% de margen por cada lado.",
        "La lámina: cuatro rótulos monoespaciados en las esquinas, `Fig N`, el nombre del objeto, la instrucción y una lectura en vivo en minúsculas (`on · 9 chars · key t`) que cambia con cada pulsación.",
        "Sobre el objeto, la marca del propio proyecto o un glifo inventado, nunca el logo de otra empresa ni la silueta de un producto real.",
        "Un solo fichero que funciona abierto desde el disco: sin scripts externos. El svg lleva `role=\"img\"`, `tabindex=\"0\"` y un `aria-label` que dice qué es y cómo se usa.",
      ],
    },
  },
  microcopy: {
    area: "voice",
    en: {
      heading: "Build it: the small words",
      lead: "How to write, in the Voice and tone above, the words nobody designs: buttons, errors, empty screens, forms and what search engines show.",
      defaults: ["Sentence case everywhere, no full stop in headlines or buttons.", "Speak to one person, the same way from the headline to the error message.", "Short: if a word can go, it goes."],
      rules: [
        "A button says what happens when it is pressed: a verb and its object (\"Book a call\"), never \"Submit\" or \"OK\". One main action in each screen.",
        "A headline says the fact or the benefit in the reader's own words. No slogans that would fit any company.",
        "An error says what happened and how to fix it, beside the field, without blaming and without a code on its own.",
        "An empty screen says what will be here and gives the first step.",
        "Forms: the label above the field, an example as a hint and not as a placeholder, only the questions that are needed, and why when a piece of data is sensitive.",
        "A confirmation names the thing done (\"Message sent to the office\"), not \"Success\".",
        "Links say where they go; never \"click here\" or \"read more\" alone.",
        "For search and sharing: a `<title>` of up to 60 characters (what it is, then the brand), a description of 140 to 160 that sounds like the voice, and the same care in the share title.",
        "The never list of the area holds everywhere: alt texts, emails, legal notes and error pages too.",
        "Consent and legal text in plain words, with the choice that costs the reader nothing as easy as the other.",
      ],
    },
    es: {
      heading: "Construirlo: las palabras pequeñas",
      lead: "Cómo escribir, con la Voz y tono de arriba, las palabras que nadie diseña: botones, errores, pantallas vacías, formularios y lo que enseñan los buscadores.",
      defaults: ["Mayúscula solo al empezar, sin punto final en titulares ni botones.", "Se habla a una persona, y de la misma forma desde el titular hasta el mensaje de error.", "Corto: si una palabra sobra, se quita."],
      rules: [
        "Un botón dice lo que pasa al pulsarlo: un verbo y su objeto («Pedir cita»), nunca «Enviar» ni «Aceptar». Una sola acción principal en cada pantalla.",
        "Un titular dice el hecho o el beneficio con las palabras de quien lee. Nada de lemas que le servirían a cualquier empresa.",
        "Un error dice qué ha pasado y cómo arreglarlo, junto al campo, sin culpar y sin un código a secas.",
        "Una pantalla vacía dice qué habrá aquí y da el primer paso.",
        "Formularios: la etiqueta encima del campo, un ejemplo como ayuda y no como placeholder, solo las preguntas necesarias y el porqué cuando un dato es delicado.",
        "Una confirmación nombra lo que se ha hecho («Mensaje enviado al despacho»), no «Éxito».",
        "Los enlaces dicen adónde llevan; nunca «haz clic aquí» ni «leer más» a secas.",
        "Para buscadores y al compartir: un `<title>` de hasta 60 caracteres (qué es y después la marca), una descripción de 140 a 160 que suene a la voz y el mismo cuidado en el título para compartir.",
        "La lista de nunca del área vale en todas partes: también en textos alternativos, correos, avisos legales y páginas de error.",
        "El consentimiento y lo legal, en palabras llanas, y la opción que no le cuesta nada a quien lee, tan a mano como la otra.",
      ],
    },
  },
  "no-ai-slop": {
    area: "voice",
    en: {
      heading: "Build it: avoiding AI slop",
      lead: "How to write every word of the project, in the Voice and tone above, without the patterns that make a text read as generated.",
      setup: "Adapted from Peter Yang's `no-ai-slop` skill (MIT). An agent that takes skills can install the original, which also edits and audits drafts: `npx skills add petergyang/no-ai-slop --skill no-ai-slop --global --yes`. It holds for the site's copy and for anything written about the project.",
      defaults: ["Know who reads it and what they should do next before writing a line.", "Short sentences with a verb that acts; one idea in each.", "A fact, a name or a number wherever an adjective was going to go."],
      rules: [
        "Keep the voice the area describes: fix what sounds generated and leave what sounds like the brand, rough edges included. Never invent a claim, a figure or a quote to fill a gap: ask.",
        "The portability test: a sentence that could move unchanged to another company is filler. Replace it with a fact, a number, a name or what happens next, or cut it.",
        "Say the thing itself. No \"It is not X, it is Y\" and no \"Not an X. Not a Y. A Z.\": state the Y, or the Z.",
        "Start with the point. No opener that clears the throat or promises an insight (\"Here's the thing\", \"What nobody tells you\", \"Let's dive in\").",
        "No reveal after a colon (\"The best part: it learns\"). A colon is for a list, a label or a quote.",
        "Facts instead of importance: no \"marks a pivotal moment\", \"plays a vital role\" or \"stands as a testament\", and no clause in \"-ing\" at the end that pretends to explain (\"…, highlighting our commitment to quality\").",
        "Do not tell the reader what to notice or think (\"The key point is\", \"As you can see\", \"It is worth noting\"). Show it, and trust them.",
        "Name the source or cut the claim: no \"experts agree\" and no \"studies show\".",
        "Plain verbs in the active voice: \"is\", \"has\", \"tracks\", not \"serves as\" or \"has the ability to\". One word for one thing: do not rotate synonyms for style.",
        "No last line that tries to sound deep, and no closing paragraph that repeats the piece. End on the last concrete point or on the next step.",
        "Rhythm: no stacked fragments (\"That's it. That's the whole thing.\"), no question answered by itself, no list of three by reflex.",
        "Format follows the content: no emoji in headings, no bold scattered through a sentence, no bullets where two sentences read better. No em dashes in short copy.",
        "Words to cut: delve, foster, leverage, utilize, empower, streamline, robust, cutting-edge, seamless, game changer, paradigm shift, transformative, elevate, unlock, supercharge, harness, ever-evolving, tapestry, realm.",
        "Phrases that only delay the point: it's worth noting, at the end of the day, when it comes to, at its core, in today's world, the reality is, in order to, going forward.",
      ],
    },
    es: {
      heading: "Construirlo: evitar el AI slop",
      lead: "Cómo escribir cada palabra del proyecto, con la Voz y tono de arriba, sin los tics que hacen que un texto suene generado.",
      setup: "Adaptada de la skill `no-ai-slop` de Peter Yang (MIT). Un agente que acepte skills puede instalar la original, que además edita y audita borradores: `npx skills add petergyang/no-ai-slop --skill no-ai-slop --global --yes`. Vale para el copy de la web y para todo lo que se escriba sobre el proyecto.",
      defaults: ["Antes de escribir una línea, saber quién lee y qué debería hacer después.", "Frases cortas con un verbo que actúa; una idea en cada una.", "Un hecho, un nombre o una cifra allí donde iba a ir un adjetivo."],
      rules: [
        "Se conserva la voz que describe el área: se arregla lo que suena generado y se deja lo que suena a la marca, con sus aristas. Nunca se inventa un dato, una cifra ni una cita para rellenar un hueco: se pregunta.",
        "La prueba de la mudanza: una frase que podría irse tal cual a otra empresa es relleno. Se cambia por un hecho, una cifra, un nombre o lo que pasa después, o se quita.",
        "Se dice la cosa. Nada de «No es X, es Y» ni de «No es un X. No es un Y. Es un Z.»: se afirma Y, o Z.",
        "Se empieza por lo que se quiere decir. Sin arranques que carraspean o prometen una revelación («La cuestión es que», «Lo que nadie te cuenta», «Vamos a verlo»).",
        "Sin revelaciones tras dos puntos («Lo mejor: aprende solo»). Los dos puntos son para una lista, una etiqueta o una cita.",
        "Hechos en vez de importancia: sin «marca un antes y un después», «juega un papel clave» ni «es un referente», y sin gerundio final que finge explicar («…, reforzando nuestro compromiso con la calidad»).",
        "No se le dice a quien lee en qué fijarse ni qué pensar («La clave es», «Como puedes ver», «Cabe destacar»). Se muestra, y se confía en él.",
        "Se nombra la fuente o se quita la afirmación: sin «los expertos coinciden» ni «los estudios demuestran».",
        "Verbos llanos y en activa: «es», «tiene», «lleva», no «actúa como» ni «tiene la capacidad de». Una palabra para cada cosa: no se rotan sinónimos por estilo.",
        "Sin última frase que quiera sonar profunda y sin párrafo final que repita el texto. Se termina en lo último concreto o en el siguiente paso.",
        "Ritmo: sin fragmentos apilados («Eso es. Eso es todo.»), sin pregunta que se contesta sola, sin tríos por reflejo.",
        "El formato sigue al contenido: sin emojis en los títulos, sin negritas sueltas en mitad de la frase, sin viñetas donde dos frases se leen mejor. Sin rayas en textos cortos.",
        "Palabras que se quitan: potenciar, impulsar, optimizar, empoderar, revolucionar, transformador, innovador, disruptivo, de vanguardia, robusto, integral, holístico, sinergia, cambio de paradigma, llevar al siguiente nivel, sumergirse en, desbloquear.",
        "Frases que solo retrasan lo que se quiere decir: cabe destacar, es importante señalar, al fin y al cabo, a la hora de, en el mundo actual, la realidad es que, en definitiva, sin lugar a dudas.",
      ],
    },
  },
  a11y: {
    area: null, facts: touching(["color", "typography", "motion"]),
    en: {
      heading: "Build it: so that everyone can use it",
      lead: "How to build the whole system above so that it works with a keyboard, a screen reader, at any size and with reduced motion.",
      rules: [
        "HTML that means what it is: one `h1`, headings in order, `header`, `nav`, `main` and `footer`, a `button` for what does something and an `a` for what goes somewhere.",
        "Everything can be reached and used with the keyboard, in the order it is read. Focus is always visible: `:focus-visible` with a 2px ring in the accent, 2px away from the element.",
        "A dialog keeps the focus inside while it is open and gives it back to what opened it; Esc closes it.",
        "Contrast as the Colour area needs it: text at 4.5:1, large text and the edges of controls at 3:1. In both themes.",
        "What can be pressed measures 44 by 44px or more, with 8px between one and the next.",
        "With `prefers-reduced-motion`, nothing travels or scales; nothing flashes more than three times a second; anything that plays on its own can be paused.",
        "Every field has a `<label>`; its error is tied to it with `aria-describedby` and announced; the form never loses what was typed.",
        "Text grows to 200% and the page holds at 320px wide without sideways scroll. No text inside images. The page declares its `lang`.",
        "Before it ships: a pass with only the keyboard, a pass with a screen reader (VoiceOver or NVDA), and axe or Lighthouse without a critical issue.",
      ],
    },
    es: {
      heading: "Construirlo: que lo pueda usar cualquiera",
      lead: "Cómo construir todo el sistema de arriba para que funcione con teclado, con lector de pantalla, a cualquier tamaño y con movimiento reducido.",
      rules: [
        "HTML que significa lo que es: un solo `h1`, encabezados en orden, `header`, `nav`, `main` y `footer`, un `button` para lo que hace algo y un `a` para lo que lleva a un sitio.",
        "Todo se alcanza y se usa con el teclado, en el orden en que se lee. El foco siempre se ve: `:focus-visible` con un anillo de 2px en el color de acento, separado 2px del elemento.",
        "Un diálogo retiene el foco mientras está abierto y lo devuelve a lo que lo abrió; Esc lo cierra.",
        "Contraste como pide el área de Color: texto a 4,5:1, texto grande y bordes de controles a 3:1. En los dos temas.",
        "Lo que se puede pulsar mide 44 por 44px o más, con 8px entre uno y el siguiente.",
        "Con `prefers-reduced-motion`, nada se desplaza ni escala; nada parpadea más de tres veces por segundo; lo que se reproduce solo se puede pausar.",
        "Cada campo tiene su `<label>`; su error va unido con `aria-describedby` y se anuncia; el formulario nunca pierde lo escrito.",
        "El texto crece al 200% y la página aguanta a 320px de ancho sin scroll lateral. Nada de texto dentro de imágenes. La página declara su `lang`.",
        "Antes de publicar: una pasada solo con teclado, otra con lector de pantalla (VoiceOver o NVDA) y axe o Lighthouse sin ningún problema crítico.",
      ],
    },
  },
  tailwind: {
    area: null, facts: themeFacts,
    en: {
      heading: "Build it: the system as a Tailwind theme",
      lead: "How to carry the system above into Tailwind CSS, so that every utility comes out of what the team decided.",
      setup: "Tailwind 4 keeps its tokens in CSS: `@import \"tailwindcss\";` and an `@theme { … }` block. Every variable there becomes a utility (`--color-surface` gives `bg-surface`, `--font-display` gives `font-display`).",
      rules: [
        "Tokens are named for what they are for (`--color-accent`, `--color-surface`), not for how they look (`--color-red`).",
        "The areas' numbers go in the theme: families in `--font-*`, colours in `--color-*`, radii in `--radius-*`, the Motion curves in `--ease-*`, the spacing base in `--spacing`.",
        "No arbitrary values in components (`text-[17px]`, `bg-[#1a1a1a]`, `rounded-[13px]`): if one is needed, a token is missing and it goes in the theme.",
        "Dark and light by redefining the tokens under a selector (`[data-theme=\"dark\"]`), not by writing `dark:` on every element.",
        "What repeats becomes a component, not a pile of `@apply`. Variants with data attributes or a small helper (`cva`), merged with `tailwind-merge`.",
        "Components adapt to their room with container queries (`@container`, `@md:`); the page, with the breakpoints.",
        "Motion utilities use the theme's curves and durations, and every one has its `motion-reduce:` side.",
        "The Prettier plugin orders the classes, so two people write the same line the same way.",
      ],
    },
    es: {
      heading: "Construirlo: el sistema como tema de Tailwind",
      lead: "Cómo llevar el sistema de arriba a Tailwind CSS, para que cada utilidad salga de lo que decidió el equipo.",
      setup: "Tailwind 4 guarda sus tokens en CSS: `@import \"tailwindcss\";` y un bloque `@theme { … }`. Cada variable de ahí se convierte en una utilidad (`--color-surface` da `bg-surface`, `--font-display` da `font-display`).",
      rules: [
        "Los tokens se llaman por para qué sirven (`--color-accent`, `--color-surface`), no por cómo se ven (`--color-red`).",
        "Los números de las áreas van al tema: familias en `--font-*`, colores en `--color-*`, radios en `--radius-*`, las curvas de Movimiento en `--ease-*` y la base de espacios en `--spacing`.",
        "Sin valores arbitrarios en los componentes (`text-[17px]`, `bg-[#1a1a1a]`, `rounded-[13px]`): si hace falta uno, falta un token y va al tema.",
        "Oscuro y claro redefiniendo los tokens bajo un selector (`[data-theme=\"dark\"]`), no escribiendo `dark:` en cada elemento.",
        "Lo que se repite se convierte en componente, no en un montón de `@apply`. Variantes con atributos data o un ayudante pequeño (`cva`), fusionadas con `tailwind-merge`.",
        "Los componentes se adaptan a su hueco con container queries (`@container`, `@md:`); la página, con los puntos de corte.",
        "Las utilidades de movimiento usan las curvas y duraciones del tema, y cada una tiene su lado `motion-reduce:`.",
        "El plugin de Prettier ordena las clases, para que dos personas escriban la misma línea igual.",
      ],
    },
  },
};

/** The section one of these skills adds to criterio.md */
export function moreSkillSection(id: MoreSkill, system: ProjectSystem, lang: Lang): { id: string; heading: string; lines: string[] } {
  const def = SKILLS[id];
  const s = def[lang];
  const c = COMMON[lang];
  const area = def.area ? AREAS[lang][def.area] : null;
  const a = def.area ? areaOf(system, def.area) : undefined;
  const L: string[] = [`> ${c.on(s.lead, area)}`, "", `### ${c.project}`, ""];
  if (def.area && area) {
    if (a?.decision) L.push(`**${c.decided(area)}:** ${oneLine(a.decision)}`, "");
    else L.push(`_${c.open(area)}_`, "");
  }
  const facts = def.facts?.(system, lang) ?? [];
  L.push(...facts);
  const never = (a?.never ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (never.length && area) L.push(`**${c.never(area)}:**`, ...never.map((l) => `- ${l}`), "");
  // The defaults only stand in for what the project has not said yet
  if (s.defaults?.length && !facts.length && !a?.decision) L.push(`**${c.defaults}:**`, ...s.defaults.map((r) => `- ${r}`), "");
  // A crossing skill with nothing decided yet has no project half
  if (L[L.length - 2] === `### ${c.project}`) L.splice(L.length - 2, 2);
  L.push(`### ${c.craft}`, "", ...(s.setup ? [s.setup, ""] : []), ...s.rules.map((r) => `- ${r}`));
  return { id: `skill:${id}`, heading: s.heading, lines: L };
}
