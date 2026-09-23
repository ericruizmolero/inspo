// Server helpers: current session, active workspace and permissions.
// A workspace is a Better Auth organization with metadata.kind = "personal" | "team".
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

/** Session + active workspace. Throws HttpError(401) if there's no session. */
export async function getCtx(): Promise<Ctx> {
  return (await resolveCtx()).ctx;
}

/** For pages: the context, or off to login (returning to `next`) if there's no session. */
export async function getCtxOrLogin(next?: string): Promise<Ctx> {
  try {
    return await getCtx();
  } catch (e) {
    if (e instanceof HttpError) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
    throw e;
  }
}

// `fallback`: the session had no active workspace (or is no longer a member) and one was picked here.
// Saving it writes a cookie, which a Server Component can't do: requireCtx does that.
const resolveCtx = cache(async (): Promise<{ ctx: Ctx; fallback: boolean }> => {
  const s = await getSession();
  if (!s) throw new HttpError(401, (await getErrors()).notSignedIn);
  const user: SessionUser = { id: s.user.id, name: s.user.name, email: s.user.email, image: s.user.image, language: toLocale((s.user as { language?: unknown }).language) };

  // A single query in the normal case; the personal one is only created (and re-read) the first time
  let workspaces = await listWorkspaces(user.id);
  if (!workspaces.some((w) => w.kind === "personal")) {
    await ensurePersonalWorkspace(user.id, user.name, user.email);
    workspaces = await listWorkspaces(user.id);
  }

  const activeId = (s.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null;
  const active = workspaces.find((w) => w.id === activeId);
  // No active workspace: if they're in a team, better to start there than in the empty personal one
  const workspace = active ?? workspaces.find((w) => w.kind === "team") ?? workspaces[0];
  return { ctx: { user, workspace, workspaces }, fallback: !active };
});

export const canManage = (role: Role) => role === "owner" || role === "admin";

/** For route handlers: returns the context or an error Response. */
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

/** What a Server Action returns: expected errors come back as a value, not an exception. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/**
 * For Server Actions. They're public POST endpoints: the session is checked in here,
 * never assumed. An HttpError thrown in `fn` comes back as { ok: false, error }.
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

