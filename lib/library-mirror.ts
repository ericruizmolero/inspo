// How the board folds what the server sends (a page of the library, the pulse's changes) into what it already
// holds. Every merge is by id or by address, so the same rows arriving twice (the pulse looks a few seconds behind
// its cursor, lib/pulse.ts OVERLAP_MS) leave the same state, and keepSame hands back the very same objects.
import { keepSame } from "./keep-same";
import type { CommentMap, InspoComment, InspoItem, ItemsBundle, ItemsPage, Pulse } from "@/types/inspo";

/** What the board mirrors of the library's references */
export interface Mirror extends ItemsBundle { comments: CommentMap }

/** Known items are replaced where they stand; new ones go first (just added) or last (a page further down); the gone leave */
export function mergeItems(prev: InspoItem[], rows: InspoItem[], gone: ReadonlySet<string>, at: "front" | "end"): InspoItem[] {
  const byId = new Map(rows.filter((i) => i.id && !gone.has(i.id)).map((i) => [i.id!, i]));
  const kept = prev.filter((i) => !(i.id && gone.has(i.id))).map((i) => (i.id && byId.has(i.id) ? byId.get(i.id)! : i));
  const known = new Set(prev.map((i) => i.id));
  const fresh = [...byId.values()].filter((i) => !known.has(i.id));
  return keepSame(prev, at === "front" ? [...fresh, ...kept] : [...kept, ...fresh]);
}

/** A map by address merged: what this tab fetched on its own (a post's picture, a capture) stays until the server has it too */
export const mergeMap = <V,>(prev: Record<string, V>, next: Record<string, V>): Record<string, V> => keepSame(prev, { ...prev, ...next });

/** The tagging jobs of these addresses replaced: a job that is done is no longer listed */
export function mergeJobs<V>(prev: Record<string, V>, webs: string[], next: Record<string, V>): Record<string, V> {
  const out = { ...prev };
  for (const w of webs) { if (w in next) out[w] = next[w]; else delete out[w]; }
  return keepSame(prev, out);
}

/** Comments upserted by id into their item's thread (oldest first); the gone ones, and the threads of gone items, leave */
export function mergeComments(prev: CommentMap, rows: InspoComment[], gone: ReadonlySet<string>, goneItems: ReadonlySet<string> = new Set()): CommentMap {
  const out: CommentMap = {};
  for (const [itemId, list] of Object.entries(prev)) if (!goneItems.has(itemId)) out[itemId] = list.filter((c) => !gone.has(c.id));
  for (const c of rows) {
    if (gone.has(c.id) || goneItems.has(c.itemId)) continue;
    const list = (out[c.itemId] ??= []);
    const i = list.findIndex((x) => x.id === c.id);
    if (i >= 0) list[i] = c; else list.push(c);
  }
  for (const list of Object.values(out)) list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const k of Object.keys(out)) if (!out[k].length && !prev[k]?.length) delete out[k];
  return keepSame(prev, out);
}

const flat = (m: CommentMap) => Object.values(m).flat();

/** A bundle of references folded in: a page goes after what is there, changes go first */
export function applyBundle(m: Mirror, b: ItemsBundle, comments: InspoComment[], gone: { items: ReadonlySet<string>; comments: ReadonlySet<string> }, at: "front" | "end"): Mirror {
  return {
    items: mergeItems(m.items, b.items, gone.items, at),
    thumbnailMap: mergeMap(m.thumbnailMap, b.thumbnailMap),
    tagMap: mergeMap(m.tagMap, b.tagMap),
    tagJobs: mergeJobs(m.tagJobs, b.items.map((i) => i.web), b.tagJobs),
    pageShots: mergeMap(m.pageShots, b.pageShots),
    designMdIndex: mergeMap(m.designMdIndex, b.designMdIndex),
    signed: mergeMap(m.signed, b.signed),
    comments: mergeComments(m.comments, comments, gone.comments, gone.items),
  };
}

const NONE: ReadonlySet<string> = new Set();
const EMPTY: ItemsBundle = { items: [], thumbnailMap: {}, tagMap: {}, tagJobs: {}, pageShots: {}, designMdIndex: {}, signed: {} };

/** The pulse's changes folded in */
export const applyPulse = (m: Mirror, p: Pulse): Mirror =>
  applyBundle(m, p.changed ?? EMPTY, p.comments ?? [], { items: new Set(p.gone?.items), comments: new Set(p.gone?.comments) }, "front");

/** A further page folded in. `gone`: what this tab learned was deleted after the page may have been read */
export const applyPage = (m: Mirror, page: ItemsPage, gone: { items: ReadonlySet<string>; comments: ReadonlySet<string> } = { items: NONE, comments: NONE }): Mirror =>
  applyBundle(m, page, flat(page.comments), gone, "end");
