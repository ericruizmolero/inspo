// What an AI client brings to a project on its own (bring_context, lib/mcp/context.ts; add_reference with suggested).
// Since 16-11 it goes in at once, with no yes asked in the app: the card's avatar already says who brought it. The
// rows of lib/suggestions.ts stay as the memory of what was brought (by key) and what was dismissed. A SuggestedRef is
// a reference still open: only one left from before that day, which the app takes in when its project opens.
// Shared by client and server.

/** What a reference is to the project. Each one is read differently by the pass: a competitor is what the project
 *  stands apart from, never where its taste comes from; press and material are facts, not taste */
export const REF_ROLES = ["brief", "research", "current-site", "competitor", "inspiration", "press", "material"] as const;
export type RefRole = (typeof REF_ROLES)[number];
export const isRefRole = (v: unknown): v is RefRole => (REF_ROLES as readonly string[]).includes(v as string);

export const SUGGESTION_KINDS = ["reference", "answer", "outline"] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];

export const ORIGIN_MAX = 200;

/** A reference waiting on a project's board, as the app draws it */
export interface SuggestedRef {
  id: string;
  projectId: string;
  itemId: string;
  role: RefRole | null;
  note: string;
  /** Where the context came from, in the words of the agent that brought it ("Prospecting chat in Claude, 9/11") */
  origin: string;
  /** The AI client that brought it ("Claude") */
  via: string | null;
  by: string;
  at: string;
}

/** Every suggested reference of a workspace's projects */
export type SuggestionMap = SuggestedRef[];
