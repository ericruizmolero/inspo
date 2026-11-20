"use server";
// Workspace settings that Better Auth does not take from the client (input: false in lib/auth.ts), handing a team
// over and deleting one.
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "@/lib/db";
import { auth } from "@/lib/auth";
import { withCtx, canManage, HttpError } from "@/lib/workspace";
import { deleteWorkspace } from "@/lib/workspace-delete";
import { isOutputLanguage } from "@/lib/output-language";
import { getErrors } from "@/lib/i18n";
import { tellDeleted, tellOwner } from "@/lib/team-mail";

/**
 * The language the model writes in for a workspace. Owners and admins only.
 * By id, not the active workspace: Account sets the personal one while a team is active.
 */
export async function setOutputLanguage(workspaceId: string, lang: string) {
  return withCtx(async (ctx) => {
    const errors = await getErrors();
    if (!isOutputLanguage(lang)) throw new HttpError(400, errors.badBody);
    const ws = ctx.workspaces.find((w) => w.id === workspaceId);
    if (!ws || !canManage(ws.role)) throw new HttpError(403, errors.workspaceAdminsCan);
    await db.update(schema.organization).set({ outputLanguage: lang }).where(eq(schema.organization.id, ws.id));
  });
}

/**
 * Makes another member the team's owner, and its owner until now an admin, in one transaction. The owner only, the
 * check made again on their own row, locked: two hand-overs at once leave one owner, not two. Who pays does not
 * change: the billing account (billing_account.owner_user_id) stays with whoever paid it. The new owner is told.
 */
export async function handOverTeam(workspaceId: string, memberId: string) {
  return withCtx(async (ctx) => {
    const errors = await getErrors();
    const ws = ctx.workspaces.find((w) => w.id === workspaceId);
    if (!ws) throw new HttpError(404, errors.notAMember);
    if (ws.kind !== "team" || ws.role !== "owner") throw new HttpError(403, errors.ownerOnly);
    const M = schema.member;
    const to = await db.transaction(async (tx) => {
      const [me] = await tx.select().from(M).where(and(eq(M.organizationId, ws.id), eq(M.userId, ctx.user.id))).for("update");
      if (!me?.role.split(",").includes("owner")) throw new HttpError(403, errors.ownerOnly);
      const [next] = await tx.select().from(M).where(and(eq(M.id, memberId), eq(M.organizationId, ws.id))).for("update");
      if (!next || next.id === me.id) throw new HttpError(400, errors.badBody);
      await tx.update(M).set({ role: "owner" }).where(eq(M.id, next.id));
      await tx.update(M).set({ role: "admin" }).where(eq(M.id, me.id));
      return next.userId;
    });
    await tellOwner({ organizationId: ws.id, actorId: ctx.user.id, userId: to });
  });
}

/**
 * Deletes a team. Its owner only, by id: any of the person's spaces, not only the open one. When it was the open
 * one, the person lands where a session with no space would: their first team, else the personal space.
 */
export async function deleteTeam(workspaceId: string) {
  return withCtx(async (ctx) => {
    const errors = await getErrors();
    const ws = ctx.workspaces.find((w) => w.id === workspaceId);
    if (!ws) throw new HttpError(404, errors.notAMember);
    if (ws.role !== "owner") throw new HttpError(403, errors.ownerOnly);
    if (ws.kind === "team") await tellDeleted({ organizationId: ws.id, actorId: ctx.user.id });
    await deleteWorkspace(ws.id);
    const rest = ctx.workspaces.filter((w) => w.id !== ws.id);
    const next = rest.find((w) => w.kind === "team") ?? rest[0];
    if (ctx.workspace.id === ws.id && next) await auth.api.setActiveOrganization({ headers: await headers(), body: { organizationId: next.id } });
  });
}
