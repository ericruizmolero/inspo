import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { addItem } from "@/lib/items";
import { fetchSiteText } from "@/lib/extract";
import { normalizeWebUrl, guessEmpresa, tipoFromUrl } from "@/lib/url";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";

export const runtime = "nodejs";

// Sacar el nombre de la web no debería frenar el alta: si tarda más que esto, se usa el dominio.
const NAME_TIMEOUT_MS = 5000;

async function resolveEmpresa(web: string): Promise<string> {
  const site = await Promise.race([
    fetchSiteText(web).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), NAME_TIMEOUT_MS)),
  ]);
  return guessEmpresa(web, site);
}

// POST { web, empresa?, tipo?, comentarios?, subcomentarios? }
// Solo la URL es obligatoria: nombre y colección se deducen si no llegan.
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  try {
    const body = await req.json();
    const { empresa, web: rawWeb, tipo, comentarios, subcomentarios } = body as Record<string, string | undefined>;
    const web = normalizeWebUrl(rawWeb ?? "");
    if (!web) return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });

    const item = await addItem(ctx.workspace.id, {
      empresa: empresa?.trim() || (await resolveEmpresa(web)),
      web,
      tipo: tipo?.trim() || tipoFromUrl(web),
      comentarios, subcomentarios,
      autor: ctx.user.name || ctx.user.email,
      createdBy: ctx.user.id,
    });
    return Response.json({ ok: true, item });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // El estado viene del error, no de lo que diga el mensaje: el texto está traducido
    return Response.json({ error: msg }, { status: err instanceof HttpError ? err.status : 500 });
  }
}
