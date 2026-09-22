"use server";
// Llaves de la extensión desde la web (sesión de cookie): /extension/conectar crea, /equipo revoca.
import { withCtx, canManage, HttpError } from "@/lib/workspace";
import { createExtKey, revokeExtKey } from "@/lib/ext-keys";
import { getErrors } from "@/lib/i18n";

/** La llave en claro solo sale aquí, una vez. */
export async function createKey(organizationId: string, name: string) {
  return withCtx(async (ctx) => {
    const ws = ctx.workspaces.find((w) => w.id === organizationId);
    if (!ws) throw new HttpError(403, (await getErrors()).workspaceNotYours);
    const { key, row } = await createExtKey(ctx.user.id, ws.id, String(name ?? "").slice(0, 80) || "Navegador");
    return { key, id: row.id, prefix: row.prefix, workspace: { id: ws.id, name: ws.name, kind: ws.kind } };
  });
}

/** Su dueño siempre; un admin del workspace, cualquiera del workspace. */
export async function revokeKey(id: string) {
  return withCtx(async (ctx) => {
    const r = await revokeExtKey(id, (row) => row.userId === ctx.user.id || (row.organizationId === ctx.workspace.id && canManage(ctx.workspace.role)));
    if (r === "not_found") throw new HttpError(404, (await getErrors()).keyGone);
    if (r === "forbidden") throw new HttpError(403, (await getErrors()).ownerOrAdminRevoke);
  });
}
