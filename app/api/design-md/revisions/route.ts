import { NextRequest } from "next/server";
import { normalizeWebUrl } from "@/lib/url";
import { recordUsage } from "@/lib/usage";
import { promises as fs } from "fs";
import path from "path";
import { requireCtx, isResponse } from "@/lib/workspace";
import { findByWeb } from "@/lib/items";
import { getDesignMd, keyFor } from "@/lib/design-store";
import { renderDesignMd, type DesignSpec } from "@/types/design";
import { SECTIONS, addRevision, getRevisionSpec, latestRevision, listRevisions, reviseDesignSpec } from "@/lib/design-revise";
import { getErrors, getLocale, getT, fmtDate } from "@/lib/i18n";

export const maxDuration = 120;


// Captura guardada de la web, si está en local (en Blob se omite: la spec ya lleva los valores)
async function localScreenshot(url: string): Promise<Buffer | null> {
  try { return await fs.readFile(path.join(process.cwd(), "public", "design-md", `${keyFor(url)}.jpg`)); }
  catch { return null; }
}

// POST { url, section, comment }  → Claude aplica el cambio y queda registrado
// POST { url, revertTo }          → vuelve a la spec de una revisión anterior (nueva fila, historial lineal)
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;

  const body = (await req.json().catch(() => ({}))) as { url?: string; section?: string; comment?: string; revertTo?: string };
  const url = normalizeWebUrl(body.url ?? "");
  if (!url) return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });
  if (!(await findByWeb(ctx.workspace.id, url))) return Response.json({ error: (await getErrors()).urlNotInWorkspace }, { status: 403 });

  const base = await getDesignMd(url);
  if (!base?.spec) return Response.json({ error: (await getErrors()).noDesignMdYet }, { status: 404 });

  const current = (await latestRevision(ctx.workspace.id, url))?.spec ?? base.spec;
  const author = { authorId: ctx.user.id, authorName: ctx.user.name || ctx.user.email };

  try {
    if (body.revertTo) {
      const target = await getRevisionSpec(ctx.workspace.id, body.revertTo);
      if (!target) return Response.json({ error: (await getErrors()).revisionGone }, { status: 404 });
      const { locale, t } = await getT();
      const when = fmtDate(target.meta.createdAt, locale, { day: "2-digit", month: "short" });
      const meta = await addRevision({
        organizationId: ctx.workspace.id, url, ...author, kind: "reversion",
        comment: "", summary: t.designMd.revertedTo(target.meta.authorName, when), spec: target.spec,
      });
      return Response.json(await respond(ctx.workspace.id, url, target.spec, meta.id));
    }

    const section = (body.section ?? "general").trim();
    const comment = (body.comment ?? "").trim().slice(0, 2000);
    if (comment.length < 5) return Response.json({ error: (await getErrors()).tellUsWhat }, { status: 400 });
    if (!(section in SECTIONS)) return Response.json({ error: (await getErrors()).unknownSection }, { status: 400 });
    if (!process.env.OPENROUTER_API_KEY) return Response.json({ error: (await getErrors()).noModelKey }, { status: 500 });

    const t0 = Date.now();
    const out = await reviseDesignSpec({ spec: current, url, section, comment, screenshot: await localScreenshot(url), locale: await getLocale() });
    console.log(`design-md revise ${url} [${section}] by ${author.authorName}: ${Date.now() - t0}ms, ${out.model}, changed=${out.changed}`);
    void recordUsage({ organizationId: ctx.workspace.id, userId: ctx.user.id }, { action: "revise", model: out.model, inputTokens: out.usage.input, outputTokens: out.usage.output, cacheReadTokens: out.usage.cacheRead, costUsd: out.costUsd, ref: url });

    if (!out.changed) {
      return Response.json({ unchanged: true, summary: out.summary, revisions: await listRevisions(ctx.workspace.id, url) });
    }

    const meta = await addRevision({
      organizationId: ctx.workspace.id, url, ...author, kind: "revision",
      section, comment, summary: out.summary, warning: out.warning, spec: out.spec,
    });
    return Response.json(await respond(ctx.workspace.id, url, out.spec, meta.id));
  } catch (e) {
    console.error("design-md revise error:", e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

async function respond(orgId: string, url: string, spec: DesignSpec, id: string) {
  const revisions = await listRevisions(orgId, url);
  const date = revisions[0]?.createdAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  return { spec, markdown: renderDesignMd(spec, url, date), revisions, applied: revisions.find((r) => r.id === id) ?? null };
}
