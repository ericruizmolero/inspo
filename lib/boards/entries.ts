// What a board brings: one entry per item Criterio can save, and what it left out and why.
// Client-safe: the app reads a board on the server, then sends its entries back in batches (importBatch).
import { MAX_IMAGES_PER_BATCH, MAX_PER_BATCH } from "@/lib/batch-limits";

/** One item of a board, as Criterio saves it.
 *  `web`, `video` and `post` are an address saved as a pasted one is (lib/url.ts mediaKindOf says which).
 *  `image` is copied into the workspace; `images` are its files, best first; `page` is where it lives on the platform.
 *  `text` is kept whole as a text reference; `page` is where it lives on the platform. */
export type Entry =
  | { kind: "web" | "video" | "post"; url: string; title?: string }
  | { kind: "image"; images: string[]; page: string; title?: string }
  | { kind: "text"; text: string; page: string; title?: string };

export type Kind = Entry["kind"];
export const KINDS: readonly Kind[] = ["web", "image", "video", "post", "text"];

/** Why an item of a board stays out: a file (a PDF), a board inside the board, or nothing we can save */
export type SkipReason = "file" | "board" | "empty";
export const SKIP_REASONS: readonly SkipReason[] = ["file", "board", "empty"];
export type Skipped = Record<SkipReason, number>;
export const noneSkipped = (): Skipped => ({ file: 0, board: 0, empty: 0 });

/** The words of a text entry at most: what a text reference holds (TEXT_MAX in lib/text-refs.ts) */
export const MAX_TEXT = 40_000;

/** Entries one import brings at most */
export const MAX_ENTRIES = 500;

/** The entries in request-sized batches, in the board's order: a batch with an image carries fewer */
export function batchesOf(entries: Entry[]): Entry[][] {
  const out: Entry[][] = [];
  let batch: Entry[] = [];
  let limit = MAX_PER_BATCH;
  for (const e of entries) {
    if (e.kind === "image") limit = MAX_IMAGES_PER_BATCH;
    if (batch.length >= limit) { out.push(batch); batch = []; limit = e.kind === "image" ? MAX_IMAGES_PER_BATCH : MAX_PER_BATCH; }
    batch.push(e);
  }
  if (batch.length) out.push(batch);
  return out;
}
