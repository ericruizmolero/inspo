"use server";
// Workspaces inside a billing account (Settings, Plan). Only the account's owner adds to it: one creates a workspace
// in it, or moves in a team they own that another account pays for. A team made from the switcher gets an account of
// its own in Better Auth's hook instead (lib/auth.ts).
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema, type Exec } from "@/lib/db";
import { withCtx, HttpError, newId, slugify, dropEmptyAccount, type Ctx } from "@/lib/workspace";
import { assertWorkspaceRoom } from "@/lib/quota";
import { toOutputLanguage } from "@/lib/output-language";
import { getErrors, getT } from "@/lib/i18n";

/** The current workspace's account, if the person signed in owns it */
async function ownedAccount(ctx: Ctx): Promise<string> {
  const [a] = await db.select({ ownerUserId: schema.billingAccount.ownerUserId }).from(schema.billingAccount)
    .where(eq(schema.billingAccount.id, ctx.workspace.billingAccountId)).limit(1);
  if (a?.ownerUserId !== ctx.user.id) throw new HttpError(403, (await getT()).t.quota.notAccountOwner);
  return ctx.workspace.billingAccountId;
}

/** Locks the accounts' rows until the transaction ends, always in the same order, so two moves cannot deadlock */
const lock = (exec: Exec, ids: string[]) =>
  exec.select({ id: schema.billingAccount.id }).from(schema.billingAccount)
    .where(inArray(schema.billingAccount.id, ids)).orderBy(asc(schema.billingAccount.id)).for("update");

/** A new team workspace in the current workspace's account, with the person as its owner. Returns its id. */
export async function createWorkspaceInAccount(name: string) {
  return withCtx(async (ctx) => {
    const value = name.trim().slice(0, 60);
    if (!value) throw new HttpError(400, (await getErrors()).badBody);
    const accountId = await ownedAccount(ctx);
    const id = newId();
    const now = new Date();
    await db.transaction(async (tx) => {
      await lock(tx, [accountId]);
      await assertWorkspaceRoom(accountId, tx);
      await tx.insert(schema.organization).values({
        id, name: value, slug: `${slugify(value)}-${newId().slice(0, 4)}`, createdAt: now, kind: "team",
        billingAccountId: accountId, outputLanguage: toOutputLanguage(ctx.user.language),
      });
      await tx.insert(schema.member).values({ id: newId(), organizationId: id, userId: ctx.user.id, role: "owner", createdAt: now });
    });
    return { id };
  });
}

/**
 * Moves a team the person owns into the current workspace's account. Its old account is deleted if it is left
 * with no workspace and Stripe does not know it.
 */
export async function moveWorkspaceToAccount(workspaceId: string) {
  return withCtx(async (ctx) => {
    const accountId = await ownedAccount(ctx);
    const ws = ctx.workspaces.find((w) => w.id === workspaceId);
    if (!ws || ws.role !== "owner" || ws.kind !== "team" || ws.billingAccountId === accountId) {
      throw new HttpError(403, (await getT()).t.quota.cannotMove);
    }
    await db.transaction(async (tx) => {
      await lock(tx, [accountId, ws.billingAccountId]);
      await assertWorkspaceRoom(accountId, tx);
      await tx.update(schema.organization).set({ billingAccountId: accountId })
        .where(and(eq(schema.organization.id, ws.id), eq(schema.organization.billingAccountId, ws.billingAccountId)));
      await dropEmptyAccount(ws.billingAccountId, tx);
    });
  });
}
