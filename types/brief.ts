// A project's brief: the team's words about it (what it is, for whom, what to avoid) and, for a redesign, which
// reference is the client's current site. Shared by client and server; stored as one JSON in project.brief.

/** Who the project speaks to, as keys */
export const AUDIENCES = ["consumers", "businesses", "creatives", "developers", "investors", "community"] as const;
export type Audience = (typeof AUDIENCES)[number];

export interface Brief {
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

/** Not a limit anyone writing a brief meets: the screens show none. A ceiling on what the server keeps and sends to
 *  the models, so a whole file pasted by mistake is not stored and billed on every reading. */
export const BRIEF_TEXT_MAX = 20_000;
