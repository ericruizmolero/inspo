// One way into the library for a reference, whichever door it comes in by: pasted in the app (app/actions), saved
// from the extension (app/api/ext/v1), written by an AI client over MCP (lib/mcp/pieces.ts), asked of the agent
// (lib/agent.ts), or one of a batch (lib/add-many.ts). The door checks what arrived, copies a picture or a video
// into storage and says where the reference goes and what happens once it is saved; this file writes the row and
// a text's file, names a site, files the reference and sends its jobs, the same for every door. Where the doors
// differ (whether a post on X is imported, whether the tag job waits for the answer, what a project that went away
// does) the door says so in its call, so the difference is read here and not found by comparing routes.
import "server-only";
import { after } from "next/server";
import { addItem, findByWeb, rowToItem, setTags, setThumbnail } from "./items";
import { activeProjectFor, fileItems } from "./projects";
import { assignEvidence } from "./system";
import { nameFor } from "./item-name";
import { ensurePost, postThumb } from "./posts";
import { mediaKindOf, typeFromUrl } from "./url";
import { taggerEnabled } from "./tagger";
import { enqueue, enqueueEmbed } from "./jobs";
import { deleteTextFile, importedTextUrl, putText, textTags, TEXT_TITLE_MAX } from "./text-refs";
import { HttpError } from "./workspace-core";
import { recordFailure } from "./log";
import { SYSTEM_AREAS, type SystemArea } from "@/types/system";
import type { InspoItem } from "@/types/inspo";

/** What is being saved, checked by the door it came in by */
export type Piece =
  /** A site, a video page or a post, by its address (normalizeWebUrl). `name` is kept as given; without one the
   *  site names itself (nameFor), `title` standing in when it says nothing */
  | { kind: "url"; web: string; name?: string; title?: string; type?: string }
  /** A picture already copied into the workspace's media folder: it is its own thumbnail. `source` is the page
   *  it was found on */
  | { kind: "image"; url: string; name: string; source?: string | null; type?: string }
  /** A video file already copied into the workspace's video folder */
  | { kind: "video"; url: string; name: string; source?: string | null }
  /** Words kept whole, in a file whose path is the item's address. `at` is the page they were brought in from: the
   *  same page always makes the same file, so bringing it in again finds the reference it made, and the page stays
   *  as `source` */
  | { kind: "text"; text: string; title: string; at?: string };

export interface Who { id: string; name?: string | null; email: string }

export interface SaveOpts { note?: string; subNote?: string; via?: string | null; dateIso?: string }

/** Where the reference is filed once saved. Nothing filed when there is no project to file it in */
export interface Filing {
  projectId?: string | null;
  /** No project picked: the one this person last filed in (the extension), or none, so it lands in the Inbox */
  fallback?: "active";
  /** The areas of the project's system it is set as evidence of */
  areas?: SystemArea[];
  /** A project that went away: the extension and the app log it, since the reference is saved already; the agent
   *  and an AI client are told */
  onError: "log" | "throw";
  /** A reference already in the library is filed too (an AI client putting an old one on a new board) */
  existing?: boolean;
}

export interface Finish {
  /** A post on X is imported once the answer is out (its photos, frame and video are copied) and its picture
   *  becomes the card's. The app's own add leaves that to the browser (app/api/post) */
  post?: boolean;
  /** The tag job: sent before answering, or once the answer is out, after the post's import */
  tag?: "now" | "after";
}

export interface Saved { item: InspoItem; existed: boolean }

/** A text's title when none was given: its first line, without Markdown's marks */
export const titleOf = (text: string) =>
  (text.split("\n").find((l) => l.trim()) ?? "").replace(/^[#>\-*\s]+/, "").replace(/[*_`]/g, "").replace(/\s+/g, " ").trim().slice(0, TEXT_TITLE_MAX).trim();

/** The areas a door was given, as the system knows them */
export const cleanAreas = (v: unknown): SystemArea[] =>
  Array.isArray(v) ? [...new Set(v.filter((a): a is SystemArea => (SYSTEM_AREAS as readonly string[]).includes(a)))] : [];

/** The row, and a text's file. A site already here comes back as it is (`existed`); a stored picture or video
 *  is always new. Throws the 409 of lib/items.ts when the same site is saved by two requests at once. */
export async function saveReference(organizationId: string, piece: Piece, by: Who, opts: SaveOpts = {}): Promise<Saved> {
  const base = { author: by.name || by.email, createdBy: by.id, note: opts.note, subNote: opts.subNote, via: opts.via, dateIso: opts.dateIso };
  switch (piece.kind) {
    case "url": {
      const existing = await findByWeb(organizationId, piece.web);
      if (existing) return { item: rowToItem(existing), existed: true };
      const name = piece.name || await nameFor(piece.web, piece.title);
      return { item: await addItem(organizationId, { ...base, name, web: piece.web, type: piece.type || typeFromUrl(piece.web) }), existed: false };
    }
    case "image":
      return { item: await addItem(organizationId, { ...base, name: piece.name, web: piece.url, thumbnailUrl: piece.url, source: piece.source, type: piece.type || "inspiration" }), existed: false };
    case "video":
      return { item: await addItem(organizationId, { ...base, name: piece.name, web: piece.url, source: piece.source, type: "videos" }), existed: false };
    case "text": {
      if (piece.at) {
        const had = await findByWeb(organizationId, importedTextUrl(organizationId, piece.at));
        if (had) return { item: rowToItem(had), existed: true };
      }
      const url = await putText(organizationId, piece.text, piece.at);
      try {
        const item = await addItem(organizationId, { ...base, name: piece.title, web: url, source: piece.at, type: "inspiration" });
        // A text has no look to tag: its first lines are what the card and the models read
        await setTags(organizationId, item.web, await textTags(item.web));
        return { item, existed: false };
      } catch (e) {
        // On a 409 the file under a fixed key is the other request's. deleteFiles stores its own failure; the add's error is the one to throw
        if (!(e instanceof HttpError && e.status === 409)) await deleteTextFile(organizationId, url).catch(() => {});
        throw e;
      }
    }
  }
}

/** Saves the reference, files it and sends its jobs: a text to be embedded, anything else to be tagged */
export async function addReference(organizationId: string, piece: Piece, by: Who, opts: SaveOpts & { file?: Filing; finish?: Finish } = {}): Promise<Saved> {
  const saved = await saveReference(organizationId, piece, by, opts);
  const id = saved.item.id;
  if (!id) return saved;
  if (opts.file && (!saved.existed || opts.file.existing)) await fileReference(organizationId, id, by, opts.file);
  if (saved.existed) return saved;
  const web = saved.item.web;
  if (mediaKindOf(web) === "text") { void enqueueEmbed([id]); return saved; }
  const tag = taggerEnabled() ? () => enqueue({ kind: "tag", organizationId, itemId: id, userId: by.id }) : null;
  const importPost = opts.finish?.post && mediaKindOf(web) === "post"
    ? async () => { const post = await ensurePost(web); const thumb = post && postThumb(post); if (thumb) await setThumbnail(organizationId, web, thumb); }
    : null;
  if (opts.finish?.tag === "after") {
    if (importPost || tag) after(async () => { await importPost?.(); await tag?.(); });
  } else {
    if (importPost) after(importPost);
    void tag?.();
  }
  return saved;
}

async function fileReference(organizationId: string, itemId: string, by: Who, f: Filing): Promise<void> {
  try {
    const projectId = f.projectId || (f.fallback === "active" ? await activeProjectFor(organizationId, by.id) : null);
    if (!projectId) return;
    await fileItems(organizationId, projectId, [itemId], by.id);
    for (const area of f.areas ?? []) await assignEvidence(organizationId, projectId, area, itemId, true, { id: by.id, name: by.name || by.email });
  } catch (e) {
    if (f.onError === "throw") throw e;
    void recordFailure("action", "file in project", e, { ref: itemId });
  }
}
