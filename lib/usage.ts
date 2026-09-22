// Registro de uso de IA por workspace y coste estimado. Tarifa de Anthropic
// (USD por millón de tokens) y de Jev (USD por item). Actualizar al cambiar de modelo.
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./items";
import { dayOf, daySlots, tzOffsetSeconds } from "./dias";
import { type UsageAction, type UsageOverview } from "./usage-core";

export * from "./usage-core";

export interface UsageCtx { organizationId: string; userId?: string | null }

interface Rate { input: number; output: number; cacheRead: number }
const RATES: [RegExp, Rate][] = [
  [/^claude-fable|^claude-mythos/, { input: 10, output: 50, cacheRead: 1 }],
  [/^claude-opus-5/, { input: 5, output: 25, cacheRead: 0.5 }],
  [/^claude-opus-4/, { input: 5, output: 25, cacheRead: 0.5 }],
  [/^claude-sonnet-5/, { input: 2, output: 10, cacheRead: 0.2 }],
  [/^claude-sonnet-4/, { input: 3, output: 15, cacheRead: 0.3 }],
  [/^claude-haiku-4-5/, { input: 1, output: 5, cacheRead: 0.1 }],
];
/** Jev cobra por item evaluado, no por token. */
export const JEV_PER_ITEM_USD = 0.0004;

export function rateFor(model: string): Rate {
  return RATES.find(([re]) => re.test(model))?.[1] ?? { input: 5, output: 25, cacheRead: 0.5 };
}

export function estimateCostUsd(model: string, input: number, output: number, cacheRead = 0): number {
  const r = rateFor(model);
  return (input * r.input + output * r.output + cacheRead * r.cacheRead) / 1e6;
}

export interface UsageInput {
  action: UsageAction;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  /** Items facturados por Jev */
  units?: number;
  ref?: string | null;
}

/** Guarda una fila de uso. Nunca lanza: perder una fila es mejor que romper la llamada. */
export async function recordUsage(ctx: UsageCtx | null | undefined, u: UsageInput): Promise<void> {
  if (!ctx) return;
  const input = u.inputTokens ?? 0, output = u.outputTokens ?? 0, cacheRead = u.cacheReadTokens ?? 0, units = u.units ?? 0;
  const cost = u.model === "jev" ? units * JEV_PER_ITEM_USD : estimateCostUsd(u.model, input, output, cacheRead);
  try {
    await db.insert(schema.aiUsage).values({
      id: newId(), organizationId: ctx.organizationId, userId: ctx.userId ?? null,
      action: u.action, model: u.model, inputTokens: input, outputTokens: output, cacheReadTokens: cacheRead,
      units, costMicros: Math.round(cost * 1e6), ref: u.ref?.slice(0, 300) ?? null, createdAt: new Date(),
    });
  } catch (e) {
    console.warn("usage: no se pudo registrar", u.action, e instanceof Error ? e.message : e);
  }
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
