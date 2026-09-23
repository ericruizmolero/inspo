"use server";
// Extension keys from the web (cookie session): /extension/connect creates, /settings revokes.
import { withCtx, canManage, HttpError } from "@/lib/workspace";
import { createExtKey, revokeExtKey } from "@/lib/ext-keys";
import { getErrors } from "@/lib/i18n";

/** The plain key only comes out here, once. */
export async function createKey(organizationId: string, name: string) {
  return withCtx(async (ctx) => {
    const ws = ctx.workspaces.find((w) => w.id === organizationId);
    if (!ws) throw new HttpError(403, (await getErrors()).workspaceNotYours);
    const { key, row } = await createExtKey(ctx.user.id, ws.id, String(name ?? "").slice(0, 80) || "Browser");
    return { key, id: row.id, prefix: row.prefix, workspace: { id: ws.id, name: ws.name, kind: ws.kind } };
  });
}

/** Its owner always; a workspace admin, any key in the workspace. */
export async function revokeKey(id: string) {
  return withCtx(async (ctx) => {
    const r = await revokeExtKey(id, (row) => row.userId === ctx.user.id || (row.organizationId === ctx.workspace.id && canManage(ctx.workspace.role)));
    if (r === "not_found") throw new HttpError(404, (await getErrors()).keyGone);
    if (r === "forbidden") throw new HttpError(403, (await getErrors()).ownerOrAdminRevoke);
  });
}
