// Workspaces: pure database logic, with no Next dependencies.
// Used by both the server (lib/workspace.ts) and scripts (scripts/*.ts).
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db, schema, type Exec } from "./db";
import { DEFAULT_PLAN, isPlanKey, type PlanKey } from "./plans";
import type { Locale } from "./i18n/locale";
import { toOutputLanguage, type OutputLanguage } from "./output-language";

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
  /** SaaS plan: its billing account's */
  plan: PlanKey;
  /** Who pays for it (billing_account). Workspaces of one account share the plan and its AI quota */
  billingAccountId: string;
  /** The account's name, which labels its workspaces in the switcher when there are several */
  billingAccountName: string;
  /** The language the model writes in for this workspace (organization.output_language) */
  outputLanguage: OutputLanguage;
}

/** Owners and admins manage a workspace: its settings, its people, and what others saved in it */
export const canManage = (role: Role) => role === "owner" || role === "admin";

export interface SessionUser { id: string; name: string; email: string; image?: string | null; language: Locale }

export interface Ctx {
  user: SessionUser;
  workspace: Workspace;
  workspaces: Workspace[];
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** The response a route sends for an HttpError. A plan's limit (402) carries `quota: true`, which the upgrade notice reads */
export const httpErrorResponse = (e: HttpError): Response =>
  Response.json({ error: e.message, ...(e.status === 402 ? { quota: true } : {}) }, { status: e.status });

const planKey = (p: string): PlanKey => (isPlanKey(p) ? p : DEFAULT_PLAN);

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);

export interface BillingAccount { id: string; name: string; plan: PlanKey; ownerUserId: string | null }

/** A new billing account, for a workspace that is about to be created. Returns its id. */
export async function createBillingAccount(a: { name: string; ownerUserId: string | null; plan?: PlanKey }, exec: Exec = db): Promise<string> {
  const id = newId();
  await exec.insert(schema.billingAccount).values({ id, name: a.name, ownerUserId: a.ownerUserId, ...(a.plan ? { plan: a.plan } : {}) });
  return id;
}

/** The account that pays for a workspace; null if the workspace does not exist */
export async function accountOf(organizationId: string): Promise<BillingAccount | null> {
  const B = schema.billingAccount;
  const [r] = await db.select({ id: B.id, name: B.name, plan: B.plan, ownerUserId: B.ownerUserId }).from(schema.organization)
    .innerJoin(B, eq(B.id, schema.organization.billingAccountId))
    .where(eq(schema.organization.id, organizationId)).limit(1);
  return r ? { ...r, plan: planKey(r.plan) } : null;
}

/**
 * Changes an account's plan, and so the plan of every workspace in it.
 * Whoever downgrades must notify the owners of each workspace that ends up over its seats:
 * notifyOverCapacity() in lib/quota.ts.
 */
export async function setAccountPlan(accountId: string, plan: PlanKey): Promise<void> {
  const res = await db.update(schema.billingAccount).set({ plan }).where(eq(schema.billingAccount.id, accountId));
  if (!res.rowCount) throw new Error("Billing account not found");
}

/** The workspaces an account pays for, oldest first, with how many people each has */
export async function accountWorkspaces(accountId: string) {
  const O = schema.organization;
  return db.select({ id: O.id, name: O.name, kind: O.kind, people: sql<number>`(select count(*)::int from ${schema.member} where ${schema.member.organizationId} = ${O.id})` })
    .from(O).where(eq(O.billingAccountId, accountId)).orderBy(asc(O.createdAt));
}

/** Deletes an account left without workspaces, unless Stripe knows it: that one is kept for its invoices */
export async function dropEmptyAccount(accountId: string, exec: Exec = db): Promise<void> {
  const B = schema.billingAccount;
  await exec.delete(B).where(and(eq(B.id, accountId), isNull(B.stripeCustomerId),
    sql`not exists (select 1 from ${schema.organization} where ${schema.organization.billingAccountId} = ${accountId})`));
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "team";
}

/** Creates the user's personal workspace if they don't have one yet. Returns its id. */
export async function ensurePersonalWorkspace(userId: string, name: string, email: string, language?: string, plan?: PlanKey): Promise<string> {
  const rows = await db
    .select({ id: schema.organization.id })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .where(and(eq(schema.member.userId, userId), eq(schema.organization.kind, "personal")));
  const personal = rows[0];
  if (personal) return personal.id;

  const id = newId();
  const now = new Date();
  const wsName = name || email.split("@")[0];
  await db.transaction(async (tx) => {
    const billingAccountId = await createBillingAccount({ name: wsName, ownerUserId: userId, plan }, tx);
    await tx.insert(schema.organization).values({
      id,
      name: wsName,
      slug: `p-${userId.slice(0, 8)}-${newId().slice(0, 6)}`,
      createdAt: now,
      kind: "personal",
      billingAccountId,
      outputLanguage: toOutputLanguage(language),
    });
    await tx.insert(schema.member).values({ id: newId(), organizationId: id, userId, role: "owner", createdAt: now });
  });
  return id;
}

export async function listWorkspaces(userId: string): Promise<Workspace[]> {
  const B = schema.billingAccount;
  const rows = await db
    .select({
      id: schema.organization.id, name: schema.organization.name, slug: schema.organization.slug, logo: schema.organization.logo,
      kind: schema.organization.kind, plan: B.plan, billingAccountId: B.id, billingAccountName: B.name,
      outputLanguage: schema.organization.outputLanguage, role: schema.member.role, createdAt: schema.organization.createdAt,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .innerJoin(B, eq(B.id, schema.organization.billingAccountId))
    .where(eq(schema.member.userId, userId));
  return rows
    .map((r) => ({
      id: r.id, name: r.name, slug: r.slug, logo: r.logo ?? null, kind: r.kind as WorkspaceKind, plan: planKey(r.plan),
      billingAccountId: r.billingAccountId, billingAccountName: r.billingAccountName,
      outputLanguage: toOutputLanguage(r.outputLanguage), role: (r.role.split(",")[0] as Role) ?? "member", createdAt: r.createdAt,
    }))
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

