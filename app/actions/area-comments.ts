"use server";
// The team's thread on one area of a project's system (lib/area-comments.ts).
import { withCtx } from "@/lib/workspace";
import { addAreaComment, areaThread, deleteAreaComment, resolveProposal, systemActivity } from "@/lib/area-comments";

export async function loadAreaThread(projectId: string, area: string, itemIds: string[]) {
  return withCtx(async (ctx) => areaThread(ctx.workspace.id, String(projectId), String(area), Array.isArray(itemIds) ? itemIds.map(String) : [], ctx.user.id));
}

export async function postAreaComment(projectId: string, area: string, body: string, about?: unknown) {
  return withCtx(async (ctx) => addAreaComment(ctx.workspace.id, String(projectId), String(area), String(body ?? ""), { id: ctx.user.id, name: ctx.user.name, image: ctx.user.image }, about));
}

export async function removeAreaComment(id: string) {
  return withCtx(async (ctx) => deleteAreaComment(ctx.workspace.id, String(id), ctx.user.id));
}

/** The latest changes of a project's system and who is talking in each area (the bento) */
export async function loadSystemActivity(projectId: string) {
  return withCtx(async (ctx) => systemActivity(ctx.workspace.id, String(projectId), ctx.user.id));
}

/** Yes or no to a change someone proposed: yes writes it as the area's decision, the team's. Returns the system. */
export async function answerAreaProposal(id: string, accept: boolean) {
  return withCtx(async (ctx) => resolveProposal(ctx.workspace.id, String(id), !!accept, { id: ctx.user.id, name: ctx.user.name }));
}
