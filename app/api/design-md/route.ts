import { NextRequest } from "next/server";
import { normalizeWebUrl, mediaKindOf } from "@/lib/url";
import { extractDesign } from "@/lib/design-extract";
import { generateDesignMd } from "@/lib/design-md";
import { getDesignMd, saveDesignMd } from "@/lib/design-store";
import { requireCtx, isResponse, canManage } from "@/lib/workspace";
import { findByWeb } from "@/lib/items";
import { overlayRevision, addRevision, listRevisions } from "@/lib/design-revise";
import { recordUsage } from "@/lib/usage";
import { assertQuota, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";
import { log } from "@/lib/log";

export const maxDuration = 300;

// One generation per URL at a time (avoids double clicks / duplicate tabs).
// Each has its own AbortController: it stops on DELETE ?url=… or when the last
// client waiting on it closes the connection (closing the tab, "Stop" in the toast).
interface Job { promise: Promise<Response>; ctrl: AbortController; waiters: number }
const inflight = new Map<string, Job>();

async function CANCELLED() {
  return Response.json({ error: (await getErrors()).generationStopped, cancelled: true }, { status: 499 });
}

// Counts one more client waiting for the result; if all leave, the job is aborted.
function attach(job: Job, req: NextRequest): Promise<Response> {
  job.waiters++;
  const leave = () => { if (--job.waiters <= 0) job.ctrl.abort(); };
  req.signal.addEventListener("abort", leave, { once: true });
  return job.promise.then((res) => {
    req.signal.removeEventListener("abort", leave);
    return res.clone();
  });
}


// The DESIGN.md cache is global per URL (derived only from the public site),
// but each workspace only sees/generates the URLs it has saved.
//
// GET ?url=…            → returns the cache or generates
// GET ?url=…&force=1    → regenerates (admins only: it costs money)
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;

  // The workspace index is no longer requested here: it comes with the page (app/page.tsx)
  const url = normalizeWebUrl(req.nextUrl.searchParams.get("url") ?? "");
  // An uploaded image is a private file, not a site: there is nothing to read
  if (!url || mediaKindOf(url) === "image") return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });
  if (!(await findByWeb(ctx.workspace.id, url))) {
    return Response.json({ error: (await getErrors()).urlNotInWorkspace }, { status: 403 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  if (force && !canManage(ctx.workspace.role)) {
    return Response.json({ error: (await getErrors()).adminsCanRegenerate }, { status: 403 });
  }

  if (!force) {
    const cached = await getDesignMd(url);
    if (cached) return Response.json({ ...(await overlayRevision(ctx.workspace.id, cached)), cached: true });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json({ error: (await getErrors()).noModelKey }, { status: 500 });
  }

  // One job per workspace and URL: the job answers with this workspace's revisions and counts against its quota
  const key = `${ctx.workspace.id}|${url}`;
  const existing = inflight.get(key);
  if (existing) return attach(existing, req);

  // Monthly plan quota: only real generations count (the cache is free)
  const blocked = await quotaBlock(assertQuota(ctx.workspace, "ai"));
  if (blocked) return blocked;

  const ctrl = new AbortController();
  const promise = (async () => {
    try {
      const t0 = Date.now();
      const { tokens, screenshot, fullShot, cover, scroll, logo, logoSvg, icons, fontFiles } = await extractDesign(url, ctrl.signal);
      const t1 = Date.now();
      const { spec, markdown, model, usage, costUsd, provider, requestId, fallbackFrom, prompt } = await generateDesignMd(tokens, screenshot, ctrl.signal);
      const t2 = Date.now();
      ctrl.signal.throwIfAborted();

      const entry = await saveDesignMd(
        { url, markdown, spec, generatedAt: new Date().toISOString(), model, icons, fontFiles },
        { fullShot, cover, scroll, logo, logoSvg }
      );

      log.info("design_md.built", { ref: url, extractMs: t1 - t0, model, modelMs: t2 - t1, tokensIn: usage.input, tokensOut: usage.output });
      void recordUsage({ organizationId: ctx.workspace.id, userId: ctx.user.id }, { action: "design_md", model, inputTokens: usage.input, outputTokens: usage.output, cacheReadTokens: usage.cacheRead, costUsd, provider, requestId, fallbackFrom, promptVersion: prompt, ref: url });

      // If the workspace had revisions, the regeneration becomes the current version and stays in the history
      let revisions = await listRevisions(ctx.workspace.id, url);
      if (revisions.length) {
        await addRevision({
          organizationId: ctx.workspace.id, url, authorId: ctx.user.id, authorName: ctx.user.name || ctx.user.email,
          kind: "regeneration", summary: "Regenerated from scratch from the live site.", spec,
        });
        revisions = await listRevisions(ctx.workspace.id, url);
      }
      return Response.json({ ...entry, revisions, cached: false });
    } catch (err) {
      if (ctrl.signal.aborted) {
        log.info("design_md.cancelled", { ref: url });
        return CANCELLED();
      }
      log.error("design_md.failed", { ref: url, err });
      return Response.json({ error: (await getErrors()).unexpected }, { status: 500 });
    } finally {
      inflight.delete(key);
    }
  })();

  const job: Job = { promise, ctrl, waiters: 0 };
  inflight.set(key, job);
  return attach(job, req);
}

// DELETE ?url=… → stops the running generation for that URL (if there is one on this instance)
export async function DELETE(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const url = normalizeWebUrl(req.nextUrl.searchParams.get("url") ?? "");
  if (!url) return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });
  const job = inflight.get(`${ctx.workspace.id}|${url}`);
  if (job) job.ctrl.abort();
  return Response.json({ stopped: !!job });
}
