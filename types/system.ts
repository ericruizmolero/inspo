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
  /** The agent's curation of what the board offers for this area, for the team to review */
  curation: AreaCuration | null;
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
  /** ISO */
  at: string;
}

export interface ProjectSystem {
  projectId: string;
  /** The project's criterio in one paragraph; empty until the first run */
  summary: string;
  /** Always the eight, in SYSTEM_AREAS order */
  areas: SystemAreaState[];
  run: SystemRun | null;
  /** ISO; null when nothing was ever written */
  updatedAt: string | null;
}

export const DECISION_MAX = 600;

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
    areas: SYSTEM_AREAS.map((area) => ({ area, decision: "", confidence: 0, evidence: [], source: null, decidedBy: null, why: "", curation: null, updatedAt: now })),
    run: null,
    updatedAt: null,
  };
}

/** How the board moved since the run: references it never read, and whether it reads something else now */
export function staleness(system: ProjectSystem, boardIds: string[], stamp?: string): { unread: number; wordsChanged: boolean } {
  if (!system.run) return { unread: boardIds.length, wordsChanged: false };
  const read = new Set(system.run.itemIds);
  return { unread: boardIds.filter((id) => !read.has(id)).length, wordsChanged: !!stamp && stamp !== system.run.stamp };
}
