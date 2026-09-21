import { NextRequest } from "next/server";
import { extractDesign } from "@/lib/design-extract";
import { generateDesignMd } from "@/lib/design-md";
import { getDesignMd, getDesignMdIndex, saveDesignMd } from "@/lib/design-store";
import { requireCtx, isResponse, canManage } from "@/lib/workspace";
import { findByWeb, webSet } from "@/lib/items";
import { overlayRevision, addRevision, listRevisions } from "@/lib/design-revise";
import { recordUsage } from "@/lib/usage";
import { assertQuota } from "@/lib/quota";
import { HttpError } from "@/lib/workspace-core";

export const runtime = "nodejs";
export const maxDuration = 300;

// Una generación por URL a la vez (evita dobles clics / pestañas duplicadas)
const inflight = new Map<string, Promise<Response>>();

function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.href.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

// La caché de DESIGN.md es global por URL (se deriva solo de la web pública),
// pero cada workspace solo ve/genera las URLs que tiene guardadas.
//
// GET                   → índice { url: { generatedAt, model } } de las URLs del workspace ya generadas
// GET ?url=…            → devuelve la caché o genera
// GET ?url=…&force=1    → regenera (solo administradores: cuesta dinero)
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;

  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    const [index, mine] = await Promise.all([getDesignMdIndex(), webSet(ctx.workspace.id)]);
    const norm = new Set([...mine].map((w) => normalizeUrl(w) ?? w));
    return Response.json(Object.fromEntries(Object.entries(index).filter(([u]) => norm.has(u))));
  }

  const url = normalizeUrl(rawUrl);
  if (!url) return Response.json({ error: "url inválida" }, { status: 400 });
  if (!(await findByWeb(ctx.workspace.id, url))) {
    return Response.json({ error: "Esa URL no está en el workspace" }, { status: 403 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  if (force && !canManage(ctx.workspace.role)) {
    return Response.json({ error: "Solo los administradores pueden regenerar" }, { status: 403 });
  }

  if (!force) {
    const cached = await getDesignMd(url);
    if (cached) return Response.json({ ...(await overlayRevision(ctx.workspace.id, cached)), cached: true });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Falta ANTHROPIC_API_KEY en el entorno" }, { status: 500 });
  }

  const existing = inflight.get(url);
  if (existing) return (await existing).clone();

  // Cuota mensual del plan: solo cuenta lo que se genera de verdad (la caché es gratis)
  try { await assertQuota(ctx.workspace, "design_md"); }
  catch (e) { if (e instanceof HttpError) return Response.json({ error: e.message, quota: true }, { status: e.status }); throw e; }

  const job = (async () => {
    try {
      const t0 = Date.now();
      const { tokens, screenshot, fullShot, cover, scroll } = await extractDesign(url);
      const t1 = Date.now();
      const { spec, markdown, model, usage } = await generateDesignMd(tokens, screenshot);
      const t2 = Date.now();

      const entry = await saveDesignMd(
        { url, markdown, spec, generatedAt: new Date().toISOString(), model },
        { fullShot, cover, scroll }
      );

      console.log(`design-md ${url}: extract ${t1 - t0}ms, claude ${t2 - t1}ms, tokens in/out ${usage.input}/${usage.output}`);
      void recordUsage({ organizationId: ctx.workspace.id, userId: ctx.user.id }, { action: "design_md", model, inputTokens: usage.input, outputTokens: usage.output, cacheReadTokens: usage.cacheRead, ref: url });

      // Si el workspace tenía revisiones, la regeneración pasa a ser la versión vigente y queda en el historial
      let revisions = await listRevisions(ctx.workspace.id, url);
      if (revisions.length) {
        await addRevision({
          organizationId: ctx.workspace.id, url, authorId: ctx.user.id, authorName: ctx.user.name || ctx.user.email,
          kind: "regeneracion", summary: "Regenerado desde cero a partir de la web en vivo.", spec,
        });
        revisions = await listRevisions(ctx.workspace.id, url);
      }
      return Response.json({ ...entry, revisions, cached: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("design-md error:", url, msg);
      return Response.json({ error: msg }, { status: 500 });
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, job);
  return job;
}
