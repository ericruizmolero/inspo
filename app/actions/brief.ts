"use server";
// A project's brief (lib/brief.ts): the sentence it opens with, and the client's site when it is a redesign.
import { withCtx } from "@/lib/workspace";
import { saveBrief, setClientBrand } from "@/lib/brief";
import { draftBriefAfter } from "@/lib/brief-draft";
import type { Brief } from "@/types/brief";
import { versionAfterEdit } from "@/lib/criterio-versions";

export async function saveProjectBrief(projectId: string, brief: Partial<Brief>) {
  return withCtx(async (ctx) => {
    const out = await saveBrief(ctx.workspace.id, String(projectId), brief ?? {}, ctx.user.id);
    await versionAfterEdit(ctx, String(projectId));
    return out;
  });
}

/** A client site set (or changed) drafts the brief from it once the answer is out (lib/brief-draft.ts) */
export async function setProjectClient(projectId: string, itemId: string | null) {
  return withCtx(async (ctx) => {
    await setClientBrand(ctx.workspace.id, String(projectId), itemId ? String(itemId) : null, ctx.user.id);
    if (itemId) draftBriefAfter(ctx, String(projectId));
    await versionAfterEdit(ctx, String(projectId));
  });
}
