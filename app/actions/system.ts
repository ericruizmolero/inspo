"use server";
// The project's system: read it, confirm or write an area, hand an area back to the board.
// The model run (reading the whole board) takes longer and goes through app/api/system.
import { withCtx } from "@/lib/workspace";
import { getSystem, boardStamp, decideArea, releaseArea } from "@/lib/system";
import type { SystemEvidence } from "@/types/system";

export async function loadSystem(projectId: string) {
  return withCtx(async (ctx) => {
    const id = String(projectId);
    const [system, board] = await Promise.all([getSystem(ctx.workspace.id, id), boardStamp(ctx.workspace.id, id)]);
    return { system, board };
  });
}

/** Any member decides: the system is the team's. An empty decision empties the area. */
export async function decideSystemArea(projectId: string, area: string, input: { decision: string; confidence?: number; evidence?: SystemEvidence[] }) {
  return withCtx(async (ctx) => decideArea(ctx.workspace.id, String(projectId), String(area), input ?? { decision: "" }, { id: ctx.user.id, name: ctx.user.name }));
}

/** The next run may change this area again. */
export async function releaseSystemArea(projectId: string, area: string) {
  return withCtx(async (ctx) => releaseArea(ctx.workspace.id, String(projectId), String(area), { id: ctx.user.id, name: ctx.user.name }));
}
