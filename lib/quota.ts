// Cuotas mensuales por plan, contadas sobre ai_usage. Solo servidor.
import { and, eq, gt, gte, lt, or, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { planOf, type Plan, type PlanKey } from "./plans";
import { HttpError, listMembers, type Workspace } from "./workspace-core";
import { overCapacityMail, sendMail } from "./mail";

export interface QuotaLine { used: number; limit: number | null }
export interface QuotaStatus {
  plan: PlanKey;
  planName: string;
  priceEur: number;
  /** Primer día del mes siguiente, ISO */
  resetsAt: string;
  designMd: QuotaLine;
  searches: QuotaLine;
  members: QuotaLine;
  /** Invitaciones enviadas y sin aceptar: también ocupan plaza */
  pendingInvites: number;
}

function monthStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function nextMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

const people = (n: number) => `${n} ${n === 1 ? "persona" : "personas"}`;

// Las búsquedas se cuentan por consulta distinta (ref = texto normalizado), no por
// llamada: la búsqueda se lanza mientras se escribe y una misma intención puede
// producir varias llamadas parciales. El coste real sigue en ai_usage fila a fila.
async function countAction(organizationId: string, action: string): Promise<number> {
  const U = schema.aiUsage;
  const n = action === "jev_search" ? sql<number>`count(distinct lower(trim(${U.ref})))` : sql<number>`count(*)`;
  const [r] = await db.select({ n }).from(U)
    .where(and(eq(U.organizationId, organizationId), eq(U.action, action), gte(U.createdAt, monthStart())));
  return Number(r?.n ?? 0);
}

export async function countMembers(organizationId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(schema.member).where(eq(schema.member.organizationId, organizationId));
  return Number(r?.n ?? 0);
}

/**
 * Invitaciones enviadas y todavía sin aceptar, sin contar las caducadas.
 * Ocupan plaza igual que un miembro: si no, con un plan de 5 se pueden mandar 20
 * invitaciones y las 15 últimas fallan al aceptar sin que nadie entienda por qué.
 * `exceptEmail` deja fuera una dirección concreta, que es lo que necesita reenviar
 * una invitación: la nueva sustituye a la pendiente, no se suma a ella.
 */
export async function countPendingInvitations(organizationId: string, exceptEmail?: string): Promise<number> {
  const I = schema.invitation;
  const conds = [eq(I.organizationId, organizationId), eq(I.status, "pending"), gt(I.expiresAt, new Date())];
  if (exceptEmail) conds.push(sql`lower(${I.email}) <> ${exceptEmail.trim().toLowerCase()}`);
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(I).where(and(...conds));
  return Number(r?.n ?? 0);
}

export async function quotaStatus(ws: Pick<Workspace, "id" | "plan">): Promise<QuotaStatus> {
  const plan: Plan = planOf(ws.plan);
  const [designMd, searches, members, pendingInvites] = await Promise.all([
    countAction(ws.id, "design_md"), countAction(ws.id, "jev_search"), countMembers(ws.id), countPendingInvitations(ws.id),
  ]);
  return {
    plan: plan.key, planName: plan.name, priceEur: plan.priceEur, resetsAt: nextMonth().toISOString(),
    designMd: { used: designMd, limit: plan.designMdPerMonth },
    searches: { used: searches, limit: plan.searchesPerMonth },
    members: { used: members, limit: plan.members },
    pendingInvites,
  };
}

export interface OverCapacity { members: number; limit: number; planName: string }

/**
 * Un equipo puede quedarse con más gente de la que admite su plan al bajar de plan.
 * No echamos a nadie: destruir datos por un cobro no es opción. Se bloquean las
 * invitaciones y las acciones de IA, y el dueño decide.
 */
export async function overCapacity(organizationId: string, planKey: string | null | undefined): Promise<OverCapacity | null> {
  const plan = planOf(planKey);
  if (plan.members === null) return null;
  const members = await countMembers(organizationId);
  return members > plan.members ? { members, limit: plan.members, planName: plan.name } : null;
}

const LABEL = { design_md: "DESIGN.md", jev_search: "búsquedas IA" } as const;

/** Lanza HttpError(402) si el equipo pasa del número de personas de su plan. */
export async function assertSeatsOk(ws: Pick<Workspace, "id" | "plan">): Promise<void> {
  const over = await overCapacity(ws.id, ws.plan);
  if (!over) return;
  throw new HttpError(402, `El equipo tiene ${people(over.members)} y el plan ${over.planName} admite ${over.limit}. Quita a alguien en /equipo o amplía el plan en /planes para volver a usar la IA.`);
}

/** Lanza HttpError(402) si el workspace ha agotado la cuota mensual de esa acción. */
export async function assertQuota(ws: Pick<Workspace, "id" | "plan">, action: "design_md" | "jev_search"): Promise<void> {
  await assertSeatsOk(ws);
  const plan = planOf(ws.plan);
  const limit = action === "design_md" ? plan.designMdPerMonth : plan.searchesPerMonth;
  if (limit === null) return;
  const used = await countAction(ws.id, action);
  if (used >= limit) {
    throw new HttpError(402, `Has usado ${used} de ${limit} ${LABEL[action]} este mes en el plan ${plan.name}. Amplía el plan en /planes.`);
  }
}

export interface SeatOpts {
  /** Contar también las invitaciones sin aceptar (al invitar, no al aceptar) */
  includePending?: boolean;
  /** Dirección que no cuenta como pendiente, para poder reenviar una invitación */
  exceptEmail?: string;
}

/** Mensaje para el hook de invitaciones: null si cabe una persona más. */
export async function memberLimitMessage(organizationId: string, planKey: string | null | undefined, opts: SeatOpts = {}): Promise<string | null> {
  const plan = planOf(planKey);
  if (plan.members === null) return null;
  const [members, pending] = await Promise.all([
    countMembers(organizationId),
    opts.includePending ? countPendingInvitations(organizationId, opts.exceptEmail) : Promise.resolve(0),
  ]);
  if (members + pending < plan.members) return null;
  const cabe = `El plan ${plan.name} admite ${people(plan.members)}.`;
  if (pending > 0) {
    const inv = pending === 1 ? "1 invitación sin aceptar" : `${pending} invitaciones sin aceptar`;
    return `${cabe} Ahora hay ${people(members)} en el equipo y ${inv}. Cancela una invitación en /equipo o amplía el plan en /planes.`;
  }
  return `${cabe} Amplía el plan en /planes para invitar a más.`;
}

/**
 * Cuántos miembros entraron antes que este, por createdAt con el id de desempate.
 * Sirve para el control posterior a la alta: dos personas pueden aceptar la última
 * plaza a la vez, y solo las que quedan por encima del límite se retiran.
 */
export async function memberRank(organizationId: string, memberId: string): Promise<number> {
  const M = schema.member;
  const [me] = await db.select({ id: M.id, createdAt: M.createdAt }).from(M).where(eq(M.id, memberId)).limit(1);
  if (!me) return 0;
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(M).where(and(
    eq(M.organizationId, organizationId),
    or(lt(M.createdAt, me.createdAt), and(eq(M.createdAt, me.createdAt), lt(M.id, me.id))),
  ));
  return Number(r?.n ?? 0);
}

/**
 * Avisa por correo a los dueños y admins de que el equipo pasa del número de personas
 * del plan. Se llama al cambiar el plan (scripts/set-plan.ts). No lanza: un fallo de
 * correo no debe tumbar el cambio de plan.
 */
export async function notifyOverCapacity(organizationId: string, planKey: string | null | undefined, teamName: string, appUrl: string): Promise<boolean> {
  const over = await overCapacity(organizationId, planKey);
  if (!over) return false;
  const members = await listMembers(organizationId);
  const to = members.filter((m) => m.role.split(",")[0] !== "member").map((m) => m.email);
  if (!to.length) return false;
  const m = overCapacityMail(`${appUrl.replace(/\/$/, "")}/equipo`, teamName, over.planName, over.members, over.limit);
  try { await sendMail(to, m.subject, m.html, m.text); } catch (e) { console.error("[plan] no se pudo avisar al dueño:", e); }
  return true;
}
