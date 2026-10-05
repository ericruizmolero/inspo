"use server";
// Workspace settings that Better Auth does not take from the client (input: false in lib/auth.ts).
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withCtx, canManage, HttpError } from "@/lib/workspace";
import { isOutputLanguage } from "@/lib/output-language";
import { getErrors } from "@/lib/i18n";

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
