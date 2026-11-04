// More skills for criterio.md (see lib/md-skills.ts, which lists them and writes the GSAP one). One per area and
// two that cross them all. Each is written the same way: first the project (the area's decision, what the team
// kept in its curation, its never list), then the craft, the same for every project. Plain data in, lines out.
import type { Brief } from "@/types/brief";
import type { ProjectSystem, SystemArea, SystemAreaState } from "@/types/system";

type Lang = "en" | "es";

/** In the order the file has them: the areas' order, then the ones that cross them */
export const MORE_SKILLS = ["fonts", "color-tokens", "grid", "transitions", "images", "copy", "no-ui-slop", "a11y", "tailwind"] as const;
export type MoreSkill = (typeof MORE_SKILLS)[number];

export interface SkillText {
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
  facts?: (system: ProjectSystem, lang: Lang, brief?: Brief | null) => string[];
}

export const AREAS: Record<Lang, Record<SystemArea, string>> = {
  en: { typography: "Typography", color: "Colour", layout: "Layout", motion: "Motion", iconography: "Iconography", logo: "Logo", imagery: "Imagery", voice: "Voice and tone" },
  es: { typography: "Tipografía", color: "Color", layout: "Layout", motion: "Movimiento", iconography: "Iconografía", logo: "Logo", imagery: "Imagen", voice: "Voz y tono" },
};
const COMMON = {
  en: {
    on: (what: string, area: string | null) => `Switched on in criterio.design. ${what}${area ? ` The ${area} area rules: where it and this section disagree, the area wins.` : " The areas rule: where one and this section disagree, the area wins."}`,
    project: "This project", rejected: "What the areas already rule out", decided: (area: string) => `${area}, as decided`, open: (area: string) => `The ${area} area is still open. Use the defaults below until the team decides.`,
    never: (area: string) => `Never (from the ${area} area)`, defaults: "Defaults, while the area names no numbers", craft: "The craft",
    families: "Families the team kept", colors: "The colours the team kept, as tokens to start from", numbers: "Measures the decision names", theme: "The system so far, as a theme to start from", touches: "What the system decides that this touches",
  },
  es: {
    on: (what: string, area: string | null) => `Activado en criterio.design. ${what}${area ? ` Manda el área de ${area}: si esta sección y ella no coinciden, gana el área.` : " Mandan las áreas: si una y esta sección no coinciden, gana el área."}`,
    project: "Este proyecto", rejected: "Lo que las áreas ya descartan", decided: (area: string) => `${area}, tal como se ha decidido`, open: (area: string) => `El área de ${area} sigue abierta. Usa los valores por defecto de abajo hasta que el equipo decida.`,
    never: (area: string) => `Nunca (del área de ${area})`, defaults: "Valores por defecto, mientras el área no dé números", craft: "El oficio",
    families: "Familias que el equipo se quedó", colors: "Los colores que el equipo se quedó, como tokens de partida", numbers: "Medidas que nombra la decisión", theme: "El sistema hasta ahora, como tema de partida", touches: "Lo que decide el sistema y esto toca",
  },
} satisfies Record<Lang, unknown>;

// ─── What the project already holds ──────────────────────────────────────────────────────────────

const areaOf = (system: ProjectSystem, area: SystemArea) => system.areas.find((a) => a.area === area);
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const firstSentence = (s: string) => { const t = oneLine(s); const m = t.match(/^.*?[.!?](?=\s|$)/); return m ? m[0] : t; };
/** What every area of the project already rules out, one line each under its area's name: the generic rules below
 *  hold in every project, these are this project's own */
function rejectFacts(system: ProjectSystem, lang: Lang): string[] {
  const out: string[] = [];
  for (const area of Object.keys(AREAS[lang]) as SystemArea[]) {
    const never = (areaOf(system, area)?.never ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    for (const l of never) out.push(`- **${AREAS[lang][area]}:** ${l}`);
  }
  return out.length ? [`**${COMMON[lang].rejected}:**`, ...out, ""] : [];
}

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

/** Each skill's area and craft, exported so the agent-skill files are built from the same text (lib/md-skills.ts skillCraft) */

/** Copy decides a landing, so the file carries it and it starts switched on. The rules for the small words and against
 *  generated text are the last two steps of one way of writing, not two more switches. Adapted from Peter Yang's
 *  no-ai-slop (MIT) */
const COPY_WORDS = {
  en: [
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
  es: [
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
};
const COPY_SLOP = {
  en: [
        "Keep the voice the area describes: fix what sounds generated and leave what sounds like the brand, rough edges included. Never invent a claim, a figure or a quote: mark it.",
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
  es: [
        "Se conserva la voz que describe el área: se arregla lo que suena generado y se deja lo que suena a la marca, con sus aristas. Nunca se inventa un dato, una cifra ni una cita para rellenar un hueco: se marca.",
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
};

/** What the project already said that the copy needs: the person's answers, what was corrected, and the landing's plan */
function copyFacts(system: ProjectSystem, lang: Lang, brief?: Brief | null): string[] {
  const t = lang === "es"
    ? { audience: "A quién se dirige", why: "Por qué este y no otro", proof: "Pruebas que se pueden usar, y ninguna más", seconds: "Qué debe entender en 5 segundos", never: "Lo que nunca diría", noProof: "Aún no hay pruebas: marca lo que necesite una.", goal: "Objetivo", learned: "Lo que ya se corrigió" }
    : { audience: "Who it speaks to", why: "Why this and not another", proof: "Proof that can be used, and no other", seconds: "What to grasp in 5 seconds", never: "What it would never say", noProof: "No proof yet: mark whatever needs it.", goal: "Goal", learned: "What was already corrected" };
  const said = (id: string) => brief?.answers?.[id]?.text;
  const L: string[] = [];
  const add = (label: string, text: string | undefined) => { if (text?.trim()) L.push(`**${label}:** ${oneLine(text)}`, ""); };
  add(t.goal, said("goal"));
  add(t.audience, said("audience"));
  add(t.seconds, said("first-seconds") ?? brief?.firstSeconds);
  add(t.why, said("why-us"));
  if (said("proof")) add(t.proof, said("proof")); else if (brief) L.push(`_${t.noProof}_`, "");
  add(t.never, said("never-say") ?? brief?.neverSay);
  const voice = (system.learned ?? []).filter((l) => l.area === "voice").slice(0, 8);
  if (voice.length) L.push(`**${t.learned}:**`, ...voice.map((l) => `- ${l.section ? `(${l.section}) ` : ""}${oneLine(l.note)}`), "");
  return L;
}

export const MORE_SKILL_DEFS: Record<MoreSkill, SkillDef> = {
  copy: {
    area: "voice",
    facts: copyFacts,
    en: {
      heading: "Build it: write the copy",
      lead: "How to write the landing, section by section, so that every word serves its goal, in the Voice and tone above and without the patterns of generated text.",
      setup: "Adapted from Peter Yang's `no-ai-slop` skill (MIT). It holds for the site's copy and for anything written about the project.",
      defaults: ["Know who reads it and what they should do next before writing a line.", "Short sentences with a verb that acts; one idea in each.", "A fact, a name or a number wherever an adjective was going to go."],
      rules: [
        "Read the real text first: the current site, the project's own texts, the person's answers. Their words win over yours, and what the client wrote stays literal where the Voice area says so.",
        "Write from the goal. The headline says what the visitor gets, in their words, so they know within seconds if this is for them. Each section then does its job from the outline: name the problem, remove a doubt, prove the claim, ask for the action. A line that does none of these goes.",
        "One primary action, the same one through the page, in words that say what happens next.",
        "Always write a real draft. A missing answer is no reason to leave a headline or a section empty. Mark only a fact you cannot back, as `[proof needed: what]`, and never invent a figure, a client or a quote. Show the person each mark at the end.",
        "A correction from the person is kept: with the connector, record_learning with area voice and the section, so the next landing starts from it.",
...COPY_WORDS.en,
...COPY_SLOP.en,
      ],
    },
    es: {
      heading: "Construirlo: escribir el copy",
      lead: "Cómo escribir la landing, sección a sección, para que cada palabra sirva a su objetivo, con la Voz y tono de arriba y sin los tics del texto generado.",
      setup: "Adaptada de la skill `no-ai-slop` de Peter Yang (MIT). Vale para el copy de la web y para todo lo que se escriba sobre el proyecto.",
      defaults: ["Saber quién lo lee y qué debe hacer después antes de escribir una línea.", "Frases cortas con un verbo que actúa; una idea en cada una.", "Un dato, un nombre o una cifra donde iba a ir un adjetivo."],
      rules: [
        "Lee primero el texto real: la web actual, los textos del proyecto, las respuestas de la persona. Sus palabras ganan a las tuyas, y lo que escribió el cliente se queda literal donde el área de Voz lo diga.",
        "Escribe desde el objetivo. El titular dice lo que se lleva quien visita, con sus palabras, para que en segundos sepa si es para él. Cada sección hace después su trabajo del esquema: nombrar el problema, quitar una duda, probar lo que se afirma, pedir la acción. Una línea que no hace nada de esto sobra.",
        "Una sola acción principal, la misma en toda la página, con palabras que digan qué pasa después.",
        "Escribe siempre un borrador real. Que falte una respuesta no es motivo para dejar vacío un titular o una sección. Marca solo un dato que no puedas respaldar, como `[falta prueba: qué]`, y nunca inventes una cifra, un cliente o una cita. Enseña cada marca a la persona al final.",
        "Una corrección de la persona se guarda: con el conector, record_learning con el área voz y la sección, para que la siguiente landing empiece desde ahí.",
...COPY_WORDS.es,
...COPY_SLOP.es,
      ],
    },
  },
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
      setup: "Nothing to install. Put each curve and duration the area gives in a token named for its job, not for the curve type (`--ease-fall`, `--ease-reveal`, `--dur-fast`), and use only those. If the area names a GSAP ease, write its cubic-bezier equivalent.",
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
      setup: "No hay nada que instalar. Pon cada curva y duración que dé el área en un token con nombre por su función, no por el tipo de curva (`--ease-caida`, `--ease-aparicion`, `--dur-fast`), y usa solo esos. Si el área nombra una curva de GSAP, escribe su equivalente en cubic-bezier.",
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
  "no-ui-slop": {
    area: null,
    facts: rejectFacts,
    en: {
      heading: "Build it: avoiding UI slop",
      lead: "How to build every screen of the project without the habits that make an interface read as generated. Each rule has an id, a strength (MUST, NEVER, SHOULD) and the reason; cite the id when you keep or break one.",
      setup: "Adapted from the anti-slop rules of design.how's Glaze system, with the project's own never lists above. Where a rule and an area disagree, the area wins.",
      defaults: [],
      rules: [
        "`ui-earn-the-card` MUST: group with spacing first; a card only around one thing a person acts on, and never a card inside a card. Because every box asks to be read as a separate thing.",
        "`ui-no-stat-cards` NEVER: a row of equal cards that each hold one number. Because equal boxes make every number equally loud. Correct: one sentence stating the figures, or a table. Wrong: three labelled tiles.",
        "`ui-no-icon-tiles` NEVER: an icon in a tinted tile or circle beside a heading. Because the tile adds nothing and looks like a button.",
        "`ui-no-side-rail` NEVER: a coloured bar on one edge of a card, row or message. Because the bar implies a status nobody defined.",
        "`ui-no-status-dots` NEVER: a small round dot alone for status, unread counts or series. Because a dot relies on hue only. Correct: a glyph and a word.",
        "`ui-no-eyebrow` NEVER: a small label, category or number above a title. Because the heading already names the section.",
        "`ui-no-caps` NEVER: capitals or letter-spacing on text, unless the Typography area asks for it. Because capitals are slower to read and louder than the page needs.",
        "`ui-no-decoration` NEVER: gradients, blobs, glows, dot or grid backgrounds and backdrop blur, unless an area decides them. Because decoration competes with the one action of the screen.",
        "`ui-no-shadow-reflex` NEVER: a shadow to make a card or menu stand out. Because depth is better drawn with spacing, a line or a tone from the palette.",
        "`ui-one-primary` MUST: at most one primary action in a card, footer, dialog or row of actions; the rest are quiet. Because two loud buttons side by side split the eye. Correct: `Not now` quiet, `Join` primary.",
        "`ui-no-mono-cosplay` NEVER: monospace for labels, headings or numbers; only for values a person copies, such as ids and code. Because mono as a costume reads as a template.",
        "`ui-no-emoji` NEVER: emoji in copy, titles, buttons or as icons. Because they render differently on every device and make a tool read as a chat.",
        "`ui-no-fake-data` SHOULD: believable sample data. No lorem ipsum, no `John Doe`, no round filler numbers. Because they hide truncation and alignment problems.",
        "`ui-no-scroll-reveal` NEVER: content that fades or slides in as it scrolls into view, unless the Motion area decides it. Because what stays hidden until scrolled can be missed and costs reading time.",
        "`ui-no-stream-effects` NEVER: blinking cursors, shimmer sweeps or per-word fades on streamed answers. Because they slow reading and make the layout jitter.",
        "`ui-actions-name-the-object` MUST: a verb and its object on every action, in sentence case. Correct: `Run eval`. Wrong: `OK`, `Submit`.",
        "When a need is not covered by this file, an area or these rules: stop and say so. Never invent a token, a colour, a component or a pattern to fill the gap.",
      ],
    },
    es: {
      heading: "Construirlo: evitar el UI slop",
      lead: "Cómo construir cada pantalla del proyecto sin los vicios que hacen que una interfaz parezca generada. Cada regla tiene un id, una fuerza (MUST, NEVER, SHOULD) y su porqué; cita el id cuando mantengas o rompas una.",
      setup: "Adaptada de las reglas anti-slop del sistema Glaze de design.how, con las listas de nunca del propio proyecto arriba. Donde una regla y un área no coincidan, gana el área.",
      defaults: [],
      rules: [
        "`ui-earn-the-card` MUST: se agrupa primero con espacio; una tarjeta solo alrededor de algo sobre lo que la persona actúa, y nunca una tarjeta dentro de otra. Porque cada caja pide leerse como una cosa aparte.",
        "`ui-no-stat-cards` NEVER: una fila de tarjetas iguales con un número cada una. Porque cajas iguales hacen que todos los números griten igual. Bien: una frase con las cifras, o una tabla. Mal: tres teselas con etiqueta.",
        "`ui-no-icon-tiles` NEVER: un icono en una tesela o círculo teñido junto a un título. Porque la tesela no aporta nada y parece un botón.",
        "`ui-no-side-rail` NEVER: una barra de color en un borde de una tarjeta, fila o mensaje. Porque la barra insinúa un estado que nadie ha definido.",
        "`ui-no-status-dots` NEVER: un punto redondo solo para estados, contadores o series. Porque un punto depende solo del tono. Bien: un glifo y una palabra.",
        "`ui-no-eyebrow` NEVER: una etiqueta pequeña, categoría o número encima de un título. Porque el título ya nombra la sección.",
        "`ui-no-caps` NEVER: mayúsculas ni espaciado de letras en el texto, salvo que lo pida el área de Tipografía. Porque las mayúsculas se leen más despacio y gritan más de lo que la página necesita.",
        "`ui-no-decoration` NEVER: degradados, manchas, resplandores, fondos de puntos o rejilla y desenfoque de fondo, salvo que un área los decida. Porque la decoración compite con la única acción de la pantalla.",
        "`ui-no-shadow-reflex` NEVER: una sombra para que una tarjeta o un menú destaque. Porque la profundidad se dibuja mejor con espacio, una línea o un tono de la paleta.",
        "`ui-one-primary` MUST: como mucho una acción principal en una tarjeta, pie, diálogo o fila de acciones; las demás, discretas. Porque dos botones fuertes juntos parten la mirada. Bien: `Ahora no` discreto, `Unirme` principal.",
        "`ui-no-mono-cosplay` NEVER: monoespaciada en etiquetas, títulos o números; solo en valores que alguien copia, como ids y código. Porque la mono de disfraz parece una plantilla.",
        "`ui-no-emoji` NEVER: emoji en textos, títulos, botones ni como iconos. Porque se ven distinto en cada dispositivo y hacen que una herramienta parezca un chat.",
        "`ui-no-fake-data` SHOULD: datos de muestra creíbles. Sin lorem ipsum, sin `Juan Pérez`, sin cifras redondas de relleno. Porque esconden los problemas de truncado y alineación.",
        "`ui-no-scroll-reveal` NEVER: contenido que aparece con un fundido o deslizándose al entrar en pantalla, salvo que lo decida el área de Movimiento. Porque lo que sigue oculto hasta hacer scroll se puede perder y cuesta tiempo de lectura.",
        "`ui-no-stream-effects` NEVER: cursores parpadeantes, brillos que barren ni fundidos palabra a palabra en respuestas que llegan en directo. Porque frenan la lectura y hacen saltar el layout.",
        "`ui-actions-name-the-object` MUST: un verbo con su objeto en cada acción, en minúscula tras la inicial. Bien: `Lanzar evaluación`. Mal: `Aceptar`, `Enviar`.",
        "Cuando una necesidad no la cubre este fichero, un área ni estas reglas: se para y se dice. Nunca se inventa un token, un color, un componente ni un patrón para rellenar el hueco.",
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
export function moreSkillSection(id: MoreSkill, system: ProjectSystem, lang: Lang, brief?: Brief | null): { id: string; heading: string; lines: string[] } {
  const def = MORE_SKILL_DEFS[id];
  const s = def[lang];
  const c = COMMON[lang];
  const area = def.area ? AREAS[lang][def.area] : null;
  const a = def.area ? areaOf(system, def.area) : undefined;
  const L: string[] = [`> ${c.on(s.lead, area)}`, "", `### ${c.project}`, ""];
  if (def.area && area) {
    if (a?.decision) L.push(`**${c.decided(area)}:** ${oneLine(a.decision)}`, "");
    else L.push(`_${c.open(area)}_`, "");
  }
  const facts = def.facts?.(system, lang, brief) ?? [];
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
