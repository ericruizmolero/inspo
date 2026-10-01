// Polish (step 3 of Curar): a project's brief and the decisions taken while cleaning its board.
// Shared by client and server; stored as one JSON in project.polish.

/** Who the project speaks to. Keys only: labels live in lib/i18n/<locale>/ui.ts (polish.audiences). */
export const AUDIENCES = ["consumers", "businesses", "creatives", "developers", "investors", "community"] as const;
export type Audience = (typeof AUDIENCES)[number];

export interface PolishBrief {
  /** A SECTORS key, or null when none fits */
  sector: string | null;
  /** What the project is, in the team's words */
  about: string;
  audience: Audience[];
  audienceNote: string;
  /** STYLES keys, at most two: the tone the board should keep */
  tone: string[];
  /** Ids of references on the board that clash with where the project goes */
  avoidItems: string[];
  avoid: string;
  /** What a visitor must understand in the first five seconds */
  firstSeconds: string;
  /** ISO */
  updatedAt: string;
  updatedBy?: string;
}

export interface DupeGroup { ids: string[]; reason: string }
export interface OffTone { id: string; reason: string }
/** Two references that pull the project in opposite directions: the team picks one, or keeps both on purpose */
export interface Duel { ids: [string, string]; reason: string }

/** The last run of the games, kept so reopening the modal does not pay for the same answer */
export interface PolishRun {
  /** Fingerprint of the brief and the prompt version this run answered: a changed brief makes it stale */
  stamp: string;
  /** The board the model saw; references added since are not in the answer */
  itemIds: string[];
  dupes: DupeGroup[];
  offTone: OffTone[];
  /** Absent in runs before the duel game */
  duels?: Duel[];
  model: string;
  at: string;
}

export interface PolishDecisions {
  /** Pairs confirmed as not duplicates, each as the two ids sorted and joined with "|" */
  notDupes: string[];
  /** Ids confirmed to fit the tone despite the model's doubt */
  keptTone: string[];
  /** Duels settled by keeping both, as pair keys */
  keptDuels?: string[];
}

export interface PolishState {
  brief: PolishBrief | null;
  decisions: PolishDecisions;
  run: PolishRun | null;
}

export const EMPTY_POLISH: PolishState = { brief: null, decisions: { notDupes: [], keptTone: [] }, run: null };

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export const BRIEF_TEXT_MAX = 500;

/** A run minus what the team already answered and what left the board: what is still worth asking. */
export function pendingOf(state: PolishState, boardIds: Set<string>): { dupes: DupeGroup[]; offTone: OffTone[]; duels: Duel[] } {
  const run = state.run;
  if (!run) return { dupes: [], offTone: [], duels: [] };
  const confirmed = new Set(state.decisions.notDupes);
  const dupes = run.dupes
    .map((g) => ({ ...g, ids: g.ids.filter((id) => boardIds.has(id)) }))
    .filter((g) => g.ids.length >= 2)
    // A group every pair of which was answered is not a question any more
    .filter((g) => g.ids.some((a, i) => g.ids.slice(i + 1).some((b) => !confirmed.has(pairKey(a, b)))));
  const kept = new Set(state.decisions.keptTone);
  const offTone = run.offTone.filter((o) => boardIds.has(o.id) && !kept.has(o.id));
  // A duel is over once one side left the board (settled either way) or both were kept on purpose
  const keptDuels = new Set(state.decisions.keptDuels ?? []);
  const duels = (run.duels ?? []).filter((d) => d.ids.every((id) => boardIds.has(id)) && !keptDuels.has(pairKey(d.ids[0], d.ids[1])));
  return { dupes, offTone, duels };
}
