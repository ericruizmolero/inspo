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
  /** The AI client it was saved from over MCP ("Claude"), when it was not saved in criterio itself */
  via?: string;
  /** The page it was found on, when `web` is our copy of an image or a video (a pin, a picture saved from a site) */
  source?: string;
}

// ─── Projects ────────────────────────────────────────────────────────────────
export interface Project { id: string; name: string; /** The one sentence the project opens with (Polish brief): what it is, in the team's words */ intent?: string | null; /** A redesign: the reference that is the client's current site */ clientItemId?: string | null; /** It carries a recipe (the process it was made with) */ hasRecipe?: boolean; /** The team said it has its references: it opens on its system. Until then it opens on its board, gathering */ started?: boolean }
/** Polish as a team: what one person said about one reference of a project's board (lib/polish-votes.ts).
 *  `closedAt` is set once a closed polish settled it; until then the vote is open */
export type PolishChoice = "keep" | "forget";
export interface PolishVote { projectId: string; itemId: string; userId: string; vote: PolishChoice; closedAt: string | null; closedBy: string | null }
/** item id → ids of the projects it is filed in (none = Inbox) */
export type ProjectLinks = Record<string, string[]>;


// ─── AI tags (lib/tagger.ts) ──────────────────────────────────────────────────
export interface InspoColor {
  hex: string;
  /** Share of the page's pixels, 0–1 */
  share: number;
  /** A COLORS key */
  family: string;
}

/** What the item says about itself, read without a model: a page's meta tags and JSON-LD, a post's
 *  author and hashtags, an image's EXIF/XMP/IPTC (lib/meta.ts). Every field is optional. */
export interface InspoMeta {
  /** Person who made or wrote it */
  author?: string;
  /** Studio, company or publication behind it */
  publisher?: string;
  /** @handle on X */
  handle?: string;
  /** schema.org type or og:type: Product, Article, Person, Organization… */
  kind?: string;
  /** The page's own keywords and tags, a post's hashtags, an image's keywords */
  keywords?: string[];
  /** ISO date it was published or taken */
  date?: string;
  /** Tool that built the page (Framer, Webflow…) or edited the image */
  generator?: string;
  place?: string;
  camera?: string;
  copyright?: string;
}

export interface InspoTags {
  /** Sector (a SECTORS key) */
  sector: string;
  sectorP: number;
  /** Dominant style (a STYLES key) */
  style: string;
  styleP: number;
  /** 0–1 probability of each boolean tag (a TAGS key) */
  tags: Record<string, number>;
  /** Short site summary (title + description) for AI search */
  summary: string;
  /** Visual description of the screenshot (empty if there was none) */
  visual?: string;
  // v3: missing on older tags
  /** Main colours read from the pixels, largest first */
  colors?: InspoColor[];
  /** Colour families present (COLORS keys), largest first */
  palette?: string[];
  theme?: "light" | "dark" | "mixed";
  /** SECTIONS keys */
  sections?: string[];
  /** ELEMENTS keys */
  elements?: string[];
  /** TYPE keys */
  type?: string[];
  /** LAYOUT keys */
  layout?: string[];
  /** Free words in English, for search only */
  keywords?: string[];
  /** Model that tagged it */
  model?: string;
  /** The item's own metadata (v4) */
  meta?: InspoMeta;
  /** The workspace's own edits (inspo_item.tags_user), attached when the item is loaded */
  user?: UserTags;
  /** ISO date of when it was tagged */
  at: string;
  /** Taxonomy version used */
  v: number;
}

/** A workspace's own edits on an item's tags. `removed` holds selectors ("s:pricing", "k:coffee", "t:dark"). */
export interface UserTags {
  added: string[];
  removed: string[];
}

/** The tagging job of an item that has no current tags yet (done items are not listed) */
export type TagStatus = "pending" | "running" | "failed";

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
  /** The comment this one answers (one level: a reply never has replies) */
  parentId?: string;
  /** ISO */
  createdAt: string;
}

export type CommentMap = Record<string, InspoComment[]>;

/** What the library knows of each site's DESIGN.md without loading it (lib/design-store.ts DesignMdIndexEntry) */
export interface DesignIndexEntry extends Partial<PageShot> { coverUrl?: string; scrollUrl?: string }

/** A site's full-page screenshot, stored once (lib/page-shots.ts): the whole page for the panel, and its
 *  top (cut at twice its width) at 1440, 720 and 288px for the canvas. shotH: the whole page's height at 1440. */
export interface PageShot {
  shotUrl: string; topUrl: string; tileUrl: string; thumbUrl: string; shotH: number;
  /** The page's most common colour (#rrggbb), painted before the image arrives */
  color?: string;
  /** When the canvas copies above are signed bucket links: the same files through the app, for when a link expires */
  paths?: { topUrl: string; tileUrl: string; thumbUrl: string };
}
export type DesignIndex = Record<string, DesignIndexEntry>;
