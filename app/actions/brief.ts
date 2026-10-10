"use server";
// A project's brief (lib/brief.ts): the sentence it opens with, and the client's site when it is a redesign.
import { withCtx } from "@/lib/workspace";
import { saveBrief, setClientBrand } from "@/lib/brief";
import type { Brief } from "@/types/brief";

export async function saveProjectBrief(projectId: string, brief: Partial<Brief>) {
  return withCtx(async (ctx) => saveBrief(ctx.workspace.id, String(projectId), brief ?? {}, ctx.user.id));
}

export async function setProjectClient(projectId: string, itemId: string | null) {
  return withCtx(async (ctx) => setClientBrand(ctx.workspace.id, String(projectId), itemId ? String(itemId) : null, ctx.user.id));
}
