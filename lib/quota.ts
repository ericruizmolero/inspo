// Cuotas mensuales por plan, contadas sobre ai_usage. Solo servidor.
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { planOf, type Plan, type PlanKey } from "./plans";
import { HttpError, type Workspace } from "./workspace-core";

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
}

function monthStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function nextMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

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

export async function quotaStatus(ws: Pick<Workspace, "id" | "plan">): Promise<QuotaStatus> {
  const plan: Plan = planOf(ws.plan);
  const [designMd, searches, members] = await Promise.all([
    countAction(ws.id, "design_md"), countAction(ws.id, "jev_search"), countMembers(ws.id),
  ]);
  return {
    plan: plan.key, planName: plan.name, priceEur: plan.priceEur, resetsAt: nextMonth().toISOString(),
    designMd: { used: designMd, limit: plan.designMdPerMonth },
    searches: { used: searches, limit: plan.searchesPerMonth },
    members: { used: members, limit: plan.members },
  };
}

const LABEL = { design_md: "DESIGN.md", jev_search: "búsquedas IA" } as const;

/** Lanza HttpError(402) si el workspace ha agotado la cuota mensual de esa acción. */
export async function assertQuota(ws: Pick<Workspace, "id" | "plan">, action: "design_md" | "jev_search"): Promise<void> {
  const plan = planOf(ws.plan);
  const limit = action === "design_md" ? plan.designMdPerMonth : plan.searchesPerMonth;
  if (limit === null) return;
  const used = await countAction(ws.id, action);
  if (used >= limit) {
    throw new HttpError(402, `Has usado ${used} de ${limit} ${LABEL[action]} este mes en el plan ${plan.name}. Amplía el plan en /planes.`);
  }
}

/** Mensaje para el hook de invitaciones: null si cabe una persona más. */
export async function memberLimitMessage(organizationId: string, planKey: string | null | undefined): Promise<string | null> {
  const plan = planOf(planKey);
  if (plan.members === null) return null;
  const used = await countMembers(organizationId);
  if (used < plan.members) return null;
  return `El plan ${plan.name} admite ${plan.members} ${plan.members === 1 ? "persona" : "personas"}. Amplía el plan en /planes para invitar a más.`;
}
