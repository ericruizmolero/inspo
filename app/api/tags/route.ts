import { NextRequest } from "next/server";
import { requireCtx, isResponse, canManage } from "@/lib/workspace";
import { loadWorkspaceData, setTags, setTagsBulk } from "@/lib/items";
import { classifyItem, jevEnabled, clearSearchCache } from "@/lib/jev";
import { clearExplainCache } from "@/lib/explain";
import { TAXONOMY_VERSION } from "@/lib/taxonomy";
import { visionEnabled } from "@/lib/vision";
import { assertSeatsOk } from "@/lib/quota";
import { HttpError } from "@/lib/workspace-core";
import { getErrors } from "@/lib/i18n";

export const maxDuration = 300;

// Con visión cada item puede tardar 20–40 s (captura + Claude); sin visión, ~1 s.
const perRequest = () => (visionEnabled() ? 8 : 25);
const CONCURRENCY = 4;

// GET → mapa completo + pendientes del workspace
export async function GET() {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    const { items, tagMap } = await loadWorkspaceData(ctx.workspace.id);
    const pending = items.filter((i) => !tagMap[i.web] || tagMap[i.web].v !== TAXONOMY_VERSION).length;
    return Response.json({ map: tagMap, pending, enabled: jevEnabled(), vision: visionEnabled() });
  } catch {
    return Response.json({ map: {}, pending: 0, enabled: jevEnabled(), vision: visionEnabled() });
  }
}

// POST { web, force? } → etiqueta un item del workspace (force solo admins)
// POST { all: true, force? } → etiqueta los pendientes por lotes (solo admins: cuesta dinero)
export async function POST(req: NextRequest) {
  if (!jevEnabled()) return Response.json({ error: "TYPESAFE_API_KEY no configurada" }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  // Bajar de plan puede dejar al equipo con más gente de la que admite: la IA se para hasta que lo arreglen
  try { await assertSeatsOk(ctx.workspace); }
  catch (e) { if (e instanceof HttpError) return Response.json({ error: e.message, quota: true }, { status: e.status }); throw e; }
  const orgId = ctx.workspace.id;
  const manage = canManage(ctx.workspace.role);
  const usage = { organizationId: orgId, userId: ctx.user.id };

  const body = (await req.json().catch(() => ({}))) as { web?: string; all?: boolean; force?: boolean };

  try {
    const { items, tagMap } = await loadWorkspaceData(orgId);

    if (body.web) {
      const item = items.find((i) => i.web === body.web);
      if (!item) return Response.json({ error: (await getErrors()).urlNotInWorkspace }, { status: 404 });
      if (body.force && !manage) return Response.json({ error: (await getErrors()).adminsOnly }, { status: 403 });
      const existing = tagMap[item.web];
      if (existing && existing.v === TAXONOMY_VERSION && !body.force) {
        return Response.json({ tags: existing, cached: true });
      }
      const tags = await classifyItem(item, usage);
      await setTags(orgId, item.web, tags);
      clearSearchCache(); clearExplainCache();
      return Response.json({ tags });
    }

    if (body.all) {
      if (!manage) return Response.json({ error: (await getErrors()).workspaceAdminsOnly }, { status: 403 });
      const todo = items.filter((i) => body.force || !tagMap[i.web] || tagMap[i.web].v !== TAXONOMY_VERSION);
      const batch = todo.slice(0, perRequest());

      let i = 0;
      const done: Record<string, Awaited<ReturnType<typeof classifyItem>>> = {};
      const errors: string[] = [];
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, batch.length) }, async () => {
          while (i < batch.length) {
            const item = batch[i++];
            try { done[item.web] = await classifyItem(item, usage); }
            catch (e) { errors.push(`${item.web}: ${e instanceof Error ? e.message : e}`); }
          }
        })
      );

      await setTagsBulk(orgId, done);
      clearSearchCache(); clearExplainCache();

      return Response.json({
        done: Object.keys(done).length,
        remaining: todo.length - batch.length,
        errors,
        map: done,
      });
    }

    return Response.json({ error: (await getErrors()).missingWebOrAll }, { status: 400 });
  } catch (e) {
    console.error("tags POST error:", e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
