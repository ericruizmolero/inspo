"use server";
// Polish: the project's brief and the decisions taken on its board. The model calls
// (the games) take longer and go through app/api/polish.
import { withCtx } from "@/lib/workspace";
import { getPolish, saveBrief, addDecision, mergeInto, saveWhy, setClientBrand } from "@/lib/polish";
import type { PolishBrief, Why } from "@/types/polish";

export async function loadPolish(projectId: string) {
  return withCtx(async (ctx) => getPolish(ctx.workspace.id, String(projectId)));
}

/** Any member writes the brief: the board is the team's. */
export async function savePolishBrief(projectId: string, brief: Partial<PolishBrief>) {
  return withCtx(async (ctx) => saveBrief(ctx.workspace.id, String(projectId), brief ?? {}, ctx.user.id));
}

/** A redesign: which reference on the board is the client's current site (null clears it). */
export async function setProjectClient(projectId: string, itemId: string | null) {
  return withCtx(async (ctx) => setClientBrand(ctx.workspace.id, String(projectId), itemId ? String(itemId) : null, ctx.user.id));
}

/** Remembers an answer so the same question is not asked again. */
export async function decidePolish(projectId: string, decision: { notDupes?: string[]; keptTone?: string[]; keptDuel?: string[]; keptLight?: string[] }) {
  return withCtx(async (ctx) => addDecision(ctx.workspace.id, String(projectId), decision ?? {}));
}

/** The why of one reference in this project: what the team takes from it. */
export async function savePolishWhy(projectId: string, itemId: string, why: Partial<Why>) {
  return withCtx(async (ctx) => saveWhy(ctx.workspace.id, String(projectId), String(itemId), why ?? {}, ctx.user.id));
}

/** Duplicates, merged: what was written on the ones that leave is kept on the one that stays. */
export async function mergePolish(_projectId: string, keepId: string, fromIds: string[]) {
  return withCtx(async (ctx) => mergeInto(ctx.workspace.id, String(keepId), Array.isArray(fromIds) ? fromIds.map(String) : [], { id: ctx.user.id, name: ctx.user.name }));
}
