import { NextRequest, after } from "next/server";
import { normalizeWebUrl } from "@/lib/url";
import { requireCtx, isResponse } from "@/lib/workspace";
import { findByWeb } from "@/lib/items";
import { listItemComments } from "@/lib/comments";
import { getDesignMd, getDesignScreenshot, saveWhyShot } from "@/lib/design-store";
import { latestRevision } from "@/lib/design-revise";
import { getOrBuildWhy, type Voice } from "@/lib/design-why";
import { probeSite } from "@/lib/design-probe";
import { recordUsage } from "@/lib/usage";
import { getErrors, getLocale } from "@/lib/i18n";
import type { DesignWhy } from "@/types/design";

export const maxDuration = 120;

const EMPTY: DesignWhy = { highlights: [], model: "", createdAt: "", voices: 0 };

// GET ?url=… → the team's "why it's here" for that site (v2: chips, no prose): cached while the note, the
// thread and the spec stay the same; rebuilt (one small model call) when any of them changes.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const url = normalizeWebUrl(req.nextUrl.searchParams.get("url") ?? "");
  if (!url) return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });

  const item = await findByWeb(ctx.workspace.id, url);
  if (!item) return Response.json({ error: (await getErrors()).urlNotInWorkspace }, { status: 403 });

  // The voices: the saver's note first, then the thread (text only; a bare screenshot says nothing quotable)
  const voices: Voice[] = [];
  const note = (item.note ?? "").trim();
  if (note) voices.push({ author: item.author, body: note.slice(0, 1000), at: item.createdAt.toISOString(), kind: "note" });
  const comments = item.id ? await listItemComments(ctx.workspace.id, item.id) : [];
  for (const c of comments) if (c.body.trim()) voices.push({ author: c.authorName, body: c.body.trim().slice(0, 1000), at: c.createdAt, kind: "comment" });
  if (!voices.length) return Response.json({ why: EMPTY, cached: true });

  const base = await getDesignMd(url);
  if (!base?.spec) return Response.json({ error: (await getErrors()).noDesignMdYet }, { status: 404 });
  const revision = await latestRevision(ctx.workspace.id, url);
  const spec = revision?.spec ?? base.spec;
  const specStamp = revision ? `rev:${revision.meta.id}` : `gen:${base.generatedAt}`;

  if (!process.env.OPENROUTER_API_KEY) return Response.json({ error: (await getErrors()).noModelKey }, { status: 500 });

  try {
    const t0 = Date.now();
    const { why, built, stale } = await getOrBuildWhy({
      organizationId: ctx.workspace.id, url, voices, specStamp, spec,
      screenshot: () => getDesignScreenshot(url), locale: await getLocale(),
      background: (job) => after(() => job),
      // The browser goes to look at what the notes point at: captures the sections, hovers, listens
      probe: async () => {
        const report = await probeSite(url, voices);
        if (!report) return null;
        void recordUsage({ organizationId: ctx.workspace.id, userId: ctx.user.id }, { action: "design_why", model: report.plan.model, inputTokens: report.plan.usage.input, outputTokens: report.plan.usage.output, cacheReadTokens: report.plan.usage.cacheRead, costUsd: report.plan.costUsd, ref: url });
        const shotUrls: Record<string, string> = {};
        for (const c of report.captures) shotUrls[c.id] = await saveWhyShot(ctx.workspace.id, url, c.id, c.jpeg);
        return { report, shotUrls };
      },
    });
    if (built) {
      console.log(`design-why ${url}: ${voices.length} voices → ${why.highlights.length} highlights${why.probe ? `, probe ${why.probe.ms}ms` : ""}, ${built.model} ${Date.now() - t0}ms`);
      void recordUsage({ organizationId: ctx.workspace.id, userId: ctx.user.id }, {
        action: "design_why", model: built.model, inputTokens: built.usage.input, outputTokens: built.usage.output,
        cacheReadTokens: built.usage.cacheRead, costUsd: built.costUsd, provider: built.provider, requestId: built.requestId, ref: url,
      });
    }
    return Response.json({ why, cached: !built, stale });
  } catch (err) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    const msg = err instanceof Error ? err.message : String(err);
    console.error("design-why error:", url, msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
