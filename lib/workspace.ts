// Helpers de servidor: sesión actual, workspace activo y permisos.
// Un workspace es una organization de Better Auth con metadata.kind = "personal" | "team".
import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";
import { ensurePersonalWorkspace, listWorkspaces, HttpError, type Ctx, type Role, type SessionUser } from "./workspace-core";

export * from "./workspace-core";

export async function getSession() {
  const h = await headers();
  return auth.api.getSession({ headers: h });
}

/** Sesión + workspace activo. Lanza HttpError(401) si no hay sesión. */
export async function getCtx(): Promise<Ctx> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "No has iniciado sesión");
  const user: SessionUser = { id: s.user.id, name: s.user.name, email: s.user.email, image: s.user.image };

  await ensurePersonalWorkspace(user.id, user.name, user.email);
  const workspaces = await listWorkspaces(user.id);

  const activeId = (s.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null;
  let workspace = workspaces.find((w) => w.id === activeId);
  if (!workspace) {
    // Sin workspace activo: si está en algún equipo, mejor empezar ahí que en el personal vacío
    workspace = workspaces.find((w) => w.kind === "team") ?? workspaces[0];
    const h = await headers();
    await auth.api.setActiveOrganization({ headers: h, body: { organizationId: workspace.id } }).catch(() => {});
  }
  return { user, workspace, workspaces };
}

export const canManage = (role: Role) => role === "owner" || role === "admin";

/** Para route handlers: devuelve el contexto o una Response de error. */
export async function requireCtx(opts?: { manage?: boolean }): Promise<Ctx | Response> {
  try {
    const ctx = await getCtx();
    if (opts?.manage && !canManage(ctx.workspace.role)) {
      return Response.json({ error: "Solo los administradores del workspace pueden hacer esto" }, { status: 403 });
    }
    return ctx;
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export const isResponse = (x: unknown): x is Response => x instanceof Response;

