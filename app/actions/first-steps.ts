"use server";
// The first steps list (components/FirstSteps.tsx): reading where the person is, hiding it, and the one signal the
// app had nowhere else, criterio.md leaving by copy or download.
import { withCtx } from "@/lib/workspace";
import { firstSteps, hideFirstSteps, markExported } from "@/lib/first-steps";

export async function loadFirstSteps() {
  return withCtx(async (ctx) => firstSteps(ctx.user.id, ctx.workspace.id));
}

export async function hideFirstStepsList() {
  return withCtx(async (ctx) => hideFirstSteps(ctx.user.id));
}

export async function criterioExported(projectId: string) {
  return withCtx(async (ctx) => markExported(ctx.workspace.id, String(projectId)));
}
