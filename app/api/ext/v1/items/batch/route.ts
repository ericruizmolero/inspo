// Save many addresses at once: what the extension sends when it imports the browser's bookmarks
// or the bookmarks saved on X. No screenshots arrive (nobody was looking at those pages): a site
// gets its thumbnail the way a pasted URL does, a post on X gets its picture once imported.
// The extension paces itself: one batch per request, the next when this one answers.
import { NextRequest, after } from "next/server";
import { requireExtCtx } from "@/lib/ext-keys";
import { addItem, findByWeb, setThumbnail, setTags } from "@/lib/items";
import { nameFor } from "@/lib/item-name";
import { ensurePost, postThumb } from "@/lib/posts";
import { normalizeWebUrl, typeFromUrl, mediaKindOf } from "@/lib/url";
import { classifyItem, jevEnabled } from "@/lib/jev";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";
import type { InspoItem } from "@/types/inspo";

export const maxDuration = 120; // posts are copied and items tagged in after(), once the response is sent

/** Addresses per request: enough to move fast, few enough to answer well within the limit */
const MAX_PER_BATCH = 25;
/** Sites read at once while naming (each read has its own time limit) */
const NAME_AT_ONCE = 5;
/** Posts imported and items tagged at once, after the response */
const FINISH_AT_ONCE = 3;

type Status = "added" | "existed" | "invalid" | "error";
interface Result { url: string; status: Status; id?: string }

/** Runs `fn` over `list`, at most `n` at a time, keeping the order of the results */
async function eachLimit<T, R>(list: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(list.length);
  let next = 0;
  const worker = async () => { while (next < list.length) { const i = next++; out[i] = await fn(list[i]); } };
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, worker));
  return out;
}

// POST { items: [{ url, title? }], source? } → { ok, results: [{ url, status, id? }] }
export async function POST(req: NextRequest) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  const body = (await req.json().catch(() => ({}))) as { items?: { url?: string; title?: string }[]; source?: string };
  if (!Array.isArray(body.items) || body.items.length > MAX_PER_BATCH) {
    return Response.json({ error: (await getErrors()).badBody }, { status: 400 });
  }
  const source = typeof body.source === "string" ? body.source.slice(0, 32) : "import";
  const author = ctx.user.name || ctx.user.email;

  // The same address twice in one batch is saved once
  const seen = new Set<string>();
  const added: InspoItem[] = [];
  const results = await eachLimit(body.items, NAME_AT_ONCE, async (it): Promise<Result> => {
    const raw = typeof it?.url === "string" ? it.url : "";
    const web = normalizeWebUrl(raw);
    if (!web) return { url: raw, status: "invalid" };
    if (seen.has(web)) return { url: raw, status: "existed" };
    seen.add(web);
    try {
      const existing = await findByWeb(ctx.workspace.id, web);
      if (existing) return { url: raw, status: "existed", id: existing.id };
      const name = await nameFor(web, typeof it.title === "string" ? it.title : undefined);
      const item = await addItem(ctx.workspace.id, { name, web, type: typeFromUrl(web), author, createdBy: ctx.user.id });
      added.push(item);
      return { url: raw, status: "added", id: item.id };
    } catch (err) {
      // 409: saved by someone else between the lookup and the insert
      if (err instanceof HttpError && err.status === 409) return { url: raw, status: "existed" };
      console.error(`ext batch (${source}): not saved`, web, err instanceof Error ? err.message : err);
      return { url: raw, status: "error" };
    }
  });

  // Posts on X get their copies and picture; then the AI tags, as when a URL is pasted in the app
  if (added.length && (jevEnabled() || added.some((i) => mediaKindOf(i.web) === "post"))) {
    after(() => eachLimit(added, FINISH_AT_ONCE, async (item) => {
      try {
        if (mediaKindOf(item.web) === "post") {
          const post = await ensurePost(item.web);
          const thumb = post && postThumb(post);
          if (thumb) await setThumbnail(ctx.workspace.id, item.web, thumb);
        }
        if (!jevEnabled()) return;
        const tags = await classifyItem(item, { organizationId: ctx.workspace.id, userId: ctx.user.id });
        await setTags(ctx.workspace.id, item.web, tags);
      } catch (e) { console.error(`ext batch (${source}): finishing failed`, item.web, e instanceof Error ? e.message : e); }
    }));
  }

  return Response.json({ ok: true, results });
}
