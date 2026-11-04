// The questions the team asks a client before a website, as criterio.md's playbook hands them to an agent: it asks the
// ones still unanswered, one at a time, and skips what is already known. The client questions are the team's
// (2026-11-03); the brief's fields joined them on 2026-11-04, when the Brief panel left the app: every question it asked
// is a step of the MD now. Decided in docs/design-system/decisiones/ (the MD as a guided playbook).
// An answer lives in the brief: in its own field when the question has one (old projects keep theirs), otherwise in
// brief.answers under the question's id, written by answer_question over MCP (lib/brief.ts saveAnswer).
import type { Brief } from "@/types/brief";
import type { SystemArea } from "@/types/system";

type Text = { en: string; es: string };

export const QUESTION_GROUPS = ["project", "audience", "unique", "structure", "brand", "content", "build"] as const;
export type QuestionGroup = (typeof QUESTION_GROUPS)[number];

export const QUESTION_GROUP_NAMES: Record<QuestionGroup, Text> = {
  project: { en: "The project", es: "El proyecto" },
  audience: { en: "Audience and message", es: "Público y mensaje" },
  unique: { en: "What makes you unique", es: "Lo que os hace únicos" },
  structure: { en: "The landing's structure", es: "Estructura de la landing" },
  brand: { en: "Brand and taste", es: "Marca y gusto" },
  content: { en: "Content and material", es: "Contenido y material" },
  build: { en: "Where it lives and how it is built", es: "Dónde vive y cómo se construye" },
};

export interface PlaybookQuestion {
  id: string;
  group: QuestionGroup;
  /** The areas its answer decides; empty when it is about the project as a whole */
  feeds: SystemArea[];
  text: Text;
  /** Answered when the brief already says it: the agent does not ask it again */
  fromBrief?: (b: Brief) => boolean;
  /** How to ask it when the board already has references: show them and ask about them instead of starting from nothing */
  withBoard?: Text;
}

export const PLAYBOOK_QUESTIONS: readonly PlaybookQuestion[] = [
  { id: "offer", group: "project", feeds: ["voice"], fromBrief: (b) => !!b.about.trim(),
    text: { en: "What do you offer and to whom, in one or two sentences, as you would tell someone who does not know you?", es: "¿Qué ofrecéis y a quién, en una o dos frases, como se lo contaríais a alguien que no os conoce?" } },
  { id: "current-site", group: "project", feeds: ["logo", "color", "typography", "voice"], fromBrief: (b) => !!b.clientItemId,
    text: { en: "Do you have a website already? If so, share its address: the project becomes a redesign and that site rules its copy, typefaces and logo.", es: "¿Ya tenéis web? Si la tenéis, pasad la dirección: el proyecto pasa a ser un rediseño y esa web manda en textos, tipografías y logo." } },
  { id: "product", group: "project", feeds: ["imagery", "voice"], fromBrief: (b) => !!(b.product.what || b.product.price),
    text: { en: "What do you sell, and in which price range: affordable, mid or premium?", es: "¿Qué vendéis y en qué gama de precio: asequible, media o premium?" } },
  { id: "goal", group: "project", feeds: ["layout", "voice"],
    text: { en: "What is the one thing someone should do after seeing the landing (book a demo, buy, write to you…)? And what happens next: a form, a checkout link or a calendar?", es: "¿Qué es lo único que debería hacer alguien al terminar de ver la landing (pedir una demo, comprar, escribiros…)? ¿Qué debe pasar después: formulario, enlace de compra o calendario?" } },
  { id: "launch", group: "project", feeds: [],
    text: { en: "Is there a date or a reason that sets the launch?", es: "¿Hay alguna fecha o algún motivo que marque el lanzamiento?" } },

  { id: "audience", group: "audience", feeds: ["voice", "imagery"],
    text: { en: "Who are you mainly speaking to? What worries them, or what do they want to achieve, when they land on the page?", es: "¿A quién os dirigís principalmente? ¿Qué le preocupa o qué quiere conseguir cuando llega a la página?" } },
  { id: "markets", group: "audience", feeds: ["voice", "typography"], fromBrief: (b) => b.markets.length > 0,
    text: { en: "Which languages and markets does the page go out in?", es: "¿En qué idiomas y mercados va la página?" } },
  { id: "first-seconds", group: "audience", feeds: ["layout", "typography", "voice"], fromBrief: (b) => !!b.firstSeconds.trim(),
    text: { en: "What should that person understand in the first 5 seconds?", es: "¿Qué debería entender esa persona en los primeros 5 segundos?" } },
  { id: "why-us", group: "audience", feeds: ["voice", "layout"],
    text: { en: "Why should they choose you over another option, or over carrying on as they are? What doubts hold them back before deciding?", es: "¿Por qué debería elegiros a vosotros y no a otra opción, o seguir como hasta ahora? ¿Qué dudas le frenan antes de decidirse?" } },
  { id: "traffic", group: "audience", feeds: ["layout"],
    text: { en: "Where will most visits come from (ads, email, social, an event, search, direct contact)? Will they come mostly from a phone?", es: "¿De dónde llegará la mayoría de las visitas (anuncios, email, redes, un evento, búsquedas, contacto directo)? ¿Vendrán sobre todo desde el móvil?" } },

  { id: "hard-to-copy", group: "unique", feeds: ["voice", "imagery"],
    text: { en: "What do you do or have that is hard to copy: a way of working, a figure, a story or a product?", es: "¿Qué hacéis o tenéis que resulte difícil de copiar, sea una forma de trabajar, un dato, una historia o un producto?" } },
  { id: "proof", group: "unique", feeds: ["layout", "imagery"],
    text: { en: "What proof backs it: figures, clients, testimonials, cases, awards or press? Say too what can be published and what cannot.", es: "¿Con qué pruebas podemos respaldarlo: cifras, clientes, testimonios, casos, premios o prensa? Indicad también qué podemos publicar y qué no." } },

  { id: "sections", group: "structure", feeds: ["layout"],
    text: { en: "Which sections or contents must appear (product, how it works, pricing, team, cases, FAQ…)? Any you would rather leave out? If you are not sure, we propose the structure.", es: "¿Qué secciones o contenidos tenéis claro que deben aparecer (por ejemplo: producto, cómo funciona, precios, equipo, casos, preguntas frecuentes)? ¿Hay alguno que prefiráis dejar fuera? Si no lo tenéis claro, os proponemos nosotros la estructura." } },

  { id: "brand-material", group: "brand", feeds: ["logo", "color", "typography"], fromBrief: (b) => b.keep.length > 0 || !!b.clientItemId,
    text: { en: "What brand material do you have (logo as SVG, colours, typefaces, brand guide)? Share the current site too, if there is one. Is there anything we must keep?", es: "¿Qué material de marca tenéis (logo en SVG, colores, tipografías, guía de marca)? Pasad también la web actual, si existe. ¿Hay algo que debamos conservar?" } },
  { id: "likes", group: "brand", feeds: ["typography", "color", "layout", "motion", "imagery"],
    text: { en: "Which sites do you like, and what do you like about each? They need not be from your sector.", es: "¿Qué webs os gustan y qué os gusta de cada una? No tienen que ser de vuestro sector." },
    withBoard: { en: "Show the board's references, by their codes, and ask what they like about each one.", es: "Enseña las referencias del tablero, por sus códigos, y pregunta qué les gusta de cada una." } },
  { id: "traits", group: "brand", feeds: ["voice", "typography", "color", "motion"], fromBrief: (b) => b.traits.length > 0,
    text: { en: "Three words for the brand.", es: "Tres palabras para la marca." } },
  { id: "never-say", group: "brand", feeds: ["voice"], fromBrief: (b) => !!b.neverSay.trim(),
    text: { en: "Something the brand would never say.", es: "Algo que la marca nunca diría." } },
  { id: "avoid", group: "brand", feeds: ["color", "imagery", "voice"], fromBrief: (b) => !!b.competitorsNote.trim(),
    text: { en: "What would you like to avoid? A style, a colour, a kind of image, or something your competitors do.", es: "¿Qué os gustaría evitar? Puede ser un estilo, un color, un tipo de imagen o algo que hagan vuestros competidores." } },
  { id: "competitors", group: "brand", feeds: [], fromBrief: (b) => b.competitors.length > 0,
    text: { en: "Who are your main competitors? Two or three sites.", es: "¿Quiénes son vuestros principales competidores? Dos o tres webs." } },

  { id: "copy", group: "content", feeds: ["voice"],
    text: { en: "Do you have copy written, or do we write it? Paste a few real lines the brand has written. Is there anything you must or must not say (legal matters, claims, brand terms)?", es: "¿Tenéis textos ya escritos o los redactamos nosotros? Pegad algunas frases reales de la marca. ¿Hay algo que sea obligatorio decir o que no podáis decir (temas legales, afirmaciones, términos de marca)?" } },
  { id: "material", group: "content", feeds: ["imagery"],
    text: { en: "What real material can you share: photos, videos, product screenshots, demos, 3D models, reports or data? The highest quality available is best, even unedited.", es: "¿Qué material real podéis pasarnos: fotos, vídeos, capturas del producto, demos, modelos 3D, informes o datos? Lo mejor es la máxima calidad disponible, aunque esté sin editar." } },

  { id: "platforms-stack", group: "build", feeds: ["layout"], fromBrief: (b) => b.platforms.length > 0 || b.stack.length > 0,
    text: { en: "Where does it live (web, iOS, Android, print) and what is it built with (Tailwind, Figma, Webflow…)?", es: "¿Dónde vive (web, iOS, Android, impreso) y con qué se construye (Tailwind, Figma, Webflow…)?" } },
  { id: "a11y", group: "build", feeds: ["color", "typography", "motion"], fromBrief: (b) => b.a11y !== null,
    text: { en: "Which accessibility level: AA, the usual one and what applies if nobody chooses, or AAA, more contrast and larger type for public services or an older audience?", es: "¿Qué nivel de accesibilidad: AA, el habitual y el que vale si nadie elige, o AAA, más contraste y letra más grande para servicios públicos o un público mayor?" } },
];

/** What the setup does with a question (lib/setup-core.ts). "stops": the setup waits for it, because it decides the
 *  page's structure. "core": asked, and it can stay open as a marked gap. "read": the agent looks for it on the site or
 *  in the repo and the person confirms it. The rest are never asked in the setup: the file lists them to go deeper */
export const SETUP_ROLES: Readonly<Record<string, "stops" | "core" | "read">> = {
  goal: "stops", audience: "core", "why-us": "core", proof: "core",
  offer: "read", "current-site": "read", product: "read", markets: "read", "brand-material": "read", competitors: "read", "platforms-stack": "read",
};

/** The question as the agent should ask it: with references on the board, the board's version when there is one */
export const questionText = (q: PlaybookQuestion, locale: "en" | "es", hasRefs: boolean) =>
  (hasRefs && q.withBoard ? q.withBoard : q.text)[locale];

export const questionById = (id: string) => PLAYBOOK_QUESTIONS.find((q) => q.id === id);

/** Which questions are still open for a project: neither its brief nor a stored answer says it */
export function openQuestions(brief: Brief | null, answered: ReadonlySet<string>): PlaybookQuestion[] {
  return PLAYBOOK_QUESTIONS.filter((q) => !answered.has(q.id) && !(brief && q.fromBrief?.(brief)));
}
