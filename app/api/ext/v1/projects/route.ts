// The projects the popup can save to, and the one it picks first: where this person last added something.
// A board imported from the extension asks here for the project named after it.
import { requireExtCtx } from "@/lib/ext-keys";
import { loadProjects, activeProjectFor, projectForBoard } from "@/lib/projects";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";
import { log, recordFailure } from "@/lib/log";

// GET → { projects: [{ id, name }], active }
export async function GET(req: Request) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  const [{ projects }, active] = await Promise.all([
    loadProjects(ctx.workspace.id),
    activeProjectFor(ctx.workspace.id, ctx.user.id).catch((err) => { log.warn("ext.active_project_unknown", { err }); return null; }),
  ]);
  return Response.json({ projects: projects.map((p) => ({ id: p.id, name: p.name })), active });
}

// POST { name } → { project: { id, name } }: the project of a board with that name, made the first time
export async function POST(req: Request) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  const body = (await req.json().catch(() => ({}))) as { name?: unknown };
  try {
    const project = await projectForBoard(ctx.workspace.id, typeof body.name === "string" ? body.name : "", ctx.user.id);
    return Response.json({ project: { id: project.id, name: project.name } });
  } catch (err) {
    if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
    void recordFailure("action", "board project from the extension", err);
    return Response.json({ error: (await getErrors()).unexpected }, { status: 500 });
  }
}
