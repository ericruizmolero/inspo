// What an AI client brings to a project in one go (bring_context, lib/mcp/context.ts) waits as a suggestion until
// someone on the team accepts or dismisses it in the app. A suggested reference is a reference of the library that
// is not filed in the project yet: the board shows it marked, and nothing that reads the board (the pass,
// criterio.md, the counts) sees it until it is accepted. An answer an agent proposed waits in the brief with source
// "agent", and a landing plan it drafted waits among the outlines with `draft`. What is dismissed is remembered here,
// so the same thing is not proposed again. Shared by client and server.

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
