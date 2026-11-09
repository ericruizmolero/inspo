"use server";
// The board's versions (lib/board-versions.ts): the clock in the board's corner lists them, one is looked at in
// place of the board, and any member can put the board back as it was.
import { withCtx } from "@/lib/workspace";
import { boardVersionItems, listBoardVersions, restoreBoardVersion } from "@/lib/board-versions";

export async function boardVersions(projectId: string) {
  return withCtx(async (ctx) => listBoardVersions(ctx.workspace.id, String(projectId)));
}

export async function boardVersionAt(projectId: string, n: number) {
  return withCtx(async (ctx) => boardVersionItems(ctx.workspace.id, String(projectId), Number(n)));
}

export async function restoreBoard(projectId: string, n: number) {
  return withCtx(async (ctx) => restoreBoardVersion(ctx.workspace.id, String(projectId), Number(n), { id: ctx.user.id, name: ctx.user.name || ctx.user.email }));
}
