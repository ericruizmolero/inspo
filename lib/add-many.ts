// Saving many addresses at once: the extension's imports (bookmarks, X, a Pinterest board) and a board
// pasted in the app (Are.na, Pinterest, Cosmos). No screenshots arrive (nobody was looking at those pages):
// a site gets its thumbnail the way a pasted URL does, a post on X gets its picture once imported. A pin
// comes with its image, which is copied and becomes the reference itself, as an image saved with the
// right-click menu does. Callers pace themselves: one batch per request, the next when this one answers.
import "server-only";
import { after } from "next/server";
import { addItem, findByWeb, findByWebs, setThumbnail, setItemDate } from "@/lib/items";
import { activeProjectFor, fileItems } from "@/lib/projects";
import { nameFor } from "@/lib/item-name";
import { importedMediaKey, importedMediaUrls, MEDIA_TYPES, MAX_MEDIA_BYTES } from "@/lib/media";
import { putFile } from "@/lib/storage";
import { fetchFile } from "@/lib/remote-file";
import { ensurePost, postThumb, postDay } from "@/lib/posts";
import { normalizeWebUrl, typeFromUrl, mediaKindOf } from "@/lib/url";
import { taggerEnabled } from "@/lib/tagger";
import { startTagJob } from "@/lib/tag-jobs";
import { HttpError } from "@/lib/workspace-core";
import type { InspoItem } from "@/types/inspo";

/** Addresses per request: enough to move fast, few enough to answer well within the limit */
export const MAX_PER_BATCH = 25;
/** Sites read at once while naming (each read has its own time limit) */
const NAME_AT_ONCE = 5;
/** Posts imported and items tagged at once, after the response */
const FINISH_AT_ONCE = 3;
/** Addresses of the same image tried in turn (the size wanted first, then what there is) */
const MAX_IMAGE_TRIES = 3;

export type AddStatus = "added" | "existed" | "invalid" | "error";
export interface AddResult { url: string; status: AddStatus; id?: string }

/** One address to save. `image` makes the item that image, found on the page at `url`; `date` (YYYY-MM-DD)
 *  is the day it was saved or published elsewhere. Both arrive unchecked and are checked here. */
export interface NewWeb { url: string; title?: string; date?: unknown; image?: unknown }

interface Who { workspaceId: string; user: { id: string; name?: string | null; email: string } }

/** Runs `fn` over `list`, at most `n` at a time, keeping the order of the results */
async function eachLimit<T, R>(list: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(list.length);
  let next = 0;
  const worker = async () => { while (next < list.length) { const i = next++; out[i] = await fn(list[i]); } };
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, worker));
  return out;
}

/** The item's date as the caller knows it (a bookmark's day, a post's day), never ahead of today */
function dateOf(date: unknown): string | undefined {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const today = new Date().toISOString().slice(0, 10);
  return date > today || date < "2000-01-01" ? undefined : date;
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n).trim() : "");
/** The addresses an item gives for its image, in the order to try them */
const imagesOf = (image: unknown): string[] =>
  (Array.isArray(image) ? image : [image]).filter((s): s is string => typeof s === "string" && /^https?:\/\//.test(s)).slice(0, MAX_IMAGE_TRIES);

/**
 * Saves up to MAX_PER_BATCH addresses (the caller checks the count) and files them.
 * With `projectId`, what is new goes there and so does what the workspace already had (a reference can be in
 * several projects). Without it, only what is new is filed, in the project this person was working in.
 * `source` names the import in the logs ("pinterest", "arena", "bookmarks").
 */
export async function addMany({ workspaceId, user }: Who, items: NewWeb[], opts: { source: string; projectId?: string | null }): Promise<{ results: AddResult[]; added: InspoItem[] }> {
  const { source } = opts;
  const author = user.name || user.email;

  // The same address twice in one batch is saved once
  const seen = new Set<string>();
  const added: InspoItem[] = [];
  const dated = new Set<string>(); // saved with a date from the caller: the post's own day is not needed
  const results = await eachLimit(items, NAME_AT_ONCE, async (it): Promise<AddResult> => {
    const raw = it.url;
    const web = normalizeWebUrl(raw);
    if (!web) return { url: raw, status: "invalid" };
    if (seen.has(web)) return { url: raw, status: "existed" };
    seen.add(web);
    try {
      const dateIso = dateOf(it.date);
      const images = imagesOf(it.image);
      if (images.length) {
        const had = await findByWebs(workspaceId, importedMediaUrls(workspaceId, web));
        if (had) return { url: raw, status: "existed", id: had.id };
        let file: Awaited<ReturnType<typeof fetchFile>> = null;
        for (const src of images) { file = await fetchFile(src, web, (t) => MEDIA_TYPES.has(t), MAX_MEDIA_BYTES); if (file) break; }
        if (!file) return { url: raw, status: "error" };
        const stored = await putFile(importedMediaKey(workspaceId, web, file.type), file.body, file.type);
        const item = await addItem(workspaceId, {
          name: clip(it.title, 48) || new URL(web).hostname.replace(/^www\./, ""),
          web: stored, thumbnailUrl: stored, source: web, type: "inspiration", author, createdBy: user.id, dateIso,
        });
        added.push(item);
        return { url: raw, status: "added", id: item.id };
      }
      const existing = await findByWeb(workspaceId, web);
      if (existing) return { url: raw, status: "existed", id: existing.id };
      const name = await nameFor(web, it.title);
      const item = await addItem(workspaceId, { name, web, type: typeFromUrl(web), author, createdBy: user.id, dateIso });
      added.push(item);
      if (dateIso) dated.add(web);
      return { url: raw, status: "added", id: item.id };
    } catch (err) {
      // 409: saved by someone else between the lookup and the insert
      if (err instanceof HttpError && err.status === 409) return { url: raw, status: "existed" };
      console.error(`add many (${source}): not saved`, web, err instanceof Error ? err.message : err);
      return { url: raw, status: "error" };
    }
  });

  // Nothing lives outside a project: what came in goes to the one picked (with what was here already),
  // or to the one this person was working in when none was picked or it went away
  const ids = added.map((i) => i.id).filter((x): x is string => !!x);
  const picked = opts.projectId || null;
  const here = picked ? results.filter((r) => r.status === "existed" && r.id).map((r) => r.id as string) : [];
  let filed = false;
  if (picked && (ids.length || here.length)) {
    filed = await fileItems(workspaceId, picked, [...ids, ...here], user.id).then(() => true)
      .catch((e) => { console.error(`add many (${source}): not filed in the picked project`, e instanceof Error ? e.message : e); return false; });
  }
  if (!filed && ids.length) {
    const projectId = await activeProjectFor(workspaceId, user.id).catch(() => null);
    if (projectId) await fileItems(workspaceId, projectId, ids, user.id).catch((e) => console.error(`add many (${source}): not filed`, e));
  }

  // Posts on X get their copies and picture; then the AI tags, as when a URL is pasted in the app
  if (added.length && (taggerEnabled() || added.some((i) => mediaKindOf(i.web) === "post"))) {
    after(() => eachLimit(added, FINISH_AT_ONCE, async (item) => {
      try {
        if (mediaKindOf(item.web) === "post") {
          const post = await ensurePost(item.web);
          const thumb = post && postThumb(post);
          if (thumb) await setThumbnail(workspaceId, item.web, thumb);
          // A post that came without a date lands on the day it was published, not on today
          const day = !dated.has(item.web) && post ? postDay(post) : undefined;
          if (day) await setItemDate(workspaceId, item.web, day);
        }
        // Tagged as a pasted URL is: its job, which keeps the workspace to a few at once (lib/tag-jobs.ts)
        if (taggerEnabled() && item.id) await startTagJob(workspaceId, item.id, user.id);
      } catch (e) { console.error(`add many (${source}): finishing failed`, item.web, e instanceof Error ? e.message : e); }
    }));
  }

  return { results, added };
}
