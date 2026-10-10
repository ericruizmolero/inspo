import { NextRequest, after } from "next/server";
import { normalizeWebUrl } from "@/lib/url";
import { requireCtx, isResponse } from "@/lib/workspace";
import { findByWeb } from "@/lib/items";
import { listItemComments } from "@/lib/comments";
import { threadsOf } from "@/lib/comment-context";
import { getDesignMd, getDesignScreenshot, saveWhyAsset } from "@/lib/design-store";
import { latestRevision } from "@/lib/design-revise";
import { getOrBuildWhy, type Voice } from "@/lib/design-why";
import { probeSite } from "@/lib/design-probe";
import { recordUsage } from "@/lib/usage";
import { getErrors } from "@/lib/i18n";
import type { DesignWhy } from "@/types/design";
import { HttpError } from "@/lib/workspace-core";
import { assertQuota, quotaBlock } from "@/lib/quota";
import { log } from "@/lib/log";

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

  // The voices: the saver's note first, then each comment with where it is pinned and its replies
  const voices: Voice[] = [];
  const note = (item.note ?? "").trim();
  if (note) voices.push({ author: item.author, body: note.slice(0, 1000), at: item.createdAt.toISOString(), kind: "note" });
  const comments = item.id ? await listItemComments(ctx.workspace.id, item.id) : [];
  const threads = threadsOf(comments.map((c) => ({ id: c.id, parentId: c.parentId, author: c.authorName, body: c.body, at: c.createdAt, anchor: c.anchor })));
  for (const t of threads) {
    voices.push({
      author: t.author, body: t.body.slice(0, 1000), at: t.at, kind: "comment",
      ...(t.place ? { place: t.place } : {}),
      ...(t.replies.length ? { replies: t.replies.map((r) => ({ author: r.author, body: r.body.slice(0, 1000) })) } : {}),
    });
  }
  if (!voices.length) return Response.json({ why: EMPTY, cached: true });

  const base = await getDesignMd(url);
  if (!base?.spec) return Response.json({ error: (await getErrors()).noDesignMdYet }, { status: 404 });
  const revision = await latestRevision(ctx.workspace.id, url);
  const spec = revision?.spec ?? base.spec;
  const specStamp = revision ? `rev:${revision.meta.id}` : `gen:${base.generatedAt}`;

  if (!process.env.OPENROUTER_API_KEY) return Response.json({ error: (await getErrors()).noModelKey }, { status: 500 });

  // Building is a model call and a browser run: past the plan's AI actions, only what is already saved is shown
  const blocked = await quotaBlock(assertQuota(ctx.workspace, "ai"));

  try {
    const t0 = Date.now();
    const result = await getOrBuildWhy({
      organizationId: ctx.workspace.id, url, voices, specStamp, spec, build: !blocked,
      screenshot: () => getDesignScreenshot(url), language: ctx.workspace.outputLanguage,
      background: (job) => after(() => job),
      // The browser goes to look at what the notes point at: captures the sections, hovers, listens
      probe: async () => {
        const report = await probeSite(url, voices);
        if (!report) return null;
        void recordUsage({ organizationId: ctx.workspace.id, userId: ctx.user.id }, { action: "design_why", model: report.plan.model, inputTokens: report.plan.usage.input, outputTokens: report.plan.usage.output, cacheReadTokens: report.plan.usage.cacheRead, costUsd: report.plan.costUsd, ref: url });
        const shotUrls: Record<string, string> = {};
        for (const c of report.captures) shotUrls[c.id] = await saveWhyAsset(ctx.workspace.id, url, c.id, c.data, c.mime, c.ext);
        return { report, shotUrls };
      },
    });
    if (!result) return blocked!;
    const { why, built, stale } = result;
    if (built) {
      log.info("design_why.built", { ref: url, voices: voices.length, highlights: why.highlights.length, probeMs: why.probe?.ms, model: built.model, ms: Date.now() - t0 });
      void recordUsage({ organizationId: ctx.workspace.id, userId: ctx.user.id }, {
        action: "design_why", model: built.model, inputTokens: built.usage.input, outputTokens: built.usage.output,
        cacheReadTokens: built.usage.cacheRead, costUsd: built.costUsd, provider: built.provider, requestId: built.requestId, ref: url,
      });
    }
    return Response.json({ why, cached: !built, stale });
  } catch (err) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    log.error("design_why.failed", { ref: url, err });
    return Response.json({ error: err instanceof HttpError ? err.message : (await getErrors()).unexpected }, { status: err instanceof HttpError ? err.status : 500 });
  }
}
