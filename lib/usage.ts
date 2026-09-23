// Registro de uso de IA por workspace. El coste es el que devuelve OpenRouter en cada
// llamada, Jev incluido (#28). Solo si no llega se estima, y la fila lo dice.
import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./items";
import { dayOf, daySlots, tzOffsetSeconds } from "./dias";
import { type UsageAction, type UsageOverview } from "./usage-core";

export * from "./usage-core";

export interface UsageCtx { organizationId: string; userId?: string | null }

/** Estimación de Jev por item, solo para cuando OpenRouter no devuelve el coste. */
export const JEV_PER_ITEM_USD = 0.0004;

export interface UsageInput {
  action: UsageAction;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  /** Items facturados por Jev */
  units?: number;
  /** USD que devolvió OpenRouter. null o ausente: se estima (Jev) o se guarda 0, y se avisa */
  costUsd?: number | null;
  provider?: string | null;
  requestId?: string | null;
  ref?: string | null;
}

/** Guarda una fila de uso. Nunca lanza: perder una fila es mejor que romper la llamada. */
export async function recordUsage(ctx: UsageCtx | null | undefined, u: UsageInput): Promise<void> {
  if (!ctx) return;
  const input = u.inputTokens ?? 0, output = u.outputTokens ?? 0, cacheRead = u.cacheReadTokens ?? 0, units = u.units ?? 0;
  const real = typeof u.costUsd === "number";
  const cost = real ? u.costUsd! : u.model === "jev" ? units * JEV_PER_ITEM_USD : 0;
  if (!real) console.warn("usage: sin coste real", u.action, u.model);
  try {
    await db.insert(schema.aiUsage).values({
      id: newId(), organizationId: ctx.organizationId, userId: ctx.userId ?? null,
      action: u.action, model: u.model, inputTokens: input, outputTokens: output, cacheReadTokens: cacheRead,
      units, costMicros: Math.round(cost * 1e6), costSource: real ? "real" : "estimated",
      provider: u.provider ?? null, requestId: u.requestId ?? null,
      ref: u.ref?.slice(0, 300) ?? null, createdAt: new Date(),
    });
  } catch (e) {
    console.warn("usage: no se pudo registrar", u.action, e instanceof Error ? e.message : e);
  }
}

/** Gasto total de toda la app desde `since`, en USD. Para cuadrar con OpenRouter. */
export async function totalCostSince(since: Date): Promise<number> {
  const [r] = await db.select({ micros: sql<number>`coalesce(sum(${schema.aiUsage.costMicros}), 0)` })
    .from(schema.aiUsage).where(gte(schema.aiUsage.createdAt, since));
  return Number(r?.micros ?? 0) / 1e6;
}

export interface UsageSummary {
  sinceDays: number;
  totalUsd: number;
  byAction: { action: UsageAction; calls: number; usd: number; units: number }[];
  /** `name` null = llamada del sistema, sin persona detrás */
  byUser: { userId: string | null; name: string | null; usd: number; calls: number }[];
}

/** Resumen de gasto del workspace en los últimos N días (para la página de equipo). */
export async function usageSummary(organizationId: string, sinceDays = 30): Promise<UsageSummary> {
  const since = new Date(Date.now() - sinceDays * 86400000);
  const U = schema.aiUsage;
  const where = and(eq(U.organizationId, organizationId), gte(U.createdAt, since));
  const [byAction, byUser] = await Promise.all([
    db.select({ action: U.action, calls: sql<number>`count(*)`, micros: sql<number>`sum(${U.costMicros})`, units: sql<number>`sum(${U.units})` })
      .from(U).where(where).groupBy(U.action),
    db.select({ userId: U.userId, name: sql<string | null>`max(${schema.user.name})`, calls: sql<number>`count(*)`, micros: sql<number>`sum(${U.costMicros})` })
      .from(U).leftJoin(schema.user, eq(U.userId, schema.user.id)).where(where).groupBy(U.userId),
  ]);
  const actions = byAction.map((r) => ({ action: r.action as UsageAction, calls: Number(r.calls), usd: Number(r.micros) / 1e6, units: Number(r.units) }))
    .sort((a, b) => b.usd - a.usd);
  return {
    sinceDays,
    totalUsd: actions.reduce((n, a) => n + a.usd, 0),
    byAction: actions,
    byUser: byUser.map((r) => ({ userId: r.userId, name: r.name, usd: Number(r.micros) / 1e6, calls: Number(r.calls) })).sort((a, b) => b.usd - a.usd),
  };
}

/** Uso de IA de toda la app (todos los workspaces) en los últimos N días naturales, para /admin. */
export async function usageOverview(days = 30): Promise<UsageOverview> {
  const off = tzOffsetSeconds();
  const slots = daySlots(days, off);
  const since = new Date((slots[0].day * 86400 - off) * 1000);
  const U = schema.aiUsage, O = schema.organization, P = schema.user;
  const where = gte(U.createdAt, since);
  const dayExpr = dayOf(U.createdAt, off);

  const [byAction, byUser, byWs, daily] = await Promise.all([
    db.select({ action: U.action, calls: sql<number>`count(*)`, micros: sql<number>`sum(${U.costMicros})`, units: sql<number>`sum(${U.units})` })
      .from(U).where(where).groupBy(U.action),
    db.select({ userId: U.userId, name: sql<string | null>`max(${P.name})`, email: sql<string | null>`max(${P.email})`, image: sql<string | null>`max(${P.image})`, calls: sql<number>`count(*)`, micros: sql<number>`sum(${U.costMicros})` })
      .from(U).leftJoin(P, eq(U.userId, P.id)).where(where).groupBy(U.userId),
    db.select({ id: U.organizationId, name: sql<string | null>`max(${O.name})`, metadata: sql<string | null>`max(${O.metadata})`, calls: sql<number>`count(*)`, micros: sql<number>`sum(${U.costMicros})` })
      .from(U).leftJoin(O, eq(U.organizationId, O.id)).where(where).groupBy(U.organizationId),
    db.select({ day: dayExpr, calls: sql<number>`count(*)`, micros: sql<number>`sum(${U.costMicros})` })
      .from(U).where(where).groupBy(dayExpr),
  ]);

  const dayMap = new Map(daily.map((d) => [Number(d.day), d]));
  const actions = byAction
    .map((r) => ({ action: r.action, calls: Number(r.calls), usd: Number(r.micros) / 1e6, units: Number(r.units) }))
    .sort((a, b) => b.usd - a.usd);
  const users = byUser
    .map((r) => ({ userId: r.userId, name: r.name, email: r.email, image: r.image, usd: Number(r.micros) / 1e6, calls: Number(r.calls) }))
    .sort((a, b) => b.usd - a.usd);
  const workspaces = byWs.map((r) => {
    let kind: "personal" | "team" = "team";
    try { kind = JSON.parse(r.metadata ?? "{}")?.kind === "personal" ? "personal" : "team"; } catch { /* metadata rota */ }
    return { id: r.id, name: r.name, kind, usd: Number(r.micros) / 1e6, calls: Number(r.calls) };
  }).sort((a, b) => b.usd - a.usd);

  return {
    days,
    totalUsd: actions.reduce((n, a) => n + a.usd, 0),
    calls: actions.reduce((n, a) => n + a.calls, 0),
    people: users.filter((u) => u.userId).length,
    byAction: actions,
    byUser: users,
    byWorkspace: workspaces,
    daily: slots.map((s) => {
      const d = dayMap.get(s.day);
      return { date: s.date, usd: Number(d?.micros ?? 0) / 1e6, calls: Number(d?.calls ?? 0) };
    }),
  };
}
