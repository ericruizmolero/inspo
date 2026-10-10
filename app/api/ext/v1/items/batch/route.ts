// Save many addresses at once: what the extension sends when it imports the browser's bookmarks,
// the bookmarks saved on X or a board on Pinterest. The saving itself is lib/add-many.ts, shared with
// a board pasted in the app. The extension paces itself: one batch per request, the next when this one answers.
import { NextRequest } from "next/server";
import { requireExtCtx } from "@/lib/ext-keys";
import { addMany, MAX_PER_BATCH, type NewRef } from "@/lib/add-many";
import { getErrors } from "@/lib/i18n";

export const maxDuration = 120; // posts are copied in after(), once the response is sent

// POST { items: [{ url, title?, date?, image?, text? }], source?, projectId? } → { ok, results: [{ url, status, id? }], full? }
// `full` is there when the plan ran out of room: what came in stops at the cap, the rest is "full", and `full`
// is the message to show.
// `image` (an address, or a few to try in turn) makes the item that image, found on the page at `url`:
// the file is copied into the workspace's media folder, and the page stays with the item as its source.
// `text` makes it those words (a text on a board), kept whole with the page as its source.
// `date` (YYYY-MM-DD) is the day the address was saved or published, so an import lands each
// reference on its own day on the board instead of piling them all on today.
// `projectId` is the project picked on the import page (addMany says where things are filed).
export async function POST(req: NextRequest) {
  const ctx = await requireExtCtx(req, "batch");
  if (ctx instanceof Response) return ctx;
  const body = (await req.json().catch(() => ({}))) as { items?: { url?: unknown; title?: unknown; date?: unknown; image?: unknown; text?: unknown }[]; source?: string; projectId?: string };
  if (!Array.isArray(body.items) || body.items.length > MAX_PER_BATCH) {
    return Response.json({ error: (await getErrors()).badBody }, { status: 400 });
  }
  const items: NewRef[] = body.items.map((it) => ({
    url: typeof it?.url === "string" ? it.url : "",
    title: typeof it?.title === "string" ? it.title : undefined,
    date: it?.date, image: it?.image, text: it?.text,
  }));
  const { results, full } = await addMany({ workspaceId: ctx.workspace.id, user: ctx.user }, items, {
    source: typeof body.source === "string" ? body.source.slice(0, 32) : "import",
    projectId: typeof body.projectId === "string" && body.projectId ? body.projectId : null,
  });
  return Response.json({ ok: true, results, ...(full ? { full } : {}) });
}
