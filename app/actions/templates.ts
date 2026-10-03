"use server";
// Templates: list them, keep a project's system as one, start a project from one, the recipe of a project.
import { withCtx } from "@/lib/workspace";
import { deleteTemplate, getRecipe, listTemplates, saveAsTemplate, setRecipe, useTemplate } from "@/lib/templates";
import type { ProjectTemplate } from "@/types/system";

export async function loadTemplates() {
  return withCtx(async (ctx) => listTemplates(ctx.workspace.id));
}

export async function keepAsTemplate(projectId: string, input: { name: string } & Partial<ProjectTemplate>) {
  return withCtx(async (ctx) => saveAsTemplate(ctx.workspace.id, String(projectId), input, { id: ctx.user.id, name: ctx.user.name }));
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
