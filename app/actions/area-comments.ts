"use server";
// The team's thread on one area of a project's system (lib/area-comments.ts).
import { withCtx } from "@/lib/workspace";
import { addAreaComment, areaThread, deleteAreaComment } from "@/lib/area-comments";

export async function loadAreaThread(projectId: string, area: string, itemIds: string[]) {
  return withCtx(async (ctx) => areaThread(ctx.workspace.id, String(projectId), String(area), Array.isArray(itemIds) ? itemIds.map(String) : [], ctx.user.id));
}

export async function postAreaComment(projectId: string, area: string, body: string) {
  return withCtx(async (ctx) => addAreaComment(ctx.workspace.id, String(projectId), String(area), String(body ?? ""), { id: ctx.user.id, name: ctx.user.name, image: ctx.user.image }));
}

export async function removeAreaComment(id: string) {
  return withCtx(async (ctx) => deleteAreaComment(ctx.workspace.id, String(id), ctx.user.id));
}
