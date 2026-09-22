// Helpers de servidor: sesión actual, workspace activo y permisos.
// Un workspace es una organization de Better Auth con metadata.kind = "personal" | "team".
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { auth } from "./auth";
import { toLocale } from "./i18n/locale";
import { ensurePersonalWorkspace, listWorkspaces, HttpError, type Ctx, type Role, type SessionUser } from "./workspace-core";
import { getErrors } from "./i18n";

export * from "./workspace-core";

export { getSession };

/** Sesión + workspace activo. Lanza HttpError(401) si no hay sesión. */
export async function getCtx(): Promise<Ctx> {
  return (await resolveCtx()).ctx;
}

/** Para páginas: el contexto, o al login (volviendo a `next`) si no hay sesión. */
export async function getCtxOrLogin(next?: string): Promise<Ctx> {
  try {
    return await getCtx();
  } catch (e) {
    if (e instanceof HttpError) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
    throw e;
  }
}

// `fallback`: la sesión no tenía workspace activo (o ya no es miembro) y se eligió uno aquí.
// Guardarlo escribe una cookie, cosa que un Server Component no puede hacer: eso lo hace requireCtx.
const resolveCtx = cache(async (): Promise<{ ctx: Ctx; fallback: boolean }> => {
  const s = await getSession();
  if (!s) throw new HttpError(401, (await getErrors()).notSignedIn);
  const user: SessionUser = { id: s.user.id, name: s.user.name, email: s.user.email, image: s.user.image, language: toLocale((s.user as { language?: unknown }).language) };

  // Una sola consulta en el caso normal; solo se crea el personal (y se relee) la primera vez
  let workspaces = await listWorkspaces(user.id);
  if (!workspaces.some((w) => w.kind === "personal")) {
    await ensurePersonalWorkspace(user.id, user.name, user.email);
    workspaces = await listWorkspaces(user.id);
  }

  const activeId = (s.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null;
  const active = workspaces.find((w) => w.id === activeId);
  // Sin workspace activo: si está en algún equipo, mejor empezar ahí que en el personal vacío
  const workspace = active ?? workspaces.find((w) => w.kind === "team") ?? workspaces[0];
  return { ctx: { user, workspace, workspaces }, fallback: !active };
});

export const canManage = (role: Role) => role === "owner" || role === "admin";

/** Para route handlers: devuelve el contexto o una Response de error. */
export async function requireCtx(opts?: { manage?: boolean }): Promise<Ctx | Response> {
  try {
    const { ctx, fallback } = await resolveCtx();
    if (fallback) {
      await auth.api.setActiveOrganization({ headers: await headers(), body: { organizationId: ctx.workspace.id } }).catch(() => {});
    }
    if (opts?.manage && !canManage(ctx.workspace.role)) {
      return Response.json({ error: (await getErrors()).workspaceAdminsCan }, { status: 403 });
    }
    return ctx;
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export const isResponse = (x: unknown): x is Response => x instanceof Response;

/** Lo que devuelve una Server Action: los errores esperados vuelven como valor, no como excepción. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Para Server Actions. Son endpoints POST públicos: la sesión se comprueba aquí dentro,
 * nunca se da por hecha. Un HttpError lanzado en `fn` vuelve como { ok: false, error }.
 */
export async function withCtx<T>(fn: (ctx: Ctx) => Promise<T>, opts?: { manage?: boolean }): Promise<ActionResult<T>> {
  const ctx = await requireCtx(opts);
  if (isResponse(ctx)) return { ok: false, error: ((await ctx.json()) as { error: string }).error };
  try {
    return { ok: true, data: await fn(ctx) };
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

