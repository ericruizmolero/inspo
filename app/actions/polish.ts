"use server";
// Polish: the project's brief and the decisions taken on its board. The model calls
// (the games) take longer and go through app/api/polish.
import { withCtx } from "@/lib/workspace";
import { getPolish, saveBrief, addDecision } from "@/lib/polish";
import type { PolishBrief } from "@/types/polish";

export async function loadPolish(projectId: string) {
  return withCtx(async (ctx) => getPolish(ctx.workspace.id, String(projectId)));
}

/** Any member writes the brief: the board is the team's. */
export async function savePolishBrief(projectId: string, brief: Partial<PolishBrief>) {
  return withCtx(async (ctx) => saveBrief(ctx.workspace.id, String(projectId), brief ?? {}, ctx.user.id));
}

/** Remembers an answer so the same question is not asked again. */
export async function decidePolish(projectId: string, decision: { notDupes?: string[]; keptTone?: string[] }) {
  return withCtx(async (ctx) => addDecision(ctx.workspace.id, String(projectId), decision ?? {}));
}
