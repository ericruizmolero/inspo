// The projects the popup can save to, and the one it picks first: where this person last added something.
import { requireExtCtx } from "@/lib/ext-keys";
import { loadProjects, activeProjectFor } from "@/lib/projects";

// GET → { projects: [{ id, name }], active }
export async function GET(req: Request) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  const [{ projects }, active] = await Promise.all([
    loadProjects(ctx.workspace.id),
    activeProjectFor(ctx.workspace.id, ctx.user.id).catch(() => null),
  ]);
  return Response.json({ projects: projects.map((p) => ({ id: p.id, name: p.name })), active });
}
