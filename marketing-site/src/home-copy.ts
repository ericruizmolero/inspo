// The words of the home's own sections (SiteHeader, SiteMenu, HomeCompare, HomeBento, HomeManifesto, HomeQuestions). The hero, the product window
// and the close have theirs in video/landing/plantilla.html (COPY)
import type { Locale } from "./i18n";

/** Tino's faces an answer can call (FACES in the template) */
type Face = "watching" | "following" | "smug" | "accomplice" | "skeptic" | "asleep";

/** A word of the manifesto set in a chip with its drawing */
export type Mark = "time" | "mine" | "forget" | "hands";
/** And the ones that do something: the pile of references, a word in big, one that a cursor passes over, one a teammate changes (`from`), a version, a smile, the signature */
type Play = "refs" | "big" | "hover" | "swap" | "version" | "smile" | "sign";
/** `after` is the punctuation that must not start a line on its own */
type Line = (string | { mark: Mark | Play; word: string; from?: string; after?: string })[];

interface HomeCopy {
  menu: { open: string; close: string; home: string; page: string; start: string; more: string; watch: string };
  /** The page's sections, in order, by the id of each */
  sections: Record<SectionId, string>;
  compare: { headline: [string, string]; brief: string; slider: string; without: { name: string; alt: string }; with: { name: string; alt: string } };
  bento: {
    headline: [string, string];
    search: { title: string; query: string };
    agent: { title: string; lines: string[]; ask: string; done: string };
    share: { title: string; sub: string; client: string; online: string; out: string; in: string };
    versions: { title: string; board: string; list: { who: string; face?: "andoni" | "alberto"; what: string; tag: string; when: string }[] };
  };
  manifesto: { file: string; lines: Line[] };
  ask: { headline: string; sub: string; label: string; open: { q: string; a: string }; list: { q: string; a: string; face: Face }[] };
}

export const SECTIONS = ["demo", "mf", "archivo", "pricing", "preguntas"] as const;
export type SectionId = (typeof SECTIONS)[number];

/** The 404 page */
export const lostCopy: Record<Locale, { title: string; headline: [string, string]; text: string; back: string }> = {
  en: { title: "Not found", headline: ["Nothing here.", "Not even AI slop."], text: "The page you’re after has moved or never existed.", back: "Back to the start" },
  es: { title: "No existe", headline: ["Aquí no hay nada.", "Ni AI slop."], text: "La página que buscas se ha movido o no ha existido nunca.", back: "Volver al inicio" },
};

export const homeCopy: Record<Locale, HomeCopy> = {
  en: {
    menu: { open: "Menu", close: "Close", home: "Criterio, home", page: "On this page", start: "On the home page", more: "More", watch: "Watch the one-minute video" },
    sections: { demo: "How it works", mf: "Why it exists", archivo: "What it does", pricing: "Pricing", preguntas: "Questions" },
    compare: {
      headline: ["Same brief.", "Two landings."], brief: "We asked Claude for the site of Plomo, a type foundry we made up.", slider: "Compare the two landings",
      without: { name: "Without Criterio: the first answer.", alt: "Plomo’s landing, made without Criterio" },
      with: { name: "With Criterio: five decisions from the board.", alt: "Plomo’s landing, made with five decisions from the board" },
    },
    bento: {
      headline: ["Every decision in one file.", "Always at hand."],
      search: { title: "Search the way you talk.", query: "big serif and lots of calm" },
      agent: { title: "Your agent asks before inventing.", lines: ["Read criterio.md and 1 folder", "Typography: big serif in headings", "Color: paper and ink, orange for actions", "Layout: one idea per screen"], ask: "Motion: undecided. I will ask you.", done: "Baked for 15s" },
      share: { title: "Share it with your client.", sub: "No account needed. They comment and choose.", client: "Marta (client)", online: "online", out: "The references for your landing. Choose the ones you like.", in: "Chose two. The serif one 😍" },
      versions: { title: "Go back to any version.", board: "Board versions", list: [{ who: "Andoni", face: "andoni", what: "2 in", tag: "v3", when: "now" }, { who: "Alberto", face: "alberto", what: "1 out", tag: "v2", when: "12 Nov" }, { who: "As it was", what: "6 references", tag: "v1", when: "10 Nov" }] },
    },
    manifesto: {
      file: "why-it-exists.md",
      lines: [
        ["Anyone can make a landing in ", { mark: "time", word: "an afternoon", after: "." }, " Making it ", { mark: "mine", word: "yours" }, " is the hard part."],
        ["Taste can be trained. Look at plenty of ", { mark: "refs", word: "references", after: "," }, " choose out loud and ", { mark: "forget", word: "forget" }, " more than you keep."],
        ["Save before you understand: a ", { mark: "big", word: "giant" }, " footer, a ", { mark: "hover", word: "hover" }, " you didn’t see coming. The reason shows up later."],
        ["Debate with your team. Two people who disagree sharpen more than ", { mark: "swap", word: "a hundred", from: "ten" }, " who nod."],
        ["AI brings the ", { mark: "hands", word: "hands", after: "." }, " You bring the taste."],
        ["Iterate fast and often. Good ideas take ", { mark: "version", word: "v7" }, " time and care."],
        ["Hide something only the curious find ", { mark: "smile", word: ":)" }, " and put your ", { mark: "sign", word: "signature" }, " on it."],
      ],
    },
    ask: {
      headline: "Ask Tino.", sub: "Knows almost everything.", label: "Ask me:", open: { q: "Fire away.", a: "Pick a question and I’ll answer." },
      list: [
        { q: "What is in criterio.md?", face: "smug", a: "Every design decision your references lead to: typography, color, layout, motion, iconography, logo, imagery and voice. If you change your mind, it changes with you." },
        { q: "How do I bring in what I already saved?", face: "following", a: "From Are.na, Pinterest, Cosmos, X, your browser or your files." },
        { q: "Which agents does it work with?", face: "accomplice", a: "Any that reads a file. The ones that support MCP connect and read it on their own." },
        { q: "Can I use it without a team?", face: "following", a: "Yes. And every plan has room for one more, if you want company." },
        { q: "What if I forget a reference by mistake?", face: "skeptic", a: "You sure? What you forget goes back to the inbox. With a team, only what everyone forgets leaves the board." },
        { q: "What counts as an AI action?", face: "watching", a: "Each thing you ask Criterio’s AI to do. Landing checks are separate: each one opens your landing on desktop and mobile and measures it." },
        { q: "When do I get in?", face: "accomplice", a: "Leave your email and we’ll write when it’s your turn." },
        { q: "Can you be switched off?", face: "asleep", a: "I’m not saying anything. But yes: you can let me sleep." },
      ],
    },
  },
  es: {
    menu: { open: "Menú", close: "Cerrar", home: "Criterio, inicio", page: "En esta página", start: "En la portada", more: "Más", watch: "Mira el vídeo de un minuto" },
    sections: { demo: "Cómo funciona", mf: "Por qué existe", archivo: "Qué hace", pricing: "Precios", preguntas: "Preguntas" },
    compare: {
      headline: ["El mismo encargo.", "Dos landings."], brief: "Le pedimos a Claude la web de Plomo, una fundición tipográfica inventada.", slider: "Compara las dos landings",
      without: { name: "Sin Criterio: la primera respuesta.", alt: "Landing de Plomo hecha sin Criterio" },
      with: { name: "Con Criterio: cinco decisiones del tablón.", alt: "Landing de Plomo hecha con cinco decisiones del tablón" },
    },
    bento: {
      headline: ["Cada decisión en un archivo.", "Siempre a mano."],
      search: { title: "Busca como hablas.", query: "serif grande y mucha calma" },
      agent: { title: "Tu agente pregunta antes de inventar.", lines: ["Leí criterio.md y 1 carpeta", "Tipografía: serif grande en titulares", "Color: papel y tinta, naranja para las acciones", "Layout: una idea por pantalla"], ask: "Motion: sin decidir. Te pregunto.", done: "Baked for 15s" },
      share: { title: "Compártelo con tu cliente.", sub: "Sin cuenta. Comenta y elige.", client: "Marta (cliente)", online: "en línea", out: "Las referencias para tu landing. Elige las que te gusten.", in: "He elegido dos. La de la serifa 😍" },
      versions: { title: "Vuelve a cualquier versión.", board: "Versiones del tablón", list: [{ who: "Andoni", face: "andoni", what: "2 entran", tag: "v3", when: "ahora" }, { who: "Alberto", face: "alberto", what: "1 sale", tag: "v2", when: "12 nov" }, { who: "Así estaba", what: "6 referencias", tag: "v1", when: "10 nov" }] },
    },
    manifesto: {
      file: "por-que-existe.md",
      lines: [
        ["Hoy cualquiera hace una landing en ", { mark: "time", word: "una tarde", after: "." }, " Lo difícil es que se note que es ", { mark: "mine", word: "tuya", after: "." }],
        ["El gusto se entrena. Mira muchas ", { mark: "refs", word: "referencias", after: "," }, " elige en voz alta y ", { mark: "forget", word: "olvida" }, " más de lo que guardas."],
        ["Guarda antes de entender: un footer ", { mark: "big", word: "gigante", after: "," }, " un ", { mark: "hover", word: "hover" }, " que no esperabas. El porqué llega después."],
        ["Debate con tu equipo. Dos personas que no coinciden afinan más que ", { mark: "swap", word: "cien", from: "diez" }, " que asienten."],
        ["La IA pone las ", { mark: "hands", word: "manos", after: "." }, " El criterio lo pones tú."],
        ["Itera rápido y mucho. Las buenas ideas piden ", { mark: "version", word: "v7" }, " tiempo y cariño."],
        ["Esconde algo que solo encuentre quien se fija ", { mark: "smile", word: ":)" }, " y ponle tu ", { mark: "sign", word: "firma", after: "." }],
      ],
    },
    ask: {
      headline: "Pregúntale a Tino.", sub: "Sabe casi todo.", label: "Pregúntame:", open: { q: "Dispara.", a: "Elige una pregunta y te contesto." },
      list: [
        { q: "¿Qué hay en criterio.md?", face: "smug", a: "Cada decisión de diseño que sale de tus referencias: tipografía, color, layout, motion, iconografía, logo, imagen y voz. Si cambias de idea, cambia contigo." },
        { q: "¿Cómo traigo lo que ya guardé?", face: "following", a: "Desde Are.na, Pinterest, Cosmos, X, tu navegador o tus archivos." },
        { q: "¿Con qué agentes funciona?", face: "accomplice", a: "Con cualquiera que lea un archivo. Los que admiten MCP se conectan y lo leen solos." },
        { q: "¿Puedo usarlo sin equipo?", face: "following", a: "Sí. Y en cualquier plan cabe otra persona, si quieres compañía." },
        { q: "¿Y si olvido una referencia sin querer?", face: "skeptic", a: "¿Seguro, seguro? Lo que olvidas vuelve al cajón. Con equipo, solo sale del tablón lo que todos olvidan." },
        { q: "¿Qué cuenta como acción de IA?", face: "watching", a: "Cada cosa que le pides a la IA de Criterio. Las revisiones de landing van aparte: cada una abre tu landing en escritorio y en móvil y la mide." },
        { q: "¿Cuándo entro?", face: "accomplice", a: "Deja tu correo y te escribimos cuando te toque." },
        { q: "¿Se te puede apagar?", face: "asleep", a: "Yo no digo nada. Pero sí: se me puede dejar dormido." },
      ],
    },
  },
};
