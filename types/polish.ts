// Polish (step 3 of Curar): a project's brief and the decisions taken while cleaning its board.
// Shared by client and server; stored as one JSON in project.polish.

/** Who the project speaks to. Keys only: labels live in lib/i18n/<locale>/ui.ts (polish.audiences). */
export const AUDIENCES = ["consumers", "businesses", "creatives", "developers", "investors", "community"] as const;
export type Audience = (typeof AUDIENCES)[number];

/** The one question at the door: what do you take from this reference? (Flujo de Criterio, step 1) */
export const TAKES = ["color", "typography", "composition", "rhythm", "tone", "detail"] as const;
export type Take = (typeof TAKES)[number];
export interface Why {
  takes: Take[];
  note: string;
  updatedAt: string;
  updatedBy?: string;
}

/** A comfortable board (Flujo de Criterio: "~12 referencias elegidas, cada una con su porqué"); a soft limit */
export const BOARD_TARGET = 12;

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
  /** A redesign: the reference on the board that is the client's current site. Its copy, typefaces, logo and figures are the source of truth */
  clientItemId?: string | null;
  /** ISO */
  updatedAt: string;
  updatedBy?: string;
}

export interface DupeGroup { ids: string[]; reason: string }
export interface OffTone { id: string; reason: string }
/** Two references that pull the project in opposite directions: the team picks one, or keeps both on purpose */
export interface Duel { ids: [string, string]; reason: string }
/** A reference that weighs least against the brief: proposed for the archive while the board is above the target */
export interface Light { id: string; reason: string }

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
  /** Least weight first; absent in runs before the size game */
  light?: Light[];
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
  /** Ids kept on the board despite weighing little */
  keptLight?: string[];
}

export interface PolishState {
  brief: PolishBrief | null;
  decisions: PolishDecisions;
  run: PolishRun | null;
  /** The why of each reference on the board, by item id (project_item.why) */
  whys: Record<string, Why>;
}

export const EMPTY_POLISH: PolishState = { brief: null, decisions: { notDupes: [], keptTone: [] }, run: null, whys: {} };

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Not a limit anyone writing a brief meets: the screens show none. A ceiling on what the server keeps and sends to
 *  the models, so a whole file pasted by mistake is not stored and billed on every reading. */
export const BRIEF_TEXT_MAX = 20_000;
export const WHY_NOTE_MAX = 200;

/** Which of the six things nobody takes from any reference on the board: a gap to fill */
export function gapsOf(whys: Record<string, Why>, boardIds: Set<string>): Take[] {
  const seen = new Set<Take>();
  for (const id of boardIds) for (const t of whys[id]?.takes ?? []) seen.add(t);
  return TAKES.filter((t) => !seen.has(t));
}

/** A run minus what the team already answered and what left the board: what is still worth asking. */
export function pendingOf(state: PolishState, boardIds: Set<string>): { dupes: DupeGroup[]; offTone: OffTone[]; duels: Duel[]; light: Light[] } {
  const run = state.run;
  if (!run) return { dupes: [], offTone: [], duels: [], light: [] };
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
  // Size: only while the board is above the target, and only as many as it is over by
  const keptLight = new Set(state.decisions.keptLight ?? []);
  const over = boardIds.size - BOARD_TARGET;
  const light = over > 0 ? (run.light ?? []).filter((l) => boardIds.has(l.id) && !keptLight.has(l.id)).slice(0, over) : [];
  return { dupes, offTone, duels, light };
}
