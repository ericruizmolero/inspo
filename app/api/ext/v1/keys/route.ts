// Llaves de la extensión. Estas rutas van con la SESIÓN de la web (cookie), no con llave:
// las usa /extension/conectar para crear una y /equipo para listarlas y revocarlas.
import { NextRequest } from "next/server";
import { requireCtx, isResponse, canManage } from "@/lib/workspace";
import { createExtKey, listExtKeys, revokeExtKey } from "@/lib/ext-keys";
import { getErrors } from "@/lib/i18n";

export const runtime = "nodejs";

// GET → llaves activas del workspace actual
export async function GET() {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  return Response.json({ keys: await listExtKeys(ctx.workspace.id) });
}

// POST { organizationId, name } → { key, id, prefix, workspace }  (la llave solo se devuelve aquí)
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const body = (await req.json().catch(() => ({}))) as { organizationId?: string; name?: string };
  const ws = ctx.workspaces.find((w) => w.id === body.organizationId);
  if (!ws) return Response.json({ error: (await getErrors()).workspaceNotYours }, { status: 403 });
  try {
    const { key, row } = await createExtKey(ctx.user.id, ws.id, body.name || "Navegador");
    return Response.json({ key, id: row.id, prefix: row.prefix, workspace: { id: ws.id, name: ws.name, kind: ws.kind } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

// DELETE ?id= → revoca. Su dueño siempre; un admin del workspace, cualquiera del workspace.
export async function DELETE(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: (await getErrors()).missingId }, { status: 400 });
  const r = await revokeExtKey(id, (row) => row.userId === ctx.user.id || (row.organizationId === ctx.workspace.id && canManage(ctx.workspace.role)));
  if (r === "not_found") return Response.json({ error: (await getErrors()).keyGone }, { status: 404 });
  if (r === "forbidden") return Response.json({ error: (await getErrors()).ownerOrAdminRevoke }, { status: 403 });
  return Response.json({ ok: true });
}
