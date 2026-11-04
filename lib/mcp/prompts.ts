// The connector's prompts: the flows on top of its tools (lib/mcp/tools.ts), which a client offers the person
// as commands. The connector is the transport, with few tools; what a team does with it (bring in what it already
// has, review a design) is told here, in words, and runs on the person's own model.
// Each prompt is written in the person's language.
import "server-only";
import type { Locale } from "../i18n/locale";
import { TINO_VOICE } from "./tools-voice";

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
  setup_project: {
    en: {
      title: "Set up criterio",
      description: "Start a project in criterio, or continue one, from here: the agent reads what exists, asks what it cannot know, and writes the criterio.md.",
      args: [projectArg("en")],
      text: (a) => [
        which("en", a.project),
        "Set up this project in criterio with me. Call start_setup and follow it: its answer says what to do next, and every tool you use after it does too. One step at a time, and do not repeat what is already there.",
        TINO_VOICE,
      ].join("\n"),
    },
    es: {
      title: "Poner en marcha Criterio",
      description: "Empieza un proyecto en Criterio, o sigue uno, desde aquí: el agente lee lo que hay, pregunta lo que no puede saber y escribe el criterio.md.",
      args: [projectArg("es")],
      text: (a) => [
        which("es", a.project),
        "Pon en marcha este proyecto en Criterio conmigo. Llama a start_setup y síguelo: su respuesta dice qué hacer después, y también la de cada herramienta que uses tras ella. Un paso cada vez, sin repetir lo que ya esté.",
        TINO_VOICE,
      ].join("\n"),
    },
  },
  design_with_criterio: {
    en: {
      title: "Design with the criterio",
      description: "Start a piece of work from the project's criterio.md, following the phases of its Start here.",
      args: [projectArg("en"), { name: "task", description: "What you are going to make" }],
      text: (a) => [
        which("en", a.project),
        a.task?.trim() ? `I want to make this: ${a.task.trim()}` : "If I have not said what we are making, offer me what the criterio's Start here lists and let me pick.",
        "",
        "Call read_criterio with section \"guide\" first and follow its Start here: the session loop, phase by phase, stopping at each checkpoint. It says what to read next, what to ask, and what to write back to criterio as we go. Do not skip a phase. When nobody can answer, go on with what you know: write real draft copy in the project's voice, and mark only a fact you cannot back, such as a figure, a client or a quote. Never leave a headline or a section empty.",
      ].join("\n"),
    },
    es: {
      title: "Diseñar con el criterio",
      description: "Empieza un trabajo desde el criterio.md del proyecto, siguiendo las fases de su Empieza aquí.",
      args: [projectArg("es"), { name: "task", description: "Qué vas a hacer" }],
      text: (a) => [
        which("es", a.project),
        a.task?.trim() ? `Quiero hacer esto: ${a.task.trim()}` : "Si no he dicho qué vamos a hacer, ofréceme lo que lista el Empieza aquí del criterio y deja que elija.",
        "",
        "Llama primero a read_criterio con la sección \"guide\" y sigue su Empieza aquí: el guion de la sesión, fase a fase, parando en cada punto de control. Ahí dice qué leer después, qué preguntarme y qué devolver a Criterio por el camino. No te saltes ninguna fase. Si nadie puede responder, sigue con lo que sabes: escribe un borrador real del copy en la voz del proyecto y marca solo un dato que no puedas respaldar, como una cifra, un cliente o una cita. Nunca dejes vacío un titular o una sección.",
      ].join("\n"),
    },
  },
  close_open_areas: {
    en: {
      title: "Settle what is open",
      description: "Go through the areas the criterio has not decided yet, one at a time, and send what we settle as proposals.",
      args: [projectArg("en")],
      text: (a) => [
        which("en", a.project),
        "",
        "1. Call read_criterio with section \"guide\". Its Start here lists the areas still open or loosely held, and the references that point somewhere for each.",
        "2. Tell me which they are in one line and take them one at a time, in the order I pick. For each, read it with read_criterio (that area as the section), then settle it as its phase 2 says: what its references say, two or three concrete options drawn from them, and the decision written as the file writes an area.",
        "3. After my yes on each one, send it with propose_decision, with a reason that says it was settled with me. Then go to the next.",
        "4. End by saying what is waiting for the team's answer and what is still open.",
      ].join("\n"),
    },
    es: {
      title: "Cerrar lo que falta",
      description: "Recorre las áreas que el criterio aún no ha decidido, una a una, y manda lo que cerremos como propuestas.",
      args: [projectArg("es")],
      text: (a) => [
        which("es", a.project),
        "",
        "1. Llama a read_criterio con la sección \"guide\". Su Empieza aquí lista las áreas abiertas o poco firmes, y las referencias que apuntan algo en cada una.",
        "2. Dime cuáles son en una línea y vamos de una en una, en el orden que yo elija. Para cada una, léela con read_criterio (esa área como sección) y ciérrala como dice su fase 2: qué dicen sus referencias, dos o tres opciones concretas sacadas de ellas y la decisión escrita como el archivo escribe un área.",
        "3. Cuando te diga que sí a una, mándala con propose_decision, con un motivo que diga que se ha cerrado conmigo. Luego pasa a la siguiente.",
        "4. Termina diciendo qué queda esperando la respuesta del equipo y qué sigue abierto.",
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
        "2. For a public site, call measure_site for its real values. Go through the source and collect, area by area (typography, color, layout, motion, iconography, logo, imagery, voice), what is actually decided there: typefaces and their scale, the palette with its values and what each color is for, spacing and grid, easings and durations, icon set, logo rules, the kind of imagery, how the copy sounds. Take it from the real thing (tokens, CSS variables, component code, the guideline's own words), not from how it looks to you.",
        "3. Show me a plan before writing anything, as three short lists: (a) the references you would add (the live site, key pages, the guideline as a text, the images that carry the look), each with a one-line note; (b) the brand's values you would bring with bring_brand, section by section (palette, faces and scale, logo, motion, voice, imagery, handles); (c) one proposal per area that has enough behind it, with the decision as you would write it.",
        "4. After my yes, add the references with add_reference (set their areas), call bring_brand once with every section you have values for and the guidelines as guide, and send each proposal with propose_decision, with a reason that says where it was read from. Leave out any area the source says nothing about. What an area decides (spacing, radius, elevation, a rule) is a proposal, never a brand value.",
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
        "2. Para una web pública, llama a measure_site para tener sus valores reales. Recorre la fuente y recoge, área por área (tipografía, color, layout, movimiento, iconografía, logo, imagen, voz), lo que de verdad está decidido ahí: las fuentes y su escala, la paleta con sus valores y para qué sirve cada color, espaciado y retícula, curvas y duraciones, el set de iconos, las reglas del logo, el tipo de imagen, cómo suena el texto. Sácalo de lo real (tokens, variables CSS, código de componentes, las palabras de la propia guía), no de cómo te parece que se ve.",
        "3. Enséñame un plan antes de escribir nada, en tres listas cortas: (a) las referencias que añadirías (la web en producción, páginas clave, la guía como texto, las imágenes que llevan el estilo), cada una con una nota de una línea; (b) los valores de la marca que traerías con bring_brand, sección por sección (paleta, fuentes y escala, logo, movimiento, voz, imagen, perfiles); (c) una propuesta por cada área que tenga suficiente detrás, con la decisión tal como la escribirías.",
        "4. Cuando te diga que sí, añade las referencias con add_reference (con sus áreas), llama a bring_brand una vez con todas las secciones de las que tengas valores y la guía como guide, y manda cada propuesta con propose_decision, con un motivo que diga de dónde se ha leído. Deja fuera las áreas de las que la fuente no diga nada. Lo que decide un área (espaciado, radios, elevación, una regla) es una propuesta, nunca un valor de la marca.",
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
