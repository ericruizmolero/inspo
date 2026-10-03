"use server";
// The project's system: read it, confirm or write an area, hand an area back to the board.
// The model run (reading the whole board) takes longer and goes through app/api/system.
import { withCtx } from "@/lib/workspace";
import { getSystem, boardStamp, decideArea, releaseArea, boardVisuals, areaHistory, revertArea, assignEvidence, applyTriage, setVerdict, setAreaNever } from "@/lib/system";
import type { SystemArea } from "@/types/system";
import type { SystemEvidence } from "@/types/system";

export async function loadSystem(projectId: string) {
  return withCtx(async (ctx) => {
    const id = String(projectId);
    const [system, board, history] = await Promise.all([getSystem(ctx.workspace.id, id), boardStamp(ctx.workspace.id, id), areaHistory(ctx.workspace.id, id)]);
    return { system, board, history };
  });
}

/** Any member decides: the system is the team's. An empty decision empties the area. */
export async function decideSystemArea(projectId: string, area: string, input: { decision: string; confidence?: number; evidence?: SystemEvidence[]; why?: string }) {
  return withCtx(async (ctx) => decideArea(ctx.workspace.id, String(projectId), String(area), input ?? { decision: "" }, { id: ctx.user.id, name: ctx.user.name }));
}

/** What an area must never do, one rule per line. */
export async function setSystemNever(projectId: string, area: string, never: string) {
  return withCtx(async (ctx) => setAreaNever(ctx.workspace.id, String(projectId), String(area), String(never ?? "")));
}

/** The next run may change this area again. */
export async function releaseSystemArea(projectId: string, area: string) {
  return withCtx(async (ctx) => releaseArea(ctx.workspace.id, String(projectId), String(area), { id: ctx.user.id, name: ctx.user.name }));
}

/** What the sheets of the board's references can show: palettes, families, captures, easing. */
export async function loadSystemVisuals(projectId: string) {
  return withCtx(async (ctx) => boardVisuals(ctx.workspace.id, String(projectId)));
}

/** One step back for an area: what it said before its last change. */
export async function undoSystemArea(projectId: string, area: string) {
  return withCtx(async (ctx) => revertArea(ctx.workspace.id, String(projectId), String(area), { id: ctx.user.id, name: ctx.user.name }));
}

export async function loadSystemHistory(projectId: string) {
  return withCtx(async (ctx) => areaHistory(ctx.workspace.id, String(projectId)));
}

/** From the board: this reference belongs to (or leaves) an area of the project's system. */
export async function assignSystemArea(projectId: string, area: string, itemId: string, on: boolean) {
  return withCtx(async (ctx) => assignEvidence(ctx.workspace.id, String(projectId), String(area), String(itemId), !!on, { id: ctx.user.id, name: ctx.user.name }));
}

/** The reviewed proposals of the Inbox triage: file and hang each reference. */
export async function applySystemTriage(picks: { itemId: string; projectId: string; areas: SystemArea[] }[]) {
  return withCtx(async (ctx) => applyTriage(ctx.workspace.id, Array.isArray(picks) ? picks.slice(0, 300).map((p) => ({ itemId: String(p.itemId), projectId: String(p.projectId), areas: Array.isArray(p.areas) ? p.areas : [] })) : [], { id: ctx.user.id, name: ctx.user.name }));
}

/** On the table: a person keeps or discards a candidate, or rewrites its reason. */
export async function setSystemVerdict(projectId: string, area: string, verdict: { id: string; keep: boolean; reason?: string }) {
  return withCtx(async (ctx) => setVerdict(ctx.workspace.id, String(projectId), String(area), { id: String(verdict.id), keep: !!verdict.keep, reason: verdict.reason }));
}
