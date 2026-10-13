"use server";
// The first steps list (components/FirstSteps.tsx): reading where the person is, hiding it, and the one signal the
// app had nowhere else, criterio.md leaving by copy or download.
import { withCtx } from "@/lib/workspace";
import { firstSteps, hideFirstSteps, markExported } from "@/lib/first-steps";
import { headers } from "next/headers";
import { recordVersion } from "@/lib/criterio-versions";
import { inBackground } from "@/lib/notify";
import { originOfHeaders } from "@/lib/mcp/auth";

export async function loadFirstSteps() {
  return withCtx(async (ctx) => firstSteps(ctx.user.id, ctx.workspace.id));
}

export async function hideFirstStepsList() {
  return withCtx(async (ctx) => hideFirstSteps(ctx.user.id));
}

/** criterio.md left by copy or download: the first steps count it, and the file is kept as a version when it changed */
export async function criterioExported(projectId: string, via: "copy" | "download" = "copy") {
  const origin = originOfHeaders(await headers());
  return withCtx(async (ctx) => {
    const id = String(projectId);
    inBackground(async () => { await recordVersion({ organizationId: ctx.workspace.id, projectId: id, via: via === "download" ? "download" : "copy", byName: ctx.user.name, locale: ctx.user.language, origin }); });
    return markExported(ctx.workspace.id, id);
  });
}
