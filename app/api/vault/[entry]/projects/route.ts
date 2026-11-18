import { NextResponse } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { projectsUsing, pickForProject } from "@/lib/vault";
import { HttpError } from "@/lib/workspace-core";

// "Use in a project": the projects of the active workspace a Vault entry was chosen for (GET), choosing it for
// one (POST { projectId }) and taking that back (DELETE { projectId }). The project has to be the workspace's own.
const fail = (e: unknown) => {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  throw e;
};

export async function GET(_req: Request, ctx: RouteContext<"/api/vault/[entry]/projects">) {
  const session = await requireCtx();
  if (isResponse(session)) return session;
  return NextResponse.json({ projects: await projectsUsing(session.workspace.id, (await ctx.params).entry) }, { headers: { "Cache-Control": "private, no-store" } });
}

async function set(req: Request, ctx: RouteContext<"/api/vault/[entry]/projects">, on: boolean) {
  const session = await requireCtx();
  if (isResponse(session)) return session;
  try {
    const { projectId } = (await req.json().catch(() => ({}))) as { projectId?: string };
    const entry = (await ctx.params).entry;
    await pickForProject(session.workspace.id, session.user.id, entry, String(projectId ?? ""), on);
    return NextResponse.json({ projects: await projectsUsing(session.workspace.id, entry) });
  } catch (e) { return fail(e); }
}
export const POST = (req: Request, ctx: RouteContext<"/api/vault/[entry]/projects">) => set(req, ctx, true);
export const DELETE = (req: Request, ctx: RouteContext<"/api/vault/[entry]/projects">) => set(req, ctx, false);
