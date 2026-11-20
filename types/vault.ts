// The Vault: references we curate ourselves, one per piece of a site (a hero, a pricing table, a button, a text
// animation), each with the code that makes it. People browse it as inspiration; the connector hands the code to
// an agent, so a landing starts from something that already works. Shared by client and server.
import { SECTIONS } from "@/lib/taxonomy";

/** What a Vault entry can be besides a section of a page: the details that travel across sections */
export const VAULT_DETAILS = ["buttons", "text", "scroll", "transitions", "cursor", "sliders", "media", "utilities"] as const;

/** A category is a kind of section (lib/taxonomy.ts SECTIONS, the word a landing's plan uses) or a detail */
export const VAULT_CATEGORIES = [...SECTIONS.map((s) => s.key), ...VAULT_DETAILS] as string[] as [string, ...string[]];
export const isVaultSection = (category: string) => SECTIONS.some((s) => s.key === category);

/** Who reads an entry's code: "paid" only the plans with the whole Vault (lib/plans.ts vault), "free" every signed-in
 *  account. A partner sets it when the entry goes in; a new one is "paid" */
export const VAULT_ACCESS = ["paid", "free"] as const;
export type VaultAccess = (typeof VAULT_ACCESS)[number];

export const VAULT_LIMITS = { title: 80, summary: 300, use: 600, tags: 16, tag: 30, blocks: 12, blockTitle: 80, blockNote: 600, code: 40_000, lang: 20, demo: 120_000 } as const;

/** One step of an entry's documentation: what it is, and the code as it is pasted */
export interface VaultBlock {
  /** "Setup: external scripts", "HTML", "CSS", "JavaScript" */
  title: string;
  /** The language of the code: html, css, js, ts, tsx, json, bash, md */
  lang: string;
  code: string;
  /** A line on what to change or watch out for */
  note?: string;
}

/** An entry's words in Spanish, beside the English ones an agent reads: what the app shows to whoever reads it in
 *  Spanish. A piece left out, or one that no longer matches the English (tags and blocks go one to one, in order),
 *  falls back to the English */
export interface VaultEs {
  title?: string;
  summary?: string;
  use?: string;
  tags?: string[];
  blocks?: { title?: string; note?: string }[];
}

/** An entry as a card shows it: no code */
export interface VaultCard {
  id: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  /** What it is, in a sentence */
  summary: string;
  /** Its picture's address, or null while it has none */
  image: string | null;
  /** A short loop of it running, which a card plays, always, in place of the piece itself; null plays the piece on hover */
  video: string | null;
  /** The loop's width over its height: the shape its card and its sheet take. null until the browser has measured it */
  videoRatio: number | null;
  /** Where it runs, when it does */
  liveUrl: string | null;
  published: boolean;
  /** It can be seen running (the live preview, app/api/vault/[entry]/preview): in its sheet, and in its card on hover */
  preview: boolean;
  createdAt: string;
}

/** An entry whole. `blocks` is null for whoever may not read the code in the app (it travels through the connector) */
export interface VaultEntry extends VaultCard {
  /** When to reach for it and what makes it good */
  use: string;
  /** The site it was learnt from, when there is one */
  sourceUrl: string | null;
  blocks: VaultBlock[] | null;
  by: string | null;
  /** The picture of whoever wrote it, when they have one */
  byImage: string | null;
}

/** "Folder Tabs" → "folder-tabs" */
export const vaultSlug = (title: string) => title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
