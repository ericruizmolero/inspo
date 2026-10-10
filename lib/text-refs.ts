// Text pasted as a reference of its own: the project's content (a list of services, a piece of copy), kept
// whole. The words live in a stored file whose path is the item's `web`, as an uploaded image's does, so what
// the item is still comes from its address (lib/url.ts mediaKindOf → "text").
// Files: lib/storage.ts, under inspo/<workspace>/text/.
import "server-only";
import { createHash } from "node:crypto";
import { putFile, deleteFiles, getFile, keyOf, fileUrl } from "./storage";
import { webKeyOf } from "./url";
import { TAXONOMY_VERSION } from "./taxonomy";
import type { InspoTags } from "@/types/inspo";
import { log } from "./log";

/** What a text can hold: a long page of copy, not a book */
export const TEXT_MAX = 40_000;
export const TEXT_TITLE_MAX = 80;
/** Enough to fill its card on the board */
const EXCERPT_MAX = 480;

export const textPrefix = (organizationId: string) => `inspo/${organizationId}/text/`;

/** Is this path a text saved in this workspace? */
export function ownsTextFile(organizationId: string, url: string): boolean {
  return keyOf(url)?.startsWith(textPrefix(organizationId)) ?? false;
}

/** The words as they are kept: line breaks stay (a list is a list), the rest is tidied */
export const cleanText = (v: unknown) => String(v ?? "").replace(/\r\n?/g, "\n").replace(/[^\S\n]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, TEXT_MAX);

/** The key of a text brought in from `page` (a block on Are.na): the same page always gives the same key,
 *  so importing it again finds the reference it already made */
const importedTextKey = (organizationId: string, page: string) =>
  `${textPrefix(organizationId)}from-${createHash("sha1").update(webKeyOf(page)).digest("hex").slice(0, 20)}.md`;
export const importedTextUrl = (organizationId: string, page: string) => fileUrl(importedTextKey(organizationId, page));

/** Saves the words and gives the path that becomes the item's address. `from` is the page it was brought in from. */
export async function putText(organizationId: string, text: string, from?: string): Promise<string> {
  const key = from ? importedTextKey(organizationId, from) : `${textPrefix(organizationId)}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.md`;
  return putFile(key, Buffer.from(text, "utf-8"), "text/markdown; charset=utf-8", organizationId);
}

/** Writes the words over a saved text: the same file, so the item keeps its address */
export async function rewriteText(organizationId: string, url: string, text: string): Promise<void> {
  const key = keyOf(url);
  if (!key) throw new Error("not a stored text");
  await putFile(key, Buffer.from(text, "utf-8"), "text/markdown; charset=utf-8", organizationId);
}

/** The words of a saved text; null if the file can't be read */
export async function readText(url: string): Promise<string | null> {
  const key = keyOf(url);
  if (!key) return null;
  try {
    const f = await getFile(key);
    return f ? f.body.toString("utf-8") : null;
  } catch (err) {
    log.warn("storage.read_failed", { ref: key, err });
    return null;
  }
}

/** Delete without failing: an orphan file blocks nothing. */
export async function deleteTextFile(organizationId: string, url: string): Promise<void> {
  if (ownsTextFile(organizationId, url)) await deleteFiles([keyOf(url)!]);
}

/** Its first lines on one line: what the card shows and what the models are told of it */
export function excerptOf(text: string): string {
  // Markdown marks are dropped and the lines run on: a list reads as an enumeration
  const lines = text.split("\n").map((l) => l.replace(/^\s*(#{1,6}|[-*\u2022]|\d+[.)])\s+/, "").replace(/\*\*|__/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const one = lines.reduce((all, l) => (all ? `${all}${/[.:;!?\u2026]$/.test(all) ? " " : ", "}${l}` : l), "");
  return one.length > EXCERPT_MAX ? `${one.slice(0, EXCERPT_MAX - 1).replace(/\s+\S*$/, "")}…` : one;
}

/** A text has no look to tag: its "tags" are its first lines, so the card, the search and the models have
 *  something to read. No model call. */
export async function textTags(web: string): Promise<InspoTags> {
  const text = (await readText(web)) ?? "";
  return { sector: "other", sectorP: 0, style: "", styleP: 0, tags: {}, summary: excerptOf(text), keywords: [], model: "none", at: new Date().toISOString(), v: TAXONOMY_VERSION };
}
