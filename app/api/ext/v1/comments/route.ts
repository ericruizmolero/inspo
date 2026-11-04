// A comment left on a running page with the extension. It lands in the same thread as any other, anchored to the page.
import { requireExtCtx } from "@/lib/ext-keys";
import { addAreaComment } from "@/lib/area-comments";
import { HttpError } from "@/lib/workspace-core";
import { getErrors } from "@/lib/i18n";
import { recordFailure } from "@/lib/log";

// POST { projectId, url, selector, comment, section?, text?, viewport? } → { id }
export async function POST(req: Request) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const note = await addAreaComment(ctx.workspace.id, String(b.projectId ?? ""), "page", String(b.comment ?? ""), ctx.user, { page: { url: b.url, selector: b.selector, section: b.section, text: b.text, viewport: b.viewport, via: "Extension" } });
    return Response.json({ id: note.id }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
    void recordFailure("action", "page comment from the extension", err);
    return Response.json({ error: (await getErrors()).unexpected }, { status: 500 });
  }
}
