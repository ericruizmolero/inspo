// The connector's prompts: the flows on top of its tools (lib/mcp/tools.ts), which a client offers the person
// as commands. The connector is the transport, with few tools; what a team does with it (bring in what it already
// has, review a design) is told here, in words, and runs on the person's own model.
// Each prompt is written in the person's language.
import "server-only";
import type { Locale } from "../i18n/locale";

interface PromptArg { name: string; description: string; required?: boolean }
interface PromptText { title: string; description: string; args: PromptArg[]; text: (a: Record<string, string>) => string }
type PromptDef = Record<Locale, PromptText>;

const projectArg = (locale: Locale, required = false): PromptArg => ({
  name: "project",
  description: locale === "es" ? "El proyecto de Criterio (su nombre)" : "The criterio project (its name)",
  required,
});
/** How each prompt opens: which project, said or still to find out */
const which = (locale: Locale, project: string | undefined) => project?.trim()
  ? (locale === "es" ? `El proyecto de Criterio es "${project.trim()}".` : `The criterio project is "${project.trim()}".`)
  : (locale === "es" ? "Si no sabes de qué proyecto de Criterio hablo, llama a list_projects y pregúntame cuál." : "If you do not know which criterio project I mean, call list_projects and ask me.");

const PROMPTS: Record<string, PromptDef> = {
  design_with_criterio: {
    en: {
      title: "Design with the criterio",
      description: "Start a piece of work from the project's criterio.md.",
      args: [projectArg("en"), { name: "task", description: "What you are going to make" }],
      text: (a) => [
        which("en", a.project),
        a.task?.trim() ? `I want to make this: ${a.task.trim()}` : "Ask me what we are making if I have not said it.",
        "",
        "1. Read only what the task touches: call read_criterio once per area it involves, with that area as the section (each comes with the file's head and its \"How to use this file\" rules). Read section \"decisions\" only if you need the brand's tokens or most of the areas. Ask for more (one reference with read_reference, the whole file with section \"all\") only when the task needs it.",
        "2. Work from it as \"How to use this file\" says. Required: the brand's values and every Never line; use the values exactly and never break a Never. Direction: each area's decision; follow it, adapt it to the task, never contradict it. Guidance: the references are inspiration to read the intent from, never something to copy (their layout, copy, images and logos stay theirs).",
        "3. Where an area is open, or the criterio does not cover something you need, stop and ask me. Do not fill the gap with a default.",
        "4. As you work, say which decision each choice follows, in a few words.",
        "5. When I say it is done, offer to propose with propose_decision anything we decided along the way that the criterio did not say yet.",
      ].join("\n"),
    },
    es: {
      title: "Diseñar con el criterio",
      description: "Empieza un trabajo desde el criterio.md del proyecto.",
      args: [projectArg("es"), { name: "task", description: "Qué vas a hacer" }],
      text: (a) => [
        which("es", a.project),
        a.task?.trim() ? `Quiero hacer esto: ${a.task.trim()}` : "Pregúntame qué vamos a hacer si no lo he dicho.",
        "",
        "1. Lee solo lo que toca la tarea: llama a read_criterio una vez por cada área que toque, con esa área como sección (cada una llega con la cabecera del archivo y sus reglas de \"Cómo usar este archivo\"). Lee la sección \"decisions\" solo si necesitas los tokens de la marca o casi todas las áreas. Pide más (una referencia con read_reference, el archivo entero con la sección \"all\") solo cuando la tarea lo necesite.",
        "2. Trabaja desde ahí como dice \"Cómo usar este archivo\". Obligatorio: los valores de la marca y cada línea de Nunca; usa los valores tal cual y no rompas nunca un Nunca. Dirección: la decisión de cada área; síguela, adáptala a la tarea, no la contradigas. Orientación: las referencias son inspiración para leer la intención, nunca algo que copiar (su maquetación, su texto, sus imágenes y sus logos son suyos).",
        "3. Donde un área esté abierta, o el criterio no cubra algo que necesitas, para y pregúntame. No rellenes el hueco con un valor por defecto.",
        "4. Mientras trabajas, di en pocas palabras qué decisión sigue cada elección.",
        "5. Cuando te diga que está terminado, ofréceme proponer con propose_decision lo que hayamos decidido por el camino y el criterio aún no dijera.",
      ].join("\n"),
    },
  },
  import_existing: {
    en: {
      title: "Bring in what we already have",
      description: "Turn an existing brand or product (a repo, a Figma file, a site, guidelines) into references and proposals in criterio.",
      args: [projectArg("en"), { name: "source", description: "Where it is: this repo, a Figma file, a site, a folder of guidelines" }],
      text: (a) => [
        which("en", a.project),
        a.source?.trim() ? `What we already have is here: ${a.source.trim()}` : "What we already have is in what you can reach from here (this repo, the files and tools you have open). Ask me where to look if it is not clear.",
        "",
        "The goal: criterio should hold what this team already decided, so the next piece of work starts from it instead of from nothing.",
        "",
        "1. Read what is in criterio first: read_criterio and list_references. Do not bring in again what is there.",
        "2. Go through the source and collect, area by area (typography, color, layout, motion, iconography, logo, imagery, voice), what is actually decided there: typefaces and their scale, the palette with its values and what each color is for, spacing and grid, easings and durations, icon set, logo rules, the kind of imagery, how the copy sounds. Take it from the real thing (tokens, CSS variables, component code, the guideline's own words), not from how it looks to you.",
        "3. Show me a plan before writing anything, as two short lists: (a) the references you would add (the live site, key pages, the guideline as a text, the images that carry the look), each with a one-line note; (b) one proposal per area that has enough behind it, with the decision as you would write it.",
        "4. After my yes, add the references with add_reference (set their areas) and send each proposal with propose_decision, with a reason that says where it was read from. Leave out any area the source says nothing about.",
        "5. Finish by telling me what is waiting for the team's answer in criterio and which areas are still open.",
        "",
        "Write decisions as rules someone can apply (names and values), in the language the criterio is written in. If two parts of the source contradict each other, tell me instead of picking one.",
      ].join("\n"),
    },
    es: {
      title: "Traer lo que ya tenemos",
      description: "Convierte una marca o un producto que ya existe (un repo, un Figma, una web, unas guías) en referencias y propuestas en Criterio.",
      args: [projectArg("es"), { name: "source", description: "Dónde está: este repo, un archivo de Figma, una web, una carpeta de guías" }],
      text: (a) => [
        which("es", a.project),
        a.source?.trim() ? `Lo que ya tenemos está aquí: ${a.source.trim()}` : "Lo que ya tenemos está en lo que alcanzas desde aquí (este repo, los archivos y herramientas que tienes abiertos). Pregúntame dónde mirar si no está claro.",
        "",
        "El objetivo: que Criterio tenga lo que este equipo ya decidió, para que el siguiente trabajo empiece desde ahí y no desde cero.",
        "",
        "1. Lee primero lo que hay en Criterio: read_criterio y list_references. No traigas otra vez lo que ya está.",
        "2. Recorre la fuente y recoge, área por área (tipografía, color, layout, movimiento, iconografía, logo, imagen, voz), lo que de verdad está decidido ahí: las fuentes y su escala, la paleta con sus valores y para qué sirve cada color, espaciado y retícula, curvas y duraciones, el set de iconos, las reglas del logo, el tipo de imagen, cómo suena el texto. Sácalo de lo real (tokens, variables CSS, código de componentes, las palabras de la propia guía), no de cómo te parece que se ve.",
        "3. Enséñame un plan antes de escribir nada, en dos listas cortas: (a) las referencias que añadirías (la web en producción, páginas clave, la guía como texto, las imágenes que llevan el estilo), cada una con una nota de una línea; (b) una propuesta por cada área que tenga suficiente detrás, con la decisión tal como la escribirías.",
        "4. Cuando te diga que sí, añade las referencias con add_reference (con sus áreas) y manda cada propuesta con propose_decision, con un motivo que diga de dónde se ha leído. Deja fuera las áreas de las que la fuente no diga nada.",
        "5. Termina diciéndome qué queda esperando la respuesta del equipo en Criterio y qué áreas siguen abiertas.",
        "",
        "Escribe las decisiones como reglas que alguien pueda aplicar (nombres y valores), en el idioma en que está escrito el criterio. Si dos partes de la fuente se contradicen, dímelo en vez de elegir una.",
      ].join("\n"),
    },
  },
  extract_references: {
    en: {
      title: "Keep the references from this conversation",
      description: "Go through this conversation and save what was used as a reference, and what was decided, in criterio.",
      args: [projectArg("en")],
      text: (a) => [
        which("en", a.project),
        "",
        "Go through this conversation from the start and pick out what belongs in the project's criterio:",
        "- References: every site, page, video, post or image I pointed at as something to look like, learn from or avoid; and every text I pasted that the project should keep whole (a brief, copy, guidelines).",
        "- Decisions: what we settled about typography, color, layout, motion, iconography, logo, imagery or voice. Only what was actually settled, in my words where you can, not what you suggested and I did not answer.",
        "",
        "1. Call list_references so nothing is saved twice, and read_criterio (section \"decisions\") to see what each area says today.",
        "2. Show me both lists before writing anything: each reference with a one-line note (why it came up, what to take from it, or what to avoid) and its areas; each decision with its area.",
        "3. After my yes, save the references with add_reference and send each decision with propose_decision, one per area, with a reason that says it comes from this conversation.",
        "4. Tell me what was saved and what is waiting for the team's answer.",
        "",
        "A reference I rejected is still worth keeping if I said why: say so in its note.",
      ].join("\n"),
    },
    es: {
      title: "Guardar las referencias de esta conversación",
      description: "Recorre esta conversación y guarda en Criterio lo que se usó como referencia y lo que se decidió.",
      args: [projectArg("es")],
      text: (a) => [
        which("es", a.project),
        "",
        "Recorre esta conversación desde el principio y saca lo que debe estar en el criterio del proyecto:",
        "- Referencias: cada web, página, vídeo, post o imagen que señalé como algo a lo que parecerse, de lo que aprender o que evitar; y cada texto que pegué y que el proyecto debe conservar entero (un brief, un copy, unas guías).",
        "- Decisiones: lo que dejamos cerrado sobre tipografía, color, layout, movimiento, iconografía, logo, imagen o voz. Solo lo que quedó cerrado de verdad, con mis palabras cuando puedas, no lo que sugeriste y no contesté.",
        "",
        "1. Llama a list_references para no guardar nada dos veces, y a read_criterio (sección \"decisions\") para ver qué dice hoy cada área.",
        "2. Enséñame las dos listas antes de escribir nada: cada referencia con una nota de una línea (por qué salió, qué coger de ella o qué evitar) y sus áreas; cada decisión con su área.",
        "3. Cuando te diga que sí, guarda las referencias con add_reference y manda cada decisión con propose_decision, una por área, con un motivo que diga que sale de esta conversación.",
        "4. Dime qué se ha guardado y qué queda esperando la respuesta del equipo.",
        "",
        "Una referencia que rechacé también merece guardarse si dije por qué: dilo en su nota.",
      ].join("\n"),
    },
  },
  review_against_criterio: {
    en: {
      title: "Review against the criterio",
      description: "Check a design, a page or a piece of code against the project's criterio.md, area by area.",
      args: [projectArg("en"), { name: "what", description: "What to review: a URL, a file, a component, or what is on screen" }],
      text: (a) => [
        which("en", a.project),
        a.what?.trim() ? `Review this: ${a.what.trim()}` : "Review what we are working on here. Ask me what exactly if it is not clear.",
        "",
        "1. Call read_criterio for the project: each area the work touches, by area, or section \"decisions\" when it touches most of them. Read its \"How to use this file\" first: it says which lines are required and which are direction.",
        "2. Look at the real thing (the code, the rendered page, the file), not at a description of it.",
        "3. Answer with the breaches, grouped by area, only for the areas the work touches. For each one:",
        "   - the sentence of the criterio it breaks, quoted;",
        "   - where: file and line, element, or value;",
        "   - whether it breaks a required rule (a brand value or a Never line) or a direction (an area's decision);",
        "   - the fix, in one line.",
        "   Copying a reference (its layout, copy, images or logo) is a breach too: name the reference. An area with no breach gets one line that says so.",
        "4. Then \"Not covered\": what the work had to decide that the criterio does not say.",
        "5. If something there is worth deciding, end with the propose_decision call you would make, ready to send: the area and the decision text. Do not send it until I say yes.",
        "",
        "Do not change the work, and write nothing in criterio in this review without my yes.",
      ].join("\n"),
    },
    es: {
      title: "Revisar contra el criterio",
      description: "Comprueba un diseño, una página o un código contra el criterio.md del proyecto, área por área.",
      args: [projectArg("es"), { name: "what", description: "Qué revisar: una URL, un archivo, un componente o lo que hay en pantalla" }],
      text: (a) => [
        which("es", a.project),
        a.what?.trim() ? `Revisa esto: ${a.what.trim()}` : "Revisa lo que estamos haciendo aquí. Pregúntame qué exactamente si no está claro.",
        "",
        "1. Llama a read_criterio para el proyecto: cada área que toque el trabajo, por área, o la sección \"decisions\" si toca casi todas. Lee primero su \"Cómo usar este archivo\": dice qué líneas son obligatorias y cuáles son dirección.",
        "2. Mira lo real (el código, la página renderizada, el archivo), no una descripción.",
        "3. Responde con los incumplimientos, agrupados por área, solo en las áreas que el trabajo toca. Para cada uno:",
        "   - la frase del criterio que rompe, citada;",
        "   - dónde: archivo y línea, elemento o valor;",
        "   - si rompe una regla obligatoria (un valor de la marca o una línea de Nunca) o una dirección (la decisión de un área);",
        "   - cómo arreglarlo, en una línea.",
        "   Copiar una referencia (su maquetación, su texto, sus imágenes o su logo) también es un incumplimiento: di cuál. Un área sin incumplimientos lleva una línea que lo diga.",
        "4. Después, \"Sin cubrir\": lo que el trabajo ha tenido que decidir y el criterio no dice.",
        "5. Si algo de ahí merece decidirse, termina con la llamada a propose_decision que harías, lista para mandar: el área y el texto de la decisión. No la mandes hasta que te diga que sí.",
        "",
        "No cambies el trabajo, y no escribas nada en Criterio en esta revisión sin mi sí.",
      ].join("\n"),
    },
  },
};

export const promptList = (locale: Locale) => Object.entries(PROMPTS).map(([name, p]) => ({
  name, title: p[locale].title, description: p[locale].description,
  arguments: p[locale].args.map((a) => ({ name: a.name, description: a.description, required: !!a.required })),
}));

/** A prompt as the client sends it to its model, or null when there is none by that name */
export function promptGet(name: string, args: Record<string, unknown> | undefined, locale: Locale) {
  const p = PROMPTS[name]?.[locale];
  if (!p) return null;
  const given = Object.fromEntries(Object.entries(args ?? {}).filter(([, v]) => typeof v === "string").map(([k, v]) => [k, (v as string).slice(0, 600)]));
  return { description: p.description, messages: [{ role: "user" as const, content: { type: "text" as const, text: p.text(given) } }] };
}
