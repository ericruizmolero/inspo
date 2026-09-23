import { NextRequest } from "next/server";
import { normalizeWebUrl } from "@/lib/url";
import { extractDesign } from "@/lib/design-extract";
import { generateDesignMd } from "@/lib/design-md";
import { getDesignMd, saveDesignMd } from "@/lib/design-store";
import { requireCtx, isResponse, canManage } from "@/lib/workspace";
import { findByWeb } from "@/lib/items";
import { overlayRevision, addRevision, listRevisions } from "@/lib/design-revise";
import { recordUsage } from "@/lib/usage";
import { assertQuota, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";

export const maxDuration = 300;

// Una generación por URL a la vez (evita dobles clics / pestañas duplicadas).
// Cada una lleva su AbortController: se para con DELETE ?url=… o cuando el último
// cliente que la esperaba cierra la conexión (cerrar pestaña, "Parar" en el toast).
interface Job { promise: Promise<Response>; ctrl: AbortController; waiters: number }
const inflight = new Map<string, Job>();

async function CANCELLED() {
  return Response.json({ error: (await getErrors()).generationStopped, cancelled: true }, { status: 499 });
}

// Cuenta un cliente más esperando el resultado; si todos se van, se aborta el trabajo.
function attach(job: Job, req: NextRequest): Promise<Response> {
  job.waiters++;
  const leave = () => { if (--job.waiters <= 0) job.ctrl.abort(); };
  req.signal.addEventListener("abort", leave, { once: true });
  return job.promise.then((res) => {
    req.signal.removeEventListener("abort", leave);
    return res.clone();
  });
}


// La caché de DESIGN.md es global por URL (se deriva solo de la web pública),
// pero cada workspace solo ve/genera las URLs que tiene guardadas.
//
// GET ?url=…            → devuelve la caché o genera
// GET ?url=…&force=1    → regenera (solo administradores: cuesta dinero)
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;

  // El índice del workspace ya no se pide aquí: llega con la página (app/page.tsx)
  const url = normalizeWebUrl(req.nextUrl.searchParams.get("url") ?? "");
  if (!url) return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });
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

  const existing = inflight.get(url);
  if (existing) return attach(existing, req);

  // Cuota mensual del plan: solo cuenta lo que se genera de verdad (la caché es gratis)
  const blocked = await quotaBlock(assertQuota(ctx.workspace, "design_md"));
  if (blocked) return blocked;

  const ctrl = new AbortController();
  const promise = (async () => {
    try {
      const t0 = Date.now();
      const { tokens, screenshot, fullShot, cover, scroll } = await extractDesign(url, ctrl.signal);
      const t1 = Date.now();
      const { spec, markdown, model, usage, costUsd, provider, requestId } = await generateDesignMd(tokens, screenshot, ctrl.signal);
      const t2 = Date.now();
      ctrl.signal.throwIfAborted();

      const entry = await saveDesignMd(
        { url, markdown, spec, generatedAt: new Date().toISOString(), model },
        { fullShot, cover, scroll }
      );

      console.log(`design-md ${url}: extract ${t1 - t0}ms, ${model} ${t2 - t1}ms, tokens in/out ${usage.input}/${usage.output}`);
      void recordUsage({ organizationId: ctx.workspace.id, userId: ctx.user.id }, { action: "design_md", model, inputTokens: usage.input, outputTokens: usage.output, cacheReadTokens: usage.cacheRead, costUsd, provider, requestId, ref: url });

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
      if (ctrl.signal.aborted) {
        console.log(`design-md ${url}: parado por el usuario`);
        return CANCELLED();
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("design-md error:", url, msg);
      return Response.json({ error: msg }, { status: 500 });
    } finally {
      inflight.delete(url);
    }
  })();

  const job: Job = { promise, ctrl, waiters: 0 };
  inflight.set(url, job);
  return attach(job, req);
}

// DELETE ?url=… → para la generación en marcha de esa URL (si la hay en esta instancia)
export async function DELETE(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const url = normalizeWebUrl(req.nextUrl.searchParams.get("url") ?? "");
  if (!url) return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });
  const job = inflight.get(url);
  if (job) job.ctrl.abort();
  return Response.json({ stopped: !!job });
}
