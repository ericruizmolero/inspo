// criterio.md: the project's system as a file an agent reads before designing. Shared by client
// (download, copy, the Markdown view) and server (the check script). Headings are the reader's language;
// the body is whatever language the decisions were written in.
//
// It holds everything the team gathered, in order: what the project is, the eight areas (each with its
// decision, its why, what it never does, the references behind it with what the team said of each, and the
// area's conversation), and at the end every reference once: what it is, who saved it, what was said and
// what it brings to which area. An area cites a reference by its code (R1, R2…).
//
// The file is built in blocks (the head, the paragraph, one block per area, the references) so the app can show
// it as it is and let a block be edited: the system stays the one source, the file is its other face.
import { SYSTEM_AREAS, confidenceOf, type ProjectSystem, type SystemArea } from "@/types/system";
import { skillSections } from "@/lib/md-skills";
import { brandBrought, built, picked, setupState } from "@/lib/setup-core";
import { areaSkillLines } from "@/lib/area-skills";
import { areaTokenLines } from "@/lib/area-tokens";
import { hostOf, readableDomain } from "@/lib/url";
import { brandTokenLines, brandIntroLines, brandCssLines, type BrandMdStrings } from "@/lib/brand-md";
import type { BrandSpec } from "@/types/brand";
import { readBrief, unconfirmed, type KeepPart, type Platform, type PriceRange } from "@/types/brief";
import { PLAYBOOK_QUESTIONS, SETUP_ROLES, questionText } from "@/lib/playbook-questions";
import type { RefMeasured } from "@/lib/ref-measured";
import type { RefComposition } from "@/types/inspo";
import { compositionPatterns, isPage, type CompositionPattern } from "@/lib/composition-core";

/** A reference as the file tells it: what it is, who brought it and what the team said about it */
export interface RefInfo {
  name: string; web: string;
  /** The page a copied image or video was found on: the file cites it instead of our copy */
  source?: string;
  kind?: "web" | "image" | "video" | "post" | "text";
  /** A text's own words, whole: the project's content, written into the file as it was given */
  text?: string;
  by?: string;
  /** The day it was saved, YYYY-MM-DD */
  date?: string;
  /** What it is, as the AI read it: the page in a line, or the picture described */
  what?: string;
  /** Its style, sector and traits, as words */
  tags?: string[];
  /** What the team said about it, oldest first: the note it was saved with, then its thread */
  said?: { who: string; text: string; /** The pictures attached to the comment: what its words point at */ images?: string[] }[];
  /** What its DESIGN.md and its saved palette measured */
  measured?: RefMeasured;
  /** How its page is built (lib/composition.ts), when it reads as a page */
  composition?: RefComposition;
}
/** A line of an area's conversation; `label` is the option it points at, `itemId` the reference */
export interface TalkLine { who: string; text: string; label?: string; itemId?: string; /** The change it proposes, and whether the team took it */ proposal?: { decision: string; state: "open" | "accepted" | "rejected"; /** The AI client it came from over MCP, when it was not written in the app */ via?: string; /** Why the team said no, when it did */ reason?: string } }

export interface CriterioMdInput {
  project: string;
  system: ProjectSystem;
  /** The workspace's references by id: at least the name and URL behind each decision */
  items: Record<string, RefInfo>;
  labels: Record<SystemArea, string>;
  /** A redesign: the client's current site, whose copy, typefaces, logo and figures rule */
  client?: { name: string; web: string } | null;
  /** What the project is, in the team's words (the brief) */
  about?: string | null;
  /** The project's brief as stored: every field filled gets a line under Brief */
  brief?: unknown;
  /** The project's references in the order they were saved: each gets a code (R1, R2…) and its own entry at the end of the file */
  board?: string[];
  /** The team's conversation about each area, oldest first */
  talk?: Record<string, TalkLine[]>;
  /** Where the app lives, to make its own paths (uploaded images) whole links */
  origin?: string;
  /** The skills the team switched on (lib/md-skills.ts): each adds a section on how to build part of the system */
  skills?: readonly string[];
  /** The language the skills' sections are written in */
  locale?: string;
  /** The brand as values: each area gets its tables, and the file ends with the tokens */
  brand?: BrandSpec | null;
  /** "clean": the file for someone outside the team (a client, through a share link): no conversation, no names, no
   *  pictures attached to comments, and none of the parts the team rewrote by hand. "full" (the default): everything */
  mode?: "full" | "clean";
  /** A stored file's whole address (a logo), as this reader can open it */
  fileHref?: (key: string) => string;
  /** A public path for each stored file the file cites (/api/files/<key> → a signed one, lib/file-links.ts): the app's
   *  own copy, which leaves the app and is read where there is no session */
  links?: Record<string, string>;
  /** The client's own words, read off its site (headline, headings, buttons): the voice samples when the brief has none */
  clientCopy?: string[];
  strings: {
    intro: string; summary: string; decided: string; proposed: string; open: string; confidence: string; evidence: string; take: string; why: string; never: string; client: string;
    project: string; refs: string; refsIntro: string; kinds: Record<"web" | "image" | "video" | "post" | "text", string>; content: string; contentIntro: string; what: string; savedBy: string; said: string; attached: string;
    brings: string; noArea: string; tags: string; talk: string; on: (what: string) => string;
    proposes: string; states: Record<"open" | "accepted" | "rejected", string>; whyNot: string;
    /** The signals behind a decision (lib/taxonomy.ts SIGNALS), by key, in the reader's language */
    support: string; supportOf: (signal: string, n: number, of: number) => string; signals: Record<string, string>;
    brand: BrandMdStrings;
    brief: BriefMdStrings;
    version: (n: number) => string;
    required: string; guidance: string; must: string; should: string;
    use: { heading: string; lines: (k: UseMdKeys) => string[] };
    /** "Start here": the walk the agent takes the person on, written from what the project has (lib/criterio-md.ts guideKeys) */
    guide: { heading: string; setupOpen: string; lines: (k: GuideMdKeys) => string[] };
    /** "Starting questions": the questions still open, which the agent asks in phase 1 (lib/playbook-questions.ts) */
    questions: { heading: string; intro: string; tiers: Record<QuestionTier, string>; decides: string; none: string; answered: (n: number) => string; inBrief: string; unconfirmed: string };
    /** "What was learned": what agents wrote down with the person (types/system.ts SystemLearning); `rejected` heads what they turned down */
    learned: { heading: string; intro: string; with: (who: string, app: string) => string; rejected: string };
    /** The short list the file ends on, so the rules are read again last (a long file's middle is read worst) */
    before: { heading: string; lines: (k: BeforeMdKeys) => string[] };
    /** "The landing": each landing planned, its goal and its sections in order (types/landing.ts) */
    landing: { heading: string; goal: string; proof: string; cta: string; draft: string; directions: string };
    /** Every area's never lines gathered in one place, for the reader who reads one list before building */
    rejects: { heading: string; intro: string };
    clientCopy: string;
    measured: { label: string; themes: Record<"light" | "dark", string>; density: string; colors: string; families: string; radius: string; pixels: string };
    /** The page structures the board repeats (lib/composition-core.ts), under layout, and each reference's build */
    composition: {
      repeats: string; build: string; describe: (p: CompositionPattern) => string; of: (n: number, of: number) => string;
      /** "By page": the references grouped by the kind of page they show (PAGE_KINDS), for an agent asked for one page */
      pages: string; pagesIntro: string; kinds: Record<string, string>;
    };
  };
}

/** The file's own labels, for the "use" section to name the marks as the file writes them */
export interface UseMdKeys { never: string; evidence: string; tokens: string; refs: string; required: string; guidance: string; measured: string; client: string | null }

/** The closing list's names for the parts it points back to */
export interface BeforeMdKeys { never: string; rejects: string | null; learned: string }

/** How the agent handles a starting question: "ask" one at a time (only the person knows it), "confirm" what it can
 *  look up first, "propose" an answer itself. Read off the setup's roles (lib/playbook-questions.ts SETUP_ROLES), so the
 *  setup and the file sort the questions the same way */
export type QuestionTier = "ask" | "confirm" | "propose";
const QUESTION_TIERS: readonly QuestionTier[] = ["ask", "confirm", "propose"];
export const questionTier = (id: string): QuestionTier => {
  const role = SETUP_ROLES[id];
  return role === "stops" || role === "core" ? "ask" : role === "read" ? "confirm" : "propose";
};

/** What "Start here" is written from: what the board can already hold up, and what is still to decide */
export interface GuideMdKeys {
  project: string;
  /** The kinds of page the board has references of, with how many ("By page") */
  pages: { name: string; n: number }[];
  /** The areas still to settle: open, or proposed with low confidence, with the references that point somewhere */
  open: { label: string; state: "open" | "proposed"; confidence?: number; codes: string[] }[];
  /** The areas' own headings, as the file writes them */
  areas: Record<SystemArea, string>;
  /** The other parts' headings, as the file writes them; null when the file has no such part */
  pagesHeading: string | null; repeats: string | null; content: string | null; contentCodes: string[];
  rejects: string | null; neverCount: number; tokens: string | null; use: string;
  why: string; never: string; client: string | null;
  /** The Starting questions' heading and how many are still open; null heading when every one is answered */
  questions: string | null; openQuestions: number;
  /** What was learned's heading, when anything was */
  learned: string | null;
  /** How many open questions only the person can answer, asked one at a time */
  blocking: number;
  /** The person already chose a direction between versions (a learning with pick): no need to offer directions */
  picked: boolean;
}

export interface BriefMdStrings {
  heading: string; draft: string;
  sector: string; product: string; price: string; markets: string; competitors: string; competitorsNote: string; traits: string;
  neverSay: string; firstSeconds: string; platforms: string; stack: string; a11y: string; keep: string; voiceSamples: string;
  sectors: Record<string, string>; prices: Record<PriceRange, string>; platformNames: Record<Platform, string>; keepNames: Record<KeepPart, string>;
}

/** The brief's filled fields as lines of the file, in the order of the decision's table. `about` is not here: it is
 *  The project, above. A field a model drafted and nobody touched says so */
export function briefLines(stored: unknown, s: BriefMdStrings): string[] {
  const b = readBrief(stored);
  if (!b) return [];
  const draft = new Set<string>(b.drafted);
  const lines: string[] = [];
  const head = (field: string, label: string) => `- **${label}:**${draft.has(field) ? ` _(${s.draft})_` : ""}`;
  const row = (field: string, label: string, value: string) => { if (value) lines.push(`${head(field, label)} ${value}`); };
  row("sector", s.sector, b.sector ? s.sectors[b.sector] ?? b.sector : "");
  row("product", s.product, b.product.what);
  row("product", s.price, b.product.price ? s.prices[b.product.price] : "");
  row("markets", s.markets, b.markets.join(", "));
  row("competitors", s.competitors, b.competitors.map((u) => `[${hostOf(u)}](${u})`).join(", "));
  row("competitorsNote", s.competitorsNote, one(b.competitorsNote));
  row("traits", s.traits, b.traits.join(", "));
  row("neverSay", s.neverSay, one(b.neverSay));
  row("firstSeconds", s.firstSeconds, one(b.firstSeconds));
  row("platforms", s.platforms, b.platforms.map((p) => s.platformNames[p]).join(", "));
  row("stack", s.stack, b.stack.join(", "));
  row("a11y", s.a11y, b.a11y ? `WCAG ${b.a11y}` : "");
  row("keep", s.keep, b.keep.map((k) => s.keepNames[k]).join(", "));
  if (b.voiceSamples.length) lines.push(head("voiceSamples", s.voiceSamples), "", ...b.voiceSamples.flatMap((t, i) => [...(i ? [""] : []), ...t.split("\n").map((l) => `  > ${l}`)]));
  return lines;
}

export type CriterioBlock =
  /** The title, the note to the reader and the date, as lines of the file. `edited`: the team rewrote it by hand */
  | { kind: "head"; lines: string[]; edited?: boolean }
  | { kind: "summary"; heading: string; text: string }
  /** A part the app writes whole: what the project is, and the references one by one */
  | {
    kind: "section"; id: string; heading: string; lines: string[]; edited?: boolean;
    /** Written after the heading in the file only ("required"), never in the heading the team types over */
    mark?: string;
    /** Content only: the same lines, text by text, so the app can let each one's words be typed in place
     *  (`intro` first, then every text's `head` and `body` and a blank line) */
    texts?: { intro: string[]; items: { itemId: string; head: string[]; body: string[] }[] };
  }
  | {
    kind: "area"; area: SystemArea; heading: string;
    /** Empty when the area is open */
    decision: string; why: string;
    /** What the area must never do, one rule per line */
    never: string;
    whyLabel: string; neverLabel: string; openText: string; evidenceLabel: string;
    /** The words the file marks rules and references with. The Markdown view leaves them out, so they never reach a stored text */
    marks?: { required: string; guidance: string; must: string; should: string; /** The tokens' line that titles the brand's values ("**Values**"), or -1 */ valuesAt: number };
    /** The status, the references behind the decision with what the team said of each, and the area's conversation, as lines of the file */
    meta: string[];
    /** The team rewrote the status and references by hand */
    metaEdited?: boolean;
    /** The brand's values for this area (a palette, a scale, the curves), as lines. Written by the presentation, read only here */
    tokens?: string[];
    /** How many references show each signal behind the decision: the line the file says it in, and the lines that
     *  cite those references, which the app opens under it. Written by the app from the run, never typed over */
    support?: { line: string; refs: string[] }[];
    /** The skills recommended for the area (lib/area-skills.ts), as lines. Written by the app, never typed over */
    skillRecs?: string[];
  };

const one = (s: string) => s.replace(/\s+/g, " ").trim();

/** A text's own headings go below its entry's (### R4 · …), so the file keeps its outline */
const lowerHeadings = (text: string) => text.split("\n").map((l) => l.replace(/^#{1,3}(?=\s)/, "####"));
// The other way, for a text typed over in the file: lib/text-headings.ts (the board needs it without this whole module)
const quote = (s: string, max = 280) => { const t = one(s); return `\u00ab${t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}\u2026` : t}\u00bb`; };

/** What a reference measured, as a few lines under its entry: the theme and density, then colours, typefaces, radii and pixel shares */
function measuredLines(m: RefMeasured | undefined, s: CriterioMdInput["strings"]["measured"]): string[] {
  if (!m) return [];
  const glance = [m.theme ? s.themes[m.theme] : "", m.density ? `${s.density} ${m.density}` : ""].filter(Boolean).join(" · ");
  const out = [`- **${s.label}:**${glance ? ` ${glance}` : ""}`];
  if (m.colors?.length) out.push(`  - ${s.colors}: ${m.colors.map((c) => `\`${c.hex}\` ${c.name} (${c.group})`).join(", ")}`);
  if (m.families?.length) out.push(`  - ${s.families}: ${m.families.map((f) => `${f.family} (${[f.role, f.weights.join(" ")].filter(Boolean).join(", ")})`).join("; ")}`);
  if (m.radius?.length) out.push(`  - ${s.radius}: ${m.radius.map((r) => `${r.element} ${r.value}`).join(", ")}`);
  if (m.pixels?.length) out.push(`  - ${s.pixels}: ${m.pixels.map((p) => `\`${p.hex}\` ${Math.round(p.share * 100)}%`).join(", ")}`);
  return out;
}

/** A question's first sentence: what it asks, without the examples and the follow-up */
const firstSentence = (text: string) => /^.+?[?.](?=\s|$)/.exec(text)?.[0] ?? text;

/** Starting questions: the open ones by group, each with its id (what answer_question takes) and the areas its answer
 *  decides; then, in a line or a few, what is already answered (by the brief's fields, or an answer kept for it) */
function startingQuestions(stored: unknown, hasRefs: boolean, lang: "en" | "es", area: (k: SystemArea) => string, s: CriterioMdInput["strings"]["questions"]): { open: string[]; blocking: number; lines: string[] } {
  const brief = readBrief(stored);
  const answers = brief?.answers ?? {};
  const fromBrief = PLAYBOOK_QUESTIONS.filter((q) => !answers[q.id] && brief && q.fromBrief?.(brief));
  const kept = PLAYBOOK_QUESTIONS.filter((q) => answers[q.id]);
  const open = PLAYBOOK_QUESTIONS.filter((q) => !answers[q.id] && !fromBrief.includes(q));
  const lines = [`> ${s.intro}`, ""];
  // By how to handle them, not by topic: the few only the person can answer first, so the session does not open on 23 questions
  for (const t of QUESTION_TIERS) {
    const qs = open.filter((q) => questionTier(q.id) === t);
    if (!qs.length) continue;
    lines.push(`**${s.tiers[t]}**`, "");
    // Asked one at a time, a question goes whole; one the agent looks up or answers itself only needs naming
    for (const q of qs) {
      const text = questionText(q, lang, hasRefs);
      lines.push(`- \`${q.id}\` ${t === "ask" || (hasRefs && q.withBoard) ? text : firstSentence(text)}${q.feeds.length ? ` _${s.decides}: ${q.feeds.map(area).join(", ")}_` : ""}`);
    }
    lines.push("");
  }
  if (!open.length) lines.push(s.none, "");
  const done = fromBrief.length + kept.length;
  if (done) {
    lines.push(`**${s.answered(done)}**`, "");
    if (fromBrief.length) lines.push(`- ${s.inBrief}: ${fromBrief.map((q) => `\`${q.id}\``).join(", ")}`);
    for (const q of kept) lines.push(`- \`${q.id}\`: ${quote(answers[q.id].text, 160)}${unconfirmed(answers[q.id]) ? ` _(${s.unconfirmed})_` : ""}`);
  }
  while (lines[lines.length - 1] === "") lines.pop();
  return { open: open.map((q) => q.id), blocking: open.filter((q) => questionTier(q.id) === "ask").length, lines };
}

export function criterioBlocks({ project, system, items: allItems, labels, strings, client, about, brief, board = [], talk: allTalk = {}, origin = "", skills = [], locale, brand, mode = "full", fileHref, links = {}, clientCopy = [] }: CriterioMdInput): CriterioBlock[] {
  const date = (system.updatedAt ?? new Date().toISOString()).slice(0, 10);
  // Clean: what each reference is stays; who saved it and what the team said of it do not
  const clean = mode === "clean";
  const items = clean ? Object.fromEntries(Object.entries(allItems).map(([id, it]) => [id, { ...it, by: undefined, date: undefined, said: undefined }])) as Record<string, RefInfo> : allItems;
  const talk = clean ? {} : allTalk;
  const abs = (u: string) => (u.startsWith("/") ? `${origin}${links[u] ?? u}` : u);
  const href = (key: string) => (fileHref ? fileHref(key) : abs(`/api/files/${key}`));
  // What someone said, and the pictures they attached to say it: the words often point at them ("these 3D…")
  const told = (w: NonNullable<RefInfo["said"]>[number], max: number) => {
    const pics = (w.images ?? []).map((u, i, all) => `[${strings.attached}${all.length > 1 ? ` ${i + 1}` : ""}](${abs(u)})`);
    return [w.text ? quote(w.text, max) : "", ...pics].filter(Boolean).join(" ");
  };
  // Each reference of the project has a code, so an area can cite it and the reader finds it at the end
  const code = new Map(board.map((id, i) => [id, `R${i + 1}`]));
  const cite = (id: string) => {
    const it = items[id];
    if (!it) return id;
    const kind = it.kind && it.kind !== "web" ? ` (${strings.kinds[it.kind].toLowerCase()})` : "";
    // A text has no address to follow: it is in this same file, under Content
    if (it.kind === "text") return `${code.has(id) ? `**${code.get(id)}** ` : ""}${it.name}${kind}`;
    return `${code.has(id) ? `**${code.get(id)}** ` : ""}[${it.name}](${abs(it.source ?? it.web)})${kind}`;
  };
  // What the team rewrote by hand stands instead of what the app would write (types/system.ts DOC_PARTS)
  const doc: Record<string, string> = clean ? {} : system.doc ?? {};
  // Every heading can be typed over too ("title:<block id>"); emptied, the app's comes back
  const title = (id: string, fallback: string) => doc[`title:${id}`] || fallback;
  // A section the app writes whole (a skill's, the brand's), typed over by hand: it stays as the team left it until they bring the app's back
  const byHandOr = (id: string, lines: string[]) => ({ lines: doc[id] ? doc[id].split("\n") : lines, edited: !!doc[id] });
  const version = system.run?.version ? ` · ${strings.version(system.run.version)}` : "";
  const headLines = [`# ${project}: criterio.md`, "", `> ${strings.intro}`, "", `**criterio.design** · ${date}${version}`, ...(client ? ["", `**${strings.client}:** [${client.name}](${abs(client.web)})`] : [])];
  const blocks: CriterioBlock[] = [{ kind: "head", lines: doc.head ? doc.head.split("\n") : headLines, edited: !!doc.head }];
  const useLines = strings.use.lines({ never: strings.never, evidence: strings.evidence, tokens: strings.brand.tokens, refs: strings.refs, required: strings.required, guidance: strings.guidance, measured: strings.measured.label, client: client?.name ?? null });
  // Every area's never lines in one list, written by the app from the areas: it is a view of them, so it is never typed over
  const rejected = SYSTEM_AREAS.flatMap((key) => splitRules(system.areas.find((x) => x.area === key)?.never ?? "").never.map((l) => `- **${labels[key]}:** ${l}`));
  // By page: what each kind of page looks like on this board, so "build the About" starts from the references of
  // an About and how they are built. Only kinds of whole pages; a section, a picture or a logo is no page to ask for
  const kinds = Object.keys(strings.composition.kinds);
  const byKind = kinds.map((k) => ({ k, ids: board.filter((id) => items[id] && isPage(items[id].composition) && items[id].composition!.page === k) })).filter((x) => x.ids.length);
  const at = (id: string) => (code.has(id) ? board.indexOf(id) : Infinity);
  // The structures the team keeps saving, counted by the app: a fact about the board whatever layout decides
  const patterns = compositionPatterns(board.filter((id) => items[id] && items[id].kind !== "text").map((id) => ({ id, composition: items[id].composition }))).filter((p) => !p.ordinary);
  const texts = board.filter((id) => items[id]?.kind === "text");
  const css = brand ? brandCssLines(brand, project) : [];
  const derived = css.length ? [] : areaTokenLines(system, labels);
  // A setup still open says so first: the agent follows it, and the session loop starts when it ends
  const stored = readBrief(brief);
  const setup = setupState({ project: true, brief: stored, brand: !!stored?.clientItemId || brandBrought(system.brand), refs: board.length, pass: !!system.run, picked: picked(system), built: built(system) });
  // Start here: the walk, before the rules it leans on. Written from the project as it stands, so it is never typed over
  const open = SYSTEM_AREAS.flatMap((key) => {
    const a = system.areas.find((x) => x.area === key);
    const level = a ? confidenceOf(a) : "empty";
    if (level === "high") return [];
    // The references that point somewhere: what backs the proposal, or what the run read for the area
    const ids = [...new Set([...(a?.support ?? []).flatMap((x) => x.itemIds), ...(a?.evidence ?? []).map((e) => e.itemId)])].filter((id) => code.has(id)).sort((p, q) => at(p) - at(q));
    return [{ label: title(key, labels[key]), state: level === "empty" ? "open" as const : "proposed" as const, confidence: level === "low" ? a?.confidence : undefined, codes: ids.map((id) => code.get(id)!).slice(0, 6) }];
  });
  const lang = locale === "es" ? "es" : "en";
  const asked = startingQuestions(brief, board.length > 0, lang, (k) => title(k, labels[k]), strings.questions);
  // What agents learned with the person, newest first. A record of the team's sessions: a client's copy goes without it
  const learnedLines = clean ? [] : (system.learned ?? []).map((l) => {
    const who = l.by && l.via ? strings.learned.with(l.by, l.via) : l.by ?? l.via ?? "";
    return `- ${l.rejected ? `**${strings.learned.rejected}${l.area ? ` · ${title(l.area, labels[l.area])}` : ""}:** ` : l.area ? `**${title(l.area, labels[l.area])}:** ` : ""}${l.section ? `(${l.section}) ` : ""}${one(l.note)} _(${[who, l.at.slice(0, 10)].filter(Boolean).join(", ")})_`;
  });
  const guideLines = strings.guide.lines({
    project, open,
    pages: byKind.map(({ k, ids }) => ({ name: strings.composition.kinds[k], n: ids.length })),
    areas: Object.fromEntries(SYSTEM_AREAS.map((k) => [k, title(k, labels[k])])) as Record<SystemArea, string>,
    pagesHeading: byKind.length ? title("pages", strings.composition.pages) : null,
    repeats: patterns.length ? strings.composition.repeats : null,
    content: texts.length ? title("content", strings.content) : null, contentCodes: texts.map((id) => code.get(id)!).filter(Boolean),
    rejects: rejected.length ? title("rejects", strings.rejects.heading) : null, neverCount: rejected.length,
    tokens: css.length || derived.length ? strings.brand.tokens : null, use: title("use", strings.use.heading),
    why: strings.why, never: strings.never, client: client?.name ?? null,
    questions: asked.open.length ? title("questions", strings.questions.heading) : null, openQuestions: asked.open.length,
    learned: learnedLines.length ? title("learned", strings.learned.heading) : null,
    blocking: asked.blocking, picked: (system.learned ?? []).some((l) => l.pick),
  });
  blocks.push({ kind: "section", id: "guide", heading: title("guide", strings.guide.heading), lines: setup.complete ? guideLines : [strings.guide.setupOpen, "", ...guideLines] });
  blocks.push({ kind: "section", id: "questions", heading: title("questions", strings.questions.heading), lines: asked.lines });
  if (learnedLines.length) blocks.push({ kind: "section", id: "learned", heading: title("learned", strings.learned.heading), lines: [`> ${strings.learned.intro}`, "", ...learnedLines] });
  const outlines = system.outlines ?? [];
  if (outlines.length) blocks.push({ kind: "section", id: "landing", heading: title("landing", strings.landing.heading), lines: outlines.flatMap((o) => [
    `### ${one(o.name)}`, "", ...(o.draft ? [`> ${strings.landing.draft}`, ""] : []), `**${strings.landing.goal}:** ${one(o.goal)}`, "",
    ...o.sections.map((x, i) => {
      const refs = x.refs.map((id) => code.get(id)).filter(Boolean);
      return `${i + 1}. **${x.kind}:** ${one(x.job)}${x.proof ? ` ${strings.landing.proof}: ${one(x.proof)}.` : ""}${x.cta ? ` ${strings.landing.cta}: ${one(x.cta)}.` : ""}${refs.length ? ` (${refs.join(", ")})` : ""}`;
    }), "",
    ...(o.directions?.length ? [`**${strings.landing.directions}:**`, "", ...o.directions.map((d) => {
      const refs = d.refs.map((id) => code.get(id)).filter(Boolean);
      return `- **${one(d.name)}:** ${one(d.change)}${refs.length ? ` (${refs.join(", ")})` : ""}`;
    }), ""] : []),
  ]) });
  blocks.push({ kind: "section", id: "use", heading: title("use", strings.use.heading), ...byHandOr("use", useLines) });
  if (rejected.length) blocks.push({ kind: "section", id: "rejects", heading: title("rejects", strings.rejects.heading), mark: strings.required, lines: [`> ${strings.rejects.intro}`, "", ...rejected] });
  if (about?.trim()) blocks.push({ kind: "section", id: "project", heading: title("project", strings.project), lines: [about.trim()] });
  // A brief with no copy pasted in borrows the client's own words, as its site says them
  const heard = readBrief(brief)?.voiceSamples.length ? [] : clientCopy.map(one).filter(Boolean);
  const briefed = [...briefLines(brief, strings.brief), ...(heard.length ? [`- **${strings.clientCopy}:**`, "", ...heard.flatMap((t, i) => [...(i ? [""] : []), `  > ${t}`])] : [])];
  if (briefed.length) blocks.push({ kind: "section", id: "brief", heading: title("brief", strings.brief.heading), lines: briefed });
  // The project's content: each text the team pasted, whole and as given, under its title. It is material to
  // place, not a reference to read a look from, so it sits with what the project is and not in the appendix
  type Part = { itemId: string; head: string[]; body: string[] };
  /** A text whole: its heading, who brought it and what was said of it (or what the team wrote over that), then its words */
  const textPart = (id: string, byLabel: string): Part => {
    const it = items[id];
    const head = [`### ${code.get(id)} · ${it.name}`, ""];
    const byHand = doc[`texthead:${id}`];
    if (byHand) head.push(...byHand.split("\n"), "");
    else {
      if (it.by) head.push(`- **${byLabel}:** ${it.by}${it.date ? ` · ${it.date}` : ""}`);
      if (it.said?.length) {
        head.push(`- **${strings.said}:**`);
        for (const w of it.said) head.push(`  - ${w.who}: ${told(w, 600)}`);
      }
      if (it.by || it.said?.length) head.push("");
    }
    return { itemId: id, head, body: lowerHeadings(it.text ?? it.what ?? "") };
  };
  // Only the texts whose words are in hand can be typed over: one still loading shows its first lines
  const typed = (parts: Part[]) => parts.map((p) => ({ ...p, itemId: p.itemId && items[p.itemId].text === undefined ? "" : p.itemId }));
  if (texts.length) {
    const intro = doc["content-intro"] ? [...doc["content-intro"].split("\n"), ""] : [`> ${strings.contentIntro}`, ""];
    const parts = texts.map((id) => textPart(id, strings.savedBy));
    const lines = [...intro, ...parts.flatMap((p) => [...p.head, ...p.body, ""])];
    while (lines[lines.length - 1] === "") lines.pop();
    blocks.push({ kind: "section", id: "content", heading: title("content", strings.content), lines, texts: { intro, items: typed(parts) } });
  }
  if (system.summary) blocks.push({ kind: "summary", heading: title("summary", strings.summary), text: system.summary });
  // The brand in its own words: its statement and what it is, as the presentation opens with them
  const introLines = brand ? brandIntroLines(brand) : [];
  if (introLines.length) blocks.push({ kind: "section", id: "brand-intro", heading: title("brand-intro", strings.brand.intro), ...byHandOr("brand-intro", introLines) });
  const repeated = patterns.map((p) => {
      const ids = [...p.refs].sort((x, y) => at(x) - at(y));
      return { line: `- **${strings.composition.repeats}:** ${strings.composition.describe(p)}. ${strings.composition.of(p.refs.length, p.of)} (${ids.map((id) => code.get(id)).filter(Boolean).join(", ")})`, refs: ids.map((id) => `  - ${cite(id)}`) };
    });
  for (const key of SYSTEM_AREAS) {
    const a = system.areas.find((x) => x.area === key);
    const skillRecs = areaSkillLines(key, skills, lang);
    const base = { kind: "area" as const, area: key, heading: title(key, labels[key]), whyLabel: strings.why, neverLabel: strings.never, openText: strings.open, evidenceLabel: strings.evidence, never: a?.never ?? "" };
    const meta: string[] = [];
    if (a?.decision) {
      const level = confidenceOf(a);
      meta.push(`- **${a.source === "team" ? strings.decided : strings.proposed}**${level === "low" ? ` · ${strings.confidence} ${a.confidence}/100` : ""}`);
    }
    if (a?.evidence.length) {
      meta.push(`- **${strings.evidence} (${a.evidence.length}):**`);
      for (const e of a.evidence) {
        meta.push(`  - ${cite(e.itemId)}${e.take ? `. ${strings.take}: ${e.take}` : ""}`);
        // The words behind it, next to what it brings: why the team saved it
        for (const w of (items[e.itemId]?.said ?? []).slice(0, 3)) meta.push(`    - ${w.who}: ${told(w, 220)}`);
      }
    }
    // Only what changes a decision (a proposal, taken, waiting or turned down): a loose comment serves the team, not the agent
    const lines = (talk[key] ?? []).filter((l) => l.proposal);
    if (lines.length) {
      meta.push(`- **${strings.talk} (${lines.length}):**`);
      for (const l of lines) {
        const on = l.label ?? (l.itemId && items[l.itemId] ? `${code.get(l.itemId) ?? ""} ${items[l.itemId].name}`.trim() : "");
        if (l.proposal) {
          meta.push(`  - ${l.who}${l.proposal.via ? ` (${l.proposal.via})` : ""} ${strings.proposes} (${strings.states[l.proposal.state]}): ${quote(l.proposal.decision, 600)}`);
          if (l.text && l.text !== l.proposal.decision) meta.push(`    - ${quote(l.text)}`);
          if (l.proposal.state === "rejected" && l.proposal.reason) meta.push(`    - ${strings.whyNot}: ${quote(l.proposal.reason)}`);
        } else meta.push(`  - ${l.who}${on ? `, ${strings.on(on)}` : ""}: ${quote(l.text)}`);
      }
    }
    const byHand = doc[`meta:${key}`];
    const tokens = brand ? brandTokenLines(key, brand, strings.brand, { href, cite: (id) => cite(id) }) : [];
    // Codes in the line, so an agent reading the file finds them under References; only references the file knows
    const signalled = a?.decision ? a.support.map((x) => {
      const ids = x.itemIds.filter((id) => items[id]).sort((p, q) => at(p) - at(q));
      const codes = ids.map((id) => code.get(id)).filter(Boolean);
      return { line: `- **${strings.support}:** ${strings.supportOf(strings.signals[x.signal] ?? x.signal, x.itemIds.length, x.of)}${codes.length ? ` (${codes.join(", ")})` : ""}`, refs: ids.map((id) => `  - ${cite(id)}`) };
    }) : [];
    const support = key === "layout" ? [...repeated, ...signalled] : signalled;
    // The values' first title is marked required; the imagery's examples are references, so they never are
    const valuesAt = tokens.findIndex((l) => /^\*\*[^*]+\*\*$/.test(l) && l !== `**${strings.brand.examples}**`);
    const marks = { required: strings.required, guidance: strings.guidance, must: strings.must, should: strings.should, valuesAt };
    blocks.push({ ...base, marks, decision: a?.decision ?? "", why: a?.decision ? a.why : "", meta: byHand ? byHand.split("\n") : meta, metaEdited: !!byHand, ...(tokens.length ? { tokens } : {}), ...(support.length ? { support } : {}), ...(skillRecs.length ? { skillRecs } : {}) });
  }
  /** One reference's entry: what it is, who brought it, what was said of it and what it brings to each area */
  const refLines = (id: string, byLabel: string): string[] => {
    const it = items[id];
    // Rewritten by hand from the reference's panel: its heading (its code) stays the app's
    const byHand = doc[`ref:${id}`];
    if (byHand) return byHand.split("\n");
    const out: string[] = [];
    const kind = it.kind ?? "web";
    const at = it.source ?? it.web;
    const where = kind === "image" && !it.source ? strings.kinds.image.toLowerCase() : readableDomain(abs(at).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")).slice(0, 60);
    out.push(`- **${strings.kinds[kind]}:** [${where}](${abs(at)})`);
    if (it.what) out.push(`- **${strings.what}:** ${one(it.what)}`);
    if (isPage(it.composition) && it.composition.sketch) out.push(`- **${strings.composition.build}:** ${one(it.composition.sketch)}`);
    if (it.by) out.push(`- **${byLabel}:** ${it.by}${it.date ? ` · ${it.date}` : ""}`);
    if (it.said?.length) {
      out.push(`- **${strings.said}:**`);
      for (const w of it.said) out.push(`  - ${w.who}: ${told(w, 600)}`);
    }
    const brings = system.areas.flatMap((a) => a.evidence.filter((e) => e.itemId === id).map((e) => ({ area: a.area, take: e.take })));
    if (brings.length) {
      out.push(`- **${strings.brings}:**`);
      for (const b of brings) out.push(`  - ${labels[b.area]}`);
    } else out.push(`- **${strings.brings}:** _${strings.noArea}_`);
    if (it.tags?.length) out.push(`- **${strings.tags}:** ${it.tags.join(", ")}`);
    out.push(...measuredLines(it.measured, strings.measured));
    return out;
  };
  if (byKind.length) {
    const lines = [`> ${strings.composition.pagesIntro}`, ""];
    for (const { k, ids } of byKind) {
      lines.push(`- **${strings.composition.kinds[k]} (${ids.length}):**`);
      for (const id of ids) lines.push(`  - ${cite(id)}: ${one(items[id].composition!.sketch)}`);
    }
    blocks.push({ kind: "section", id: "pages", heading: title("pages", strings.composition.pages), ...byHandOr("pages", lines) });
  }
  // How to build it with the tools the team switched on, after the decisions it builds and before the appendix
  // Typed over by hand, a skill's section stays as the team left it until they bring the app's back
  // What crosses every area (slop, accessibility, the stack), after the areas, as each area ends with its own
  const across = areaSkillLines("all", skills, lang).slice(1).map((l) => l.replace(/^  /, ""));
  if (across.length) blocks.push({ kind: "section", id: "skills-all", heading: title("skills-all", lang === "es" ? "Skills para todo el sistema" : "Skills for the whole system"), lines: across });
  for (const s of skillSections(system, skills, locale, stored)) blocks.push({ kind: "section", ...s, heading: title(s.id, s.heading), lines: doc[s.id] ? doc[s.id].split("\n") : s.lines, edited: !!doc[s.id] });
  // The values as variables, ready to paste into a project
  if (css.length) blocks.push({ kind: "section", id: "brand-tokens", heading: title("brand-tokens", strings.brand.tokens), mark: strings.required, ...byHandOr("brand-tokens", [`> ${strings.brand.tokensIntro}`, "", ...css]) });
  // No brand drawn: the values the areas already decided, gathered so an agent need not dig them out of the prose
  else {
    if (derived.length) blocks.push({ kind: "section", id: "area-tokens", heading: title("area-tokens", strings.brand.tokens), mark: strings.required, ...byHandOr("area-tokens", [`> ${strings.brand.areaTokensIntro}`, "", ...derived]) });
  }
  // Every reference once, with what it is, what was said of it and what it brings to each area
  // (a text is already whole under Content)
  const refs = board.filter((id) => items[id] && items[id].kind !== "text");
  if (refs.length) {
    const lines: string[] = [strings.refsIntro, ""];
    for (const id of refs) lines.push(`### ${code.get(id)} · ${items[id].name}`, "", ...refLines(id, strings.savedBy), "");
    while (lines[lines.length - 1] === "") lines.pop();
    blocks.push({ kind: "section", id: "refs", heading: title("refs", `${strings.refs} (${refs.length})`), lines: doc.refs ? doc.refs.split("\n") : lines, edited: !!doc.refs });
  }
  // The rules once more, last: the file opens with the walk and ends with this, so a long file is held at both ends
  blocks.push({ kind: "section", id: "before", heading: title("before", strings.before.heading), lines: strings.before.lines({ never: strings.never, rejects: rejected.length ? title("rejects", strings.rejects.heading) : null, learned: title("learned", strings.learned.heading) }) });
  return blocks;
}

/** What one reference is in the file: its entry under References (the lines under its "### R3 · …" heading)
 *  and the areas that cite it, each with the lines that do */
export function refSlice(blocks: CriterioBlock[], code: string): { heading: string; entry: string[]; cited: { area: SystemArea; heading: string; lines: string[] }[] } | null {
  const refs = blocks.find((b): b is Extract<CriterioBlock, { kind: "section" }> => b.kind === "section" && b.id === "refs");
  const at = refs?.lines.findIndex((l) => l.startsWith(`### ${code} \u00b7`)) ?? -1;
  if (!refs || at < 0) return null;
  let end = refs.lines.findIndex((l, i) => i > at && l.startsWith("### "));
  if (end < 0) end = refs.lines.length;
  const entry = refs.lines.slice(at + 1, end);
  while (entry[0] === "") entry.shift();
  while (entry[entry.length - 1] === "") entry.pop();
  // An area's citation is its "- **R3** …" line and the words said under it (indented deeper)
  const cited = blocks.filter((b): b is Extract<CriterioBlock, { kind: "area" }> => b.kind === "area").flatMap((b) => {
    const out: string[] = [];
    b.meta.forEach((l, i) => {
      if (!l.startsWith(`  - **${code}** `)) return;
      out.push(l);
      for (let j = i + 1; j < b.meta.length && b.meta[j].startsWith("    "); j++) out.push(b.meta[j]);
    });
    return out.length ? [{ area: b.area, heading: b.heading, lines: out }] : [];
  });
  return { heading: refs.lines[at], entry, cited };
}

/** The References section with one entry's lines swapped (the section was rewritten whole by hand) */
export function withRefEntry(lines: string[], code: string, entry: string[]): string[] {
  const at = lines.findIndex((l) => l.startsWith(`### ${code} \u00b7`));
  if (at < 0) return lines;
  let end = lines.findIndex((l, i) => i > at && l.startsWith("### "));
  if (end < 0) end = lines.length;
  return [...lines.slice(0, at + 1), "", ...entry, ...(end < lines.length ? [""] : []), ...lines.slice(end)];
}

/** An area's status and references as the team rewrote them in the file, read back: whether it says decided or
 *  proposed, and every reference it cites by code ("- **R3** …. Take: …"), in order, with its take. The words said
 *  under a reference and the conversation are a record, not read back */
export function readAreaMeta(text: string, strings: { decided: string; proposed: string; take: string }): { status: "decided" | "proposed" | null; refs: { code: string; take: string }[] } {
  const lines = text.split("\n");
  const status = lines.some((l) => l.includes(`**${strings.decided}**`)) ? "decided" : lines.some((l) => l.includes(`**${strings.proposed}**`)) ? "proposed" : null;
  const refs: { code: string; take: string }[] = [];
  for (const l of lines) {
    const m = l.match(/^\s*[-*]\s+\*\*(R\d+)\*\*(.*)$/);
    if (!m || refs.some((r) => r.code === m[1])) continue;
    const at = m[2].indexOf(`${strings.take}:`);
    refs.push({ code: m[1], take: at < 0 ? "" : m[2].slice(at + strings.take.length + 1).trim() });
  }
  return { status, refs };
}

/** An area's rule lines by strength: "`id` MUST: …" and "`id` SHOULD: …" apart, everything else (NEVER, or no id) is a Never */
export function splitRules(text: string): { never: string[]; must: string[]; should: string[] } {
  const out = { never: [] as string[], must: [] as string[], should: [] as string[] };
  for (const l of text.split("\n").map((x) => x.trim()).filter(Boolean)) {
    const m = /^`[^`\n]+`\s+(MUST|SHOULD):/.exec(l);
    (m ? (m[1] === "MUST" ? out.must : out.should) : out.never).push(l);
  }
  return out;
}

/** An area's never list: one rule a line under its bold label. `mark` is the file's "(required)": the Markdown view
 *  types over the list without it, so its parser never meets it */
export const neverMd = (b: { never: string; neverLabel: string }, mark?: string) => [mark ? `**${b.neverLabel}** (${mark}):` : `**${b.neverLabel}:**`, ...b.never.split("\n").filter(Boolean).map((l) => `- ${l}`)].join("\n");

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** An area's text as a person types it in the Markdown view, read back: the decision, the why under its bold label and
 *  the never list. The never label is read also as the copied file marks it ("**Never** (required):"), pasted back in */
export function parseAreaText(text: string, whyLabel: string, neverLabel: string): { decision: string; why: string; never: string } {
  const n = new RegExp(`^\\*\\*${escRe(neverLabel)}(?::\\*\\*|\\*\\* \\([^)\\n]*\\):)[ \\t]*`, "m").exec(text);
  const before = n ? text.slice(0, n.index) : text;
  const never = n ? text.slice(n.index + n[0].length).split("\n").map((l) => l.trim().replace(/^[-*·]\s*/, "")).filter(Boolean).join("\n") : "";
  const w = new RegExp(`^\\*\\*${escRe(whyLabel)}:\\*\\*[ \\t]*`, "m").exec(before);
  if (!w) return { decision: before.trim(), why: "", never };
  return { decision: before.slice(0, w.index).trim(), why: before.slice(w.index + w[0].length).trim(), never };
}

/** Where the app is for anyone outside this machine (lib/share-origin.ts falls back to the same) */
export const PUBLIC_ORIGIN = "https://app.criterio.design";
const LOCAL_ORIGIN = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?=[/)\s"']|$)/g;
/** A link to this machine opens nowhere else: whichever place the file is built in, it leaves with the public address */
export const publicLinks = (md: string) => md.replace(LOCAL_ORIGIN, PUBLIC_ORIGIN);

/** The file, from its blocks */
export function blocksToMd(blocks: CriterioBlock[]): string {
  const L: string[] = [];
  const p = (s = "") => L.push(s);
  for (const b of blocks) {
    if (b.kind === "head") { for (const line of b.lines) p(line); p(); continue; }
    if (b.kind === "summary") { p(`## ${b.heading}`); p(); p(b.text); p(); continue; }
    if (b.kind === "section") { p(`## ${b.heading}${b.mark ? ` (${b.mark})` : ""}`); p(); for (const line of b.lines) p(line); p(); continue; }
    p(`## ${b.heading}`);
    p();
    if (!b.decision) { p(`_${b.openText}_`); p(); }
    else { p(b.decision); p(); if (b.why) { p(`**${b.whyLabel}:** ${b.why}`); p(); } }
    if (b.never) {
      // A rule written MUST or SHOULD is not a Never: the file keeps each strength under its own label
      const { never, must, should } = b.marks ? splitRules(b.never) : { never: b.never.split("\n").filter(Boolean), must: [], should: [] };
      if (never.length) { p(neverMd({ ...b, never: never.join("\n") }, b.marks?.required)); p(); }
      if (must.length) { p(neverMd({ neverLabel: b.marks!.must, never: must.join("\n") }, b.marks?.required)); p(); }
      if (should.length) { p(neverMd({ neverLabel: b.marks!.should, never: should.join("\n") }, b.marks?.guidance)); p(); }
    }
    if (b.tokens?.length) { b.tokens.forEach((line, i) => p(i === b.marks?.valuesAt ? `${line} (${b.marks.required})` : line)); p(); }
    // The references' line as the app writes it, or as the team left it: "- **References (3):**"
    const cites = new RegExp(`^- \\*\\*${escRe(b.evidenceLabel)} \\((\\d+)\\):\\*\\*$`);
    if (b.meta.length) { for (const line of b.meta) p(b.marks ? line.replace(cites, `- **${b.evidenceLabel} ($1)** (${b.marks.guidance}):`) : line); p(); }
    if (b.support?.length) { for (const x of b.support) p(x.line); p(); }
    if (b.skillRecs?.length) { for (const line of b.skillRecs) p(line); p(); }
  }
  return publicLinks(L.join("\n"));
}

/** The parts a reader can ask for: the whole file, the decisions (without the long lists at the end), the walk
 *  ("guide": where to start, the starting questions, what was learned, the rules it leans on and every Never), or one area */
export const CRITERIO_PARTS = ["all", "decisions", "guide", ...SYSTEM_AREAS] as const;
export type CriterioPart = (typeof CRITERIO_PARTS)[number];
export const isCriterioPart = (x: unknown): x is CriterioPart => (CRITERIO_PARTS as readonly unknown[]).includes(x);

/** One part of the file as Markdown. "decisions" leaves out every reference's own entry and the texts, whole; "guide"
 *  is the head, Start here, the starting questions, what was learned, How to use this file, every Never and the closing list, the first read;
 *  an area's name gives that area under the file's head, its "How to use this file" and the closing list, so a single area still says what binds */
export function partMd(blocks: CriterioBlock[], part: CriterioPart = "all"): string {
  if (part === "all") return blocksToMd(blocks);
  const section = (b: CriterioBlock, ...ids: string[]) => b.kind === "section" && ids.includes(b.id);
  return blocksToMd(blocks.filter((b) => part === "decisions"
    ? b.kind !== "section" || !["refs", "content"].includes(b.id)
    : part === "guide"
      ? b.kind === "head" || section(b, "guide", "questions", "learned", "landing", "use", "rejects", "before")
      : b.kind === "head" || section(b, "use", "before") || (b.kind === "area" && b.area === part)));
}

export function renderCriterioMd(input: CriterioMdInput): string {
  return blocksToMd(criterioBlocks(input));
}
