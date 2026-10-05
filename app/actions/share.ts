"use server";
// Share links of a project's brand (lib/share.ts): any member makes them, sees them and turns them off.
import { withCtx } from "@/lib/workspace";
import { createShare, listShares, revokeShare } from "@/lib/share";

export async function loadShares(projectId: string) {
  return withCtx(async (ctx) => listShares(ctx.workspace.id, String(projectId)));
}

export async function makeShare(projectId: string, mode: "clean" | "full", label: string) {
  return withCtx(async (ctx) => createShare(ctx.workspace.id, String(projectId), mode === "full" ? "full" : "clean", String(label ?? ""), ctx.user.id));
}

export async function stopShare(projectId: string, id: string) {
  return withCtx(async (ctx) => revokeShare(ctx.workspace.id, String(projectId), String(id)));
}
