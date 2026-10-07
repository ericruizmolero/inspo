"use server";
// Templates: list them, start a project from one, the recipe of a project.
import { withCtx, canManage, HttpError } from "@/lib/workspace";
import { startedProject } from "@/lib/projects";
import { getErrors } from "@/lib/i18n";
import { deleteTemplate, getRecipe, listTemplates, setRecipe, useTemplate } from "@/lib/templates";

export async function loadTemplates() {
  return withCtx(async (ctx) => listTemplates(ctx.workspace.id));
}

export async function startFromTemplate(templateId: string, name: string) {
  return withCtx(async (ctx) => useTemplate(ctx.workspace.id, String(templateId), String(name ?? ""), { id: ctx.user.id, name: ctx.user.name }));
}

export async function loadRecipe(projectId: string) {
  return withCtx(async (ctx) => getRecipe(ctx.workspace.id, String(projectId)));
}

export async function saveRecipe(projectId: string, recipe: string) {
  return withCtx(async (ctx) => setRecipe(ctx.workspace.id, String(projectId), String(recipe ?? "")));
}

export async function removeTemplate(templateId: string) {
  // A template is a project: deleted by whoever could delete that project (removeProject)
  return withCtx(async (ctx) => {
    if (!canManage(ctx.workspace.role) && !(await startedProject(ctx.workspace.id, String(templateId), ctx.user.id))) {
      throw new HttpError(403, (await getErrors()).projectNotYours);
    }
    await deleteTemplate(ctx.workspace.id, String(templateId));
  });
}
