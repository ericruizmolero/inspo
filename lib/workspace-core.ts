// Workspaces: pure database logic, with no Next dependencies.
// Used by both the server (lib/workspace.ts) and scripts (scripts/*.ts).
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { DEFAULT_PLAN, isPlanKey, type PlanKey } from "./plans";
import type { Locale } from "./i18n/locale";

export type WorkspaceKind = "personal" | "team";
export type Role = "owner" | "admin" | "member";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  kind: WorkspaceKind;
  role: Role;
  /** Company logo (small data URL or URL); null if none */
  logo: string | null;
  /** SaaS plan (organization.plan) */
  plan: PlanKey;
}

export interface SessionUser { id: string; name: string; email: string; image?: string | null; language: Locale }

export interface Ctx {
  user: SessionUser;
  workspace: Workspace;
  workspaces: Workspace[];
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const planKey = (p: string): PlanKey => (isPlanKey(p) ? p : DEFAULT_PLAN);

/**
 * Changes a workspace's plan.
 * Whoever downgrades must notify the owner if the team ends up over the limit:
 * notifyOverCapacity() in lib/quota.ts.
 */
export async function setWorkspacePlan(organizationId: string, plan: PlanKey): Promise<void> {
  const res = await db.update(schema.organization).set({ plan }).where(eq(schema.organization.id, organizationId));
  if (!res.rowCount) throw new Error("Workspace not found");
}

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "team";
}

/** Creates the user's personal workspace if they don't have one yet. Returns its id. */
export async function ensurePersonalWorkspace(userId: string, name: string, email: string): Promise<string> {
  const rows = await db
    .select({ id: schema.organization.id })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .where(and(eq(schema.member.userId, userId), eq(schema.organization.kind, "personal")));
  const personal = rows[0];
  if (personal) return personal.id;

  const id = newId();
  const now = new Date();
  await db.insert(schema.organization).values({
    id,
    name: name || email.split("@")[0],
    slug: `p-${userId.slice(0, 8)}-${newId().slice(0, 6)}`,
    createdAt: now,
    kind: "personal",
  });
  await db.insert(schema.member).values({ id: newId(), organizationId: id, userId, role: "owner", createdAt: now });
  return id;
}

export async function listWorkspaces(userId: string): Promise<Workspace[]> {
  const rows = await db
    .select({
      id: schema.organization.id, name: schema.organization.name, slug: schema.organization.slug, logo: schema.organization.logo,
      kind: schema.organization.kind, plan: schema.organization.plan, role: schema.member.role, createdAt: schema.organization.createdAt,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .where(eq(schema.member.userId, userId));
  return rows
    .map((r) => ({ id: r.id, name: r.name, slug: r.slug, logo: r.logo ?? null, kind: r.kind as WorkspaceKind, plan: planKey(r.plan), role: (r.role.split(",")[0] as Role) ?? "member", createdAt: r.createdAt }))
    .sort((a, b) => (a.kind === b.kind ? +a.createdAt - +b.createdAt : a.kind === "personal" ? -1 : 1))
    .map(({ createdAt: _c, ...w }) => w);
}

/** A workspace's members (for the "Who" filter and the team page). */
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

