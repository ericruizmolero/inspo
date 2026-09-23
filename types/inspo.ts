export interface InspoItem {
  /** database id (missing only on transient objects) */
  id?: string;
  name: string;
  web: string;
  /** DD/MM/YYYY (legacy sheet format, the client parses it that way) */
  date: string;
  /** Display name of whoever added it. "Both" is a legacy sheet value. */
  addedBy: string;
  type: "inspiration" | "videos" | "ideas" | "documentaries";
  note: string;
  subNote?: string;
}

export type FilterType = "all" | InspoItem["type"];
export type FilterAuthor = "all" | string;
export type FilterDate = "all" | "thisMonth" | "thisYear";

// ─── AI tags (Jev) ────────────────────────────────────────────────────────────
export interface InspoTags {
  /** Sector picked by Jev (a SECTORS key) */
  sector: string;
  sectorP: number;
  /** Dominant style (a STYLES key) */
  style: string;
  styleP: number;
  /** 0–1 probability of each boolean tag (a TAGS key) */
  tags: Record<string, number>;
  /** Short site summary (title + description) for AI search */
  summary: string;
  /** Visual description of the screenshot by Claude (empty if there was none) */
  visual?: string;
  /** ISO date of when it was tagged */
  at: string;
  /** Taxonomy version used */
  v: number;
}

export type TagMap = Record<string, InspoTags>;

// ─── Comments ────────────────────────────────────────────────────────────────
export interface CommentAttachment {
  /** File URL (private Blob: goes through /api/thumbnail/img; local: a /public path) */
  url: string;
  /** Size in pixels, to reserve the space before loading */
  w: number;
  h: number;
  name?: string;
}

export interface InspoComment {
  id: string;
  itemId: string;
  authorId: string | null;
  authorName: string;
  authorImage: string | null;
  body: string;
  attachments: CommentAttachment[];
  /** ISO */
  createdAt: string;
}

export type CommentMap = Record<string, InspoComment[]>;
