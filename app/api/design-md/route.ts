import { NextRequest } from "next/server";
import { normalizeWebUrl, mediaKindOf, webKeyOf } from "@/lib/url";
import { extractDesign } from "@/lib/design-extract";
import { generateDesignMd } from "@/lib/design-md";
import { getDesignMd, saveDesignMd, type DesignMdEntry } from "@/lib/design-store";
import { keptCopy } from "@/lib/ref-measured";
import { claim, release } from "@/lib/capture-claim";
import { requireCtx, isResponse, canManage } from "@/lib/workspace";
import { findByWeb } from "@/lib/items";
import { overlayRevision, addRevision, listRevisions } from "@/lib/design-revise";
import { recordUsage } from "@/lib/usage";
import { assertQuota, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";
import { log } from "@/lib/log";

export const maxDuration = 300;

// One generation per site at a time, across instances (lib/capture-claim.ts): whoever claims the site generates,
// the others poll for the row and answer from it, as the cached path does. A claim left by a function that was cut
// off goes stale at maxDuration; a request waits up to a margin short of its own.
const CLAIM_STALE_MS = maxDuration * 1000;
const WAIT_MS = maxDuration * 1000 - 20_000;
const POLL_MS = 1500;

// The generations running on this instance, by workspace and URL. Each has its own AbortController: it stops on
// DELETE ?url=… or when the client that started it closes the connection (closing the tab).
const running = new Map<string, AbortController>();

async function CANCELLED() {
  return Response.json({ error: (await getErrors()).generationStopped, cancelled: true }, { status: 499 });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  const askedAt = Date.now();
  // The doc that answers this request: with force, only one generated after it was asked for
  const fresh = (doc: DesignMdEntry | null) => doc && (!force || Date.parse(doc.generatedAt) >= askedAt) ? doc : null;
  const cached = async (doc: DesignMdEntry) => Response.json({ ...(await overlayRevision(ctx.workspace.id, doc)), cached: true });

  const have = fresh(await getDesignMd(url));
  if (have) return cached(have);

  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json({ error: (await getErrors()).noModelKey }, { status: 500 });
  }

  const key = `design:${webKeyOf(url)}`;
  while (!(await claim(key, CLAIM_STALE_MS))) {
    const doc = fresh(await getDesignMd(url));
    if (doc) return cached(doc);
    if (Date.now() - askedAt >= WAIT_MS || req.signal.aborted) return Response.json({ error: (await getErrors()).unexpected }, { status: 503 });
    await sleep(POLL_MS);
  }
  try {
    // Claimed right after another instance saved and released: theirs is the answer
    const doc = fresh(await getDesignMd(url));
    if (doc) return cached(doc);

    // Monthly plan quota: only real generations count (the cache is free)
    const blocked = await quotaBlock(assertQuota(ctx.workspace, "ai"));
    if (blocked) return blocked;

    const runKey = `${ctx.workspace.id}|${url}`;
    const ctrl = new AbortController();
    const stop = () => ctrl.abort();
    req.signal.addEventListener("abort", stop, { once: true });
    running.set(runKey, ctrl);
    try {
      const t0 = Date.now();
      const { tokens, screenshot, fullShot, cover, scroll, logo, logoSvg, icons, fontFiles } = await extractDesign(url, ctrl.signal);
      const t1 = Date.now();
      const { spec, markdown, model, usage, costUsd, provider, requestId, fallbackFrom, prompt } = await generateDesignMd(tokens, screenshot, ctrl.signal);
      const t2 = Date.now();
      ctrl.signal.throwIfAborted();

      const entry = await saveDesignMd(
        { url, markdown, spec, generatedAt: new Date().toISOString(), model, icons, fontFiles, copy: keptCopy(tokens.copy) },
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
      running.delete(runKey);
      req.signal.removeEventListener("abort", stop);
    }
  } finally {
    await release(key);
  }
}

// DELETE ?url=… → stops the running generation for that URL (if there is one on this instance)
export async function DELETE(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const url = normalizeWebUrl(req.nextUrl.searchParams.get("url") ?? "");
  if (!url) return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });
  const job = running.get(`${ctx.workspace.id}|${url}`);
  job?.abort();
  return Response.json({ stopped: !!job });
}
