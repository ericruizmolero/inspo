import type { BrandSpec } from "./brand";
// The project's system: what the project has decided about its design, area by area, alive from
// the first reference. The board feeds it (a model proposes), the team confirms or writes over it,
// and agents read it as criterio.md. Shared by client and server.

/** The eight areas of a brand system (after brand.dropbox.com), in the order the screen reads them */
export const SYSTEM_AREAS = ["typography", "color", "layout", "motion", "iconography", "logo", "imagery", "voice"] as const;
export type SystemArea = (typeof SYSTEM_AREAS)[number];

/** A reference behind a decision and what it brings to it */
export interface SystemEvidence {
  itemId: string;
  /** What to take from this reference for this area, one short instruction (max 20 words) */
  take: string;
  /** Filed under this area by a person from the board: runs keep it and decide from it */
  pinned?: boolean;
}

export type SystemSource = "model" | "team";

/** A signal of the tagger's vocabulary (lib/taxonomy.ts SIGNALS) behind a decision, and the board's references
 *  that show it: "in 12 of 40" is itemIds.length of `of`. Written by the run that made the decision */
export interface AreaSupport {
  signal: string;
  itemIds: string[];
  /** References on the board when it was counted */
  of: number;
}

export interface SystemAreaState {
  area: SystemArea;
  /** The decision as it stands; empty = not decided yet */
  decision: string;
  /** 0-100: how far the board backs the decision. 0 when empty */
  confidence: number;
  evidence: SystemEvidence[];
  /** "model": proposed from the board, the next run may change it. "team": a person wrote or confirmed it, runs leave it alone. null: empty */
  source: SystemSource | null;
  decidedBy: string | null;
  /** The criterio: why this decision and not the rest */
  why: string;
  /** What this area must never do, one rule per line (what was tried and thrown away). Kept apart from the decision */
  never: string;
  /** The agent's curation of what the board offers for this area, for the team to review */
  curation: AreaCuration | null;
  /** How many references show the signals behind the decision. Empty when the area is, or when no signal backs it */
  support: AreaSupport[];
  /** ISO */
  updatedAt: string;
}

/** One thing the board offers for an area: a family, a palette, an easing, a capture, a line of copy */
export interface AreaCandidate {
  id: string;
  label: string;
  /** Short qualifier: the role of a family, the number of colours, the duration of an easing */
  detail?: string;
  /** References it comes from */
  refs: string[];
  /** What the specimen needs, by area */
  visual: { families?: { family: string; weights: number[]; role: string }[]; colors?: { hex: string; name: string }[]; easing?: string; durationMs?: number; image?: string | null; text?: string; radii?: string[]; icons?: string[] };
}

export interface CandidateVerdict {
  id: string;
  keep: boolean;
  /** One line: what it brings, or why it goes */
  reason: string;
  /** Set by a person: the agent's verdict was flipped or its reason rewritten */
  byTeam?: boolean;
}

export interface AreaCuration {
  candidates: AreaCandidate[];
  verdicts: CandidateVerdict[];
  model: string;
  /** ISO */
  at: string;
}

/** The last model run, kept to tell when the board has moved on */
export interface SystemRun {
  /** The references the model read, in board order */
  itemIds: string[];
  /** Fingerprint of the words the model read (notes, threads, briefs): a change makes the run stale */
  stamp: string;
  model: string;
  /** The system prompt's version (lib/prompts.ts); runs before it was kept lack it */
  version?: number;
  /** ISO */
  at: string;
  /** References on the board the run left out (MAX_BOARD in lib/system.ts); runs before it was kept lack it */
  omitted?: number;
}

export interface ProjectSystem {
  projectId: string;
  /** The project's criterio in one paragraph; empty until the first run */
  summary: string;
  /** Always the eight, in SYSTEM_AREAS order */
  areas: SystemAreaState[];
  run: SystemRun | null;
  /** The parts of criterio.md the team rewrote by hand, by part ("head", "refs", "meta:<area>") */
  doc?: Record<string, string>;
  /** The brand as values (types/brand.ts). Only the project's own reading carries it; the sidebar's list does not */
  brand?: BrandSpec | null;
  /** ISO; null when nothing was ever written */
  updatedAt: string | null;
}

/** The parts of criterio.md that can be rewritten by hand over what the app writes */
// "skills": the skills switched on for criterio.md, comma separated (lib/md-skills.ts)
/** What a pass of the model asked for by hand can be told to do (the "Improve with AI" dialog) */
export const IMPROVE_AIMS = ["order", "copy", "refs"] as const;
export type ImproveAim = (typeof IMPROVE_AIMS)[number];
export const IMPROVE_NOTE_MAX = 400;
/** The scope of a pass asked for by hand: what to work on, in which areas, and anything the team adds in words */
export interface SystemFocus { aims: ImproveAim[]; areas: SystemArea[]; note?: string }

export const DOC_PARTS = ["head", "use", "refs", "skills", ...SYSTEM_AREAS.map((a) => `meta:${a}`)];
/** Those, and one reference's entry under References ("ref:<item id>"), rewritten from the reference's panel; a heading
 *  ("title:<block id>"), a skill's or the brand's section ("skill:<id>", "brand-…"), the Content intro and a text's
 *  who-said-what ("texthead:<item id>") */
export const isDocPart = (part: string) => DOC_PARTS.includes(part) || part === "content-intro" || /^(ref|texthead|skill):[\w-]{1,64}$/.test(part) || /^brand-[\w-]{1,32}$/.test(part) || /^title:[\w:-]{1,72}$/.test(part);
export const DOC_PART_MAX = 60_000;

/** A decision a person writes can run to a few paragraphs (it is typed in the file, with line breaks) */
export const DECISION_MAX = 2000;
/** A decision's text as it is kept: its own line breaks stay (a paragraph is a paragraph), the rest of the white space is tidied */
export const cleanDecision = (v: unknown) => String(v ?? "").replace(/\r/g, "").replace(/[^\S\n]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, DECISION_MAX);
/** The never list of an area, all its lines together */
export const NEVER_MAX = 800;

/** Three looks on screen: nothing decided, a proposal the board half supports, a decision to build on */
export type Confidence = "empty" | "low" | "high";
export const confidenceOf = (a: Pick<SystemAreaState, "decision" | "confidence" | "source">): Confidence =>
  !a.decision ? "empty" : a.source === "team" || a.confidence >= 65 ? "high" : "low";

/** An empty system: every area blank. What a project has from the minute it is created */
export function emptySystem(projectId: string): ProjectSystem {
  const now = new Date(0).toISOString();
  return {
    projectId,
    summary: "",
    areas: SYSTEM_AREAS.map((area) => ({ area, decision: "", confidence: 0, evidence: [], source: null, decidedBy: null, why: "", never: "", curation: null, support: [], updatedAt: now })),
    run: null,
    updatedAt: null,
  };
}

/** How the board moved since the run: references it never read, and whether it reads something else now */
export function staleness(system: ProjectSystem, boardIds: string[], stamp?: string): { unread: number; wordsChanged: boolean } {
  if (!system.run) return { unread: boardIds.length, wordsChanged: false };
  const read = new Set(system.run.itemIds);
  // What the run left out on purpose (the board's cut) is not news
  return { unread: Math.max(0, boardIds.filter((id) => !read.has(id)).length - (system.run.omitted ?? 0)), wordsChanged: !!stamp && stamp !== system.run.stamp };
}

/** A template: a whole system (eight areas with decision, why and never, the paragraph) and the recipe of the
 *  work it came from, to start a project from. "from" and "to" say what it turned into what: a client's site
 *  and the redesign, for instance. */
export interface ProjectTemplate {
  /** Where the work started (the client's site), when there was one */
  from: string;
  /** What it ended as (the published result) */
  to: string;
  /** What it is, in a sentence */
  about: string;
  /** A recording of the result (a Screen Studio share, a video file): its thumbnail plays it on hover */
  video?: string;
  /** A built-in template (its folder under docs/templates): every workspace has it, and it is not the workspace's to delete */
  builtin?: string;
  /** The picture of the result when it is not a page to capture (a post, for instance): a file of the template's
   *  folder, stored with its board */
  poster?: string;
  /** Worked out from the outside: somebody else's result and what they told of how it was made, not the team's own work */
  reverse?: boolean;
}
export const RECIPE_MAX = 200_000;

/** A template as the library lists it */
export interface TemplateCard {
  id: string;
  name: string;
  template: ProjectTemplate;
  system: ProjectSystem;
  /** Characters of the recipe; 0 when it has none */
  recipeSize: number;
  createdAt: string;
}
