// Where something saved from the extension lands: the project picked in the popup (the one this person
// was working in when none is picked), and the areas of its system ticked there, as the board's add
// dialog does. Shared by POST /api/ext/v1/items and /media.
import "server-only";
import { activeProjectFor, fileItems } from "./projects";
import { assignEvidence } from "./system";
import { SYSTEM_AREAS, type SystemArea } from "@/types/system";
import type { ExtCtx } from "./ext-keys";

export const cleanAreas = (v: unknown): SystemArea[] =>
  Array.isArray(v) ? [...new Set(v.filter((a): a is SystemArea => SYSTEM_AREAS.includes(a)))] : [];

/** Never throws: the item is saved already, and a project that went away leaves it in the Inbox */
export async function fileFromExt(ctx: ExtCtx, itemId: string | undefined, picked: unknown, areas: SystemArea[]): Promise<void> {
  if (!itemId) return;
  try {
    const projectId = (typeof picked === "string" && picked) || await activeProjectFor(ctx.workspace.id, ctx.user.id);
    if (!projectId) return;
    await fileItems(ctx.workspace.id, projectId, [itemId], ctx.user.id);
    for (const area of areas) await assignEvidence(ctx.workspace.id, projectId, area, itemId, true, { id: ctx.user.id, name: ctx.user.name });
  } catch (e) { console.error("ext: not filed", e instanceof Error ? e.message : e); }
}
