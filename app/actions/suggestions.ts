"use server";
// What an agent brought to a project (lib/suggestions.ts), answered in the app: accepted or dismissed, one by one or all.
import { withCtx } from "@/lib/workspace";
import { acceptSuggestions, dismissSuggestions, pendingBody, type Answering } from "@/lib/suggestions";
import { versionAfterEdit } from "@/lib/criterio-versions";

const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 200) : undefined);
const clean = (w: Answering): Answering => ({ refs: ids(w?.refs), answers: ids(w?.answers), outlines: ids(w?.outlines), all: w?.all === true });

export async function answerSuggestions(projectId: string, accept: boolean, what: Answering) {
  return withCtx(async (ctx) => {
    const who = { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email };
    const out = accept
      ? await acceptSuggestions(ctx.workspace.id, String(projectId), clean(what), who)
      : await dismissSuggestions(ctx.workspace.id, String(projectId), clean(what), who);
    if (out.refs || out.answers || out.outlines) await versionAfterEdit(ctx, String(projectId));
    return out;
  });
}

/** What waits on a project that has no card on the board: an agent's answers and a drafted plan */
export async function pendingSuggestions(projectId: string) {
  return withCtx(async (ctx) => {
    const { answers, outlines } = await pendingBody(ctx.workspace.id, String(projectId));
    return { answers, outlines };
  });
}
