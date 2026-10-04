"use server";
// Templates: list them, start a project from one, the recipe of a project.
import { withCtx } from "@/lib/workspace";
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
  return withCtx(async (ctx) => deleteTemplate(ctx.workspace.id, String(templateId)));
}
