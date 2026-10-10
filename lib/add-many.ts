// Saving many things at once: the extension's imports (bookmarks, X, a Pinterest board) and a board
// pasted in the app (Are.na, Pinterest, Cosmos). No screenshots arrive (nobody was looking at those pages):
// a site gets its thumbnail the way a pasted URL does, a post on X gets its picture once imported. An image
// (a pin, a block on Are.na) is copied and becomes the reference itself, as an image saved with the right-click
// menu does; a text (a block on Are.na) is kept whole, as a pasted text is. Either keeps its page as `source`.
// Callers pace themselves: one batch per request, the next when this one answers.
import "server-only";
import { after } from "next/server";
import { addItem, findByWeb, findByWebs, setTags, setThumbnail, setItemDate } from "@/lib/items";
import { activeProjectFor, fileItems } from "@/lib/projects";
import { nameFor } from "@/lib/item-name";
import { importedMediaKey, importedMediaUrls, MEDIA_TYPES, MAX_MEDIA_BYTES } from "@/lib/media";
import { putFile } from "@/lib/storage";
import { fetchFile } from "@/lib/remote-file";
import { ensurePost, postThumb, postDay } from "@/lib/posts";
import { cleanText, deleteTextFile, importedTextUrl, putText, textTags, TEXT_TITLE_MAX } from "@/lib/text-refs";
import { embedItems } from "@/lib/embed";
import { normalizeWebUrl, typeFromUrl, mediaKindOf } from "@/lib/url";
import { MAX_PER_BATCH } from "@/lib/batch-limits";
import { taggerEnabled } from "@/lib/tagger";
import { startTagJob } from "@/lib/tag-jobs";
import { HttpError } from "@/lib/workspace-core";
import type { InspoItem } from "@/types/inspo";
import { log, recordFailure } from "./log";

export { MAX_PER_BATCH };
/** Sites read at once while naming (each read has its own time limit) */
const NAME_AT_ONCE = 5;
/** Posts imported and items tagged at once, after the response */
const FINISH_AT_ONCE = 3;
/** Addresses of the same image tried in turn (the size wanted first, then what there is) */
const MAX_IMAGE_TRIES = 3;

export type AddStatus = "added" | "existed" | "invalid" | "error";
export interface AddResult { url: string; status: AddStatus; id?: string }

/** One thing to save, at `url`. `image` makes the item that image, found on the page at `url`; `text` makes it
 *  those words, found on the page at `url`; `date` (YYYY-MM-DD) is the day it was saved or published elsewhere.
 *  They arrive unchecked and are checked here. */
export interface NewRef { url: string; title?: string; date?: unknown; image?: unknown; text?: unknown }

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
 * Saves up to MAX_PER_BATCH things (the caller checks the count) and files them. Results keep the order of `items`.
 * With `projectId`, what is new goes there and so does what the workspace already had (a reference can be in
 * several projects). Without it, only what is new is filed, in the project this person was working in.
 * `source` names the import in the logs ("pinterest", "arena", "bookmarks").
 */
export async function addMany({ workspaceId, user }: Who, items: NewRef[], opts: { source: string; projectId?: string | null }): Promise<{ results: AddResult[]; added: InspoItem[] }> {
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
      const words = it.text === undefined ? "" : cleanText(it.text);
      if (words) {
        const at = importedTextUrl(workspaceId, web);
        const had = await findByWeb(workspaceId, at);
        if (had) return { url: raw, status: "existed", id: had.id };
        const stored = await putText(workspaceId, words, web);
        const firstLine = words.split("\n").find((l) => l.trim())?.replace(/^[#>\-*\s]+/, "").replace(/[*_`]/g, "");
        try {
          const item = await addItem(workspaceId, {
            name: clip(it.title, TEXT_TITLE_MAX) || clip(firstLine, TEXT_TITLE_MAX) || new URL(web).hostname.replace(/^www\./, ""),
            web: stored, source: web, type: "inspiration", author, createdBy: user.id, dateIso,
          });
          await setTags(workspaceId, item.web, await textTags(item.web));
          added.push(item);
          return { url: raw, status: "added", id: item.id };
        } catch (e) {
          // deleteFiles stores its own failure; the add's error is the one to throw
          if (!(e instanceof HttpError && e.status === 409)) await deleteTextFile(workspaceId, stored).catch(() => {});
          throw e;
        }
      }
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
      void recordFailure("action", `add many (${source})`, err, { ref: web });
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
      .catch((err) => { log.warn("add_many.picked_project_failed", { ref: picked, err }); return false; });
  }
  if (!filed && ids.length) {
    const projectId = await activeProjectFor(workspaceId, user.id).catch((err) => { log.warn("add_many.active_project_unknown", { err }); return null; });
    if (projectId) await fileItems(workspaceId, projectId, ids, user.id).catch((e) => void recordFailure("action", "file in project", e, { ref: projectId }));
  }

  // Posts on X get their copies and picture; then the AI tags, as when a URL is pasted in the app.
  // A text is not tagged (its first lines are its tags, set above): it only gets its meaning vector.
  const texts = added.filter((i) => mediaKindOf(i.web) === "text").map((i) => i.id).filter((x): x is string => !!x);
  if (texts.length) after(() => embedItems(texts).catch((err) => log.warn("embed.deferred", { ref: texts[0], count: texts.length, err })));
  const others = added.filter((i) => mediaKindOf(i.web) !== "text");
  if (others.length && (taggerEnabled() || others.some((i) => mediaKindOf(i.web) === "post"))) {
    after(() => eachLimit(others, FINISH_AT_ONCE, async (item) => {
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
      } catch (err) { log.warn("add_many.finish_failed", { source, ref: item.web, err }); }
    }));
  }

  return { results, added };
}
