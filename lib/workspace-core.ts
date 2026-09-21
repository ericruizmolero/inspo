// Workspaces: lógica pura sobre la base de datos, sin dependencias de Next.
// La usan tanto el servidor (lib/workspace.ts) como los scripts (scripts/*.ts).
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { DEFAULT_PLAN, isPlanKey, type PlanKey } from "./plans";

export type WorkspaceKind = "personal" | "team";
export type Role = "owner" | "admin" | "member";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  kind: WorkspaceKind;
  role: Role;
  /** Logo de empresa (data URL pequeña o URL); null si no tiene */
  logo: string | null;
  /** Plan del SaaS (metadata.plan); "solo" si no tiene */
  plan: PlanKey;
}

export interface SessionUser { id: string; name: string; email: string; image?: string | null }

export interface Ctx {
  user: SessionUser;
  workspace: Workspace;
  workspaces: Workspace[];
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function kindOf(metadata: string | null): WorkspaceKind {
  try { return JSON.parse(metadata ?? "{}")?.kind === "personal" ? "personal" : "team"; }
  catch { return "team"; }
}
export function planOfMetadata(metadata: string | null): PlanKey {
  try { const p = JSON.parse(metadata ?? "{}")?.plan; return typeof p === "string" && isPlanKey(p) ? p : DEFAULT_PLAN; }
  catch { return DEFAULT_PLAN; }
}

/** Cambia el plan de un workspace conservando el resto de la metadata. */
export async function setWorkspacePlan(organizationId: string, plan: PlanKey): Promise<void> {
  const [row] = await db.select({ metadata: schema.organization.metadata }).from(schema.organization).where(eq(schema.organization.id, organizationId)).limit(1);
  if (!row) throw new Error("Workspace no encontrado");
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(row.metadata ?? "{}") ?? {}; } catch { /* metadata rota: se reescribe */ }
  await db.update(schema.organization).set({ metadata: JSON.stringify({ ...meta, plan }) }).where(eq(schema.organization.id, organizationId));
}

const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "equipo";
}

/** Crea el workspace personal del usuario si aún no lo tiene. Devuelve su id. */
export async function ensurePersonalWorkspace(userId: string, name: string, email: string): Promise<string> {
  const rows = await db
    .select({ id: schema.organization.id, metadata: schema.organization.metadata })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .where(eq(schema.member.userId, userId));
  const personal = rows.find((r) => kindOf(r.metadata) === "personal");
  if (personal) return personal.id;

  const id = newId();
  const now = new Date();
  await db.insert(schema.organization).values({
    id,
    name: name || email.split("@")[0],
    slug: `p-${userId.slice(0, 8)}-${newId().slice(0, 6)}`,
    createdAt: now,
    metadata: JSON.stringify({ kind: "personal" }),
  });
  await db.insert(schema.member).values({ id: newId(), organizationId: id, userId, role: "owner", createdAt: now });
  return id;
}

export async function listWorkspaces(userId: string): Promise<Workspace[]> {
  const rows = await db
    .select({
      id: schema.organization.id, name: schema.organization.name, slug: schema.organization.slug, logo: schema.organization.logo,
      metadata: schema.organization.metadata, role: schema.member.role, createdAt: schema.organization.createdAt,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .where(eq(schema.member.userId, userId));
  return rows
    .map((r) => ({ id: r.id, name: r.name, slug: r.slug, logo: r.logo ?? null, kind: kindOf(r.metadata), plan: planOfMetadata(r.metadata), role: (r.role.split(",")[0] as Role) ?? "member", createdAt: r.createdAt }))
    .sort((a, b) => (a.kind === b.kind ? +a.createdAt - +b.createdAt : a.kind === "personal" ? -1 : 1))
    .map(({ createdAt: _c, ...w }) => w);
}

/** Miembros de un workspace (para el filtro "Quién" y la página de equipo). */
export async function listMembers(organizationId: string) {
  return db
    .select({ id: schema.member.id, userId: schema.user.id, name: schema.user.name, email: schema.user.email, image: schema.user.image, role: schema.member.role, createdAt: schema.member.createdAt })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(eq(schema.member.organizationId, organizationId));
}

export async function isMember(organizationId: string, userId: string) {
  const [m] = await db.select({ id: schema.member.id }).from(schema.member)
    .where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, userId))).limit(1);
  return !!m;
}

