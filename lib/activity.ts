// Actividad de las personas en la app: quién está conectado, quién ha estado activo,
// cuánto tiempo pasan y en qué zona. Los datos salen de dos sitios:
//  - activity_segment: latidos del cliente (components/useActivity.ts → /api/actividad)
//  - session (Better Auth): sesiones abiertas = "logeados", y sus altas = accesos
// Lo ven los correos fijos (DEFAULT_ADMINS, ADMIN_EMAILS) y los añadidos desde el propio panel (tabla app_admin).
import { and, desc, eq, gte, sql } from "drizzle-orm";
import "server-only";
import { userAgent } from "next/server";
import { db, schema } from "./db";
import { daySlots, dayOf, tzOffsetSeconds, startOfTodayMs } from "./dias";
import { areaLabel, type AdminEntry, type ActivityArea, type ActivityDay, type ActivityLogin, type ActivityOverview, type ActivityUser } from "./activity-core";
import { getErrors } from "./i18n";

export * from "./activity-core";

const DEFAULT_ADMINS = ["ericruizmolero@treseiscero.app"];

/** Correos fijos con acceso a /admin: los de arriba + ADMIN_EMAILS="a@x.com,b@y.com" (+ DEV_LOGIN_EMAIL en desarrollo). No se pueden quitar desde el panel. */
export function fixedAdmins(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const dev = process.env.NODE_ENV !== "production" ? [(process.env.DEV_LOGIN_EMAIL || "").trim().toLowerCase()].filter(Boolean) : [];
  return Array.from(new Set([...DEFAULT_ADMINS, ...fromEnv, ...dev]));
}

const normEmail = (e: string) => e.trim().toLowerCase();

/** ¿Puede ver el panel? Correos fijos o los añadidos desde el panel (tabla app_admin). */
export async function isAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const e = normEmail(email);
  if (fixedAdmins().includes(e)) return true;
  const [row] = await db.select({ email: schema.appAdmin.email }).from(schema.appAdmin).where(eq(schema.appAdmin.email, e)).limit(1);
  return !!row;
}

/** Lista completa de quienes ven el panel, fijos primero. */
export async function listAdmins(): Promise<AdminEntry[]> {
  const [rows, users] = await Promise.all([
    db.select().from(schema.appAdmin).orderBy(schema.appAdmin.createdAt),
    db.select({ email: schema.user.email, name: schema.user.name }).from(schema.user),
  ]);
  const nameOf = new Map(users.map((u) => [normEmail(u.email), u.name]));
  const fixed = fixedAdmins().map((email) => ({ email, name: nameOf.get(email) ?? null, fixed: true, addedBy: "", createdAt: null }));
  const added = rows.filter((r) => !fixedAdmins().includes(r.email))
    .map((r) => ({ email: r.email, name: nameOf.get(r.email) ?? null, fixed: false, addedBy: r.addedBy, createdAt: r.createdAt.toISOString() }));
  return [...fixed, ...added];
}

/** Da acceso a un correo. Devuelve false si ya lo tenía. */
export async function addAdmin(email: string, addedBy: string): Promise<{ email: string; added: boolean }> {
  const e = normEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error((await getErrors()).badEmail);
  if (fixedAdmins().includes(e)) return { email: e, added: false };
  const res = await db.insert(schema.appAdmin).values({ email: e, addedBy: addedBy.slice(0, 80), createdAt: new Date() }).onConflictDoNothing().returning({ email: schema.appAdmin.email });
  return { email: e, added: res.length > 0 };
}

/** Quita el acceso. Los fijos no se pueden quitar. */
export async function removeAdmin(email: string): Promise<void> {
  const e = normEmail(email);
  if (fixedAdmins().includes(e)) throw new Error((await getErrors()).fixedAccess);
  await db.delete(schema.appAdmin).where(eq(schema.appAdmin.email, e));
}

/** Alguien cuenta como "conectado ahora" si ha mandado un latido en los últimos 2 minutos */
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;
/** Entre dos latidos se suma el tiempo real solo si el hueco es corto (pestaña visible); si no, no cuenta */
const MAX_GAP_MS = 90 * 1000;

const ID_RE = /^[a-z0-9]{8,40}$/;

/** "Chrome · macOS", "Safari · iOS (móvil)"… a partir del user agent */
export function deviceSummary(ua: string | null | undefined): string | null {
  if (!ua) return null;
  try {
    const { browser, os, device } = userAgent({ headers: new Headers({ "user-agent": ua }) });
    const parts = [browser.name, os.name].filter(Boolean);
    if (!parts.length) return null;
    const kind = device.type === "mobile" ? " (móvil)" : device.type === "tablet" ? " (tablet)" : "";
    return parts.join(" · ") + kind;
  } catch { return null; }
}

export interface Heartbeat {
  segmentId: string;
  visitId: string;
  area: string;
  path: string;
  organizationId?: string | null;
}

/** Registra un latido: crea el segmento si es nuevo o le suma el tiempo desde el anterior. */
export async function touchSegment(userId: string, hb: Heartbeat, ua: string | null): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!ID_RE.test(hb.segmentId) || !ID_RE.test(hb.visitId)) return { ok: false, error: (await getErrors()).badIds, status: 400 };
  const area = String(hb.area || "").slice(0, 40) || "biblioteca";
  const path = String(hb.path || "/").slice(0, 200);
  const now = Date.now();
  const S = schema.activitySegment;
  const [row] = await db.select({ userId: S.userId, lastSeenAt: S.lastSeenAt }).from(S).where(eq(S.id, hb.segmentId)).limit(1);
  if (!row) {
    await db.insert(schema.activitySegment).values({
      id: hb.segmentId, userId, organizationId: hb.organizationId ?? null, visitId: hb.visitId, area, path,
      device: deviceSummary(ua), startedAt: new Date(now), lastSeenAt: new Date(now), seconds: 0,
    }).onConflictDoNothing();
    return { ok: true };
  }
  if (row.userId !== userId) return { ok: false, error: (await getErrors()).segmentNotYours, status: 403 };
  const gap = now - row.lastSeenAt.getTime();
  const add = gap > 0 && gap <= MAX_GAP_MS ? Math.round(gap / 1000) : 0;
  await db.update(S).set({ lastSeenAt: new Date(now), seconds: sql`${S.seconds} + ${add}` }).where(eq(S.id, hb.segmentId));
  return { ok: true };
}

// ─── Resumen para el panel ───────────────────────────────────────────────────

/** Varios accesos de la misma persona en 10 minutos (reintentos, auto-login en desarrollo) se enseñan como uno */
function collapseLogins(rows: ActivityLogin[]): ActivityLogin[] {
  const out: ActivityLogin[] = [];
  for (const r of rows) {
    const prev = out[out.length - 1];
    if (prev && prev.userId === r.userId && new Date(prev.at).getTime() - new Date(r.at).getTime() < 10 * 60 * 1000) continue;
    out.push(r);
  }
  return out.slice(0, 10);
}

export async function activityOverview(days = 30): Promise<ActivityOverview> {
  const now = Date.now();
  const off = tzOffsetSeconds();
  const todayStart = startOfTodayMs(off);
  const since = new Date(todayStart - (days - 1) * 86400000);
  const since7 = new Date(now - 7 * 86400000);
  const since30 = new Date(now - 30 * 86400000);
  const onlineSince = new Date(now - ONLINE_WINDOW_MS);
  const S = schema.activitySegment, U = schema.user, SE = schema.session, M = schema.member, O = schema.organization;
  const dayExpr = dayOf(S.startedAt, off);

  const [users, perUser, perUserArea, sessions, daily, byArea, memberships, recentLogins, distinctCounts] = await Promise.all([
    db.select({ id: U.id, name: U.name, email: U.email, image: U.image, createdAt: U.createdAt }).from(U),
    db.select({ userId: S.userId, seconds: sql<number>`sum(${S.seconds})`, visits: sql<number>`count(distinct ${S.visitId})`, lastSeen: sql<number>`max(${S.lastSeenAt})` })
      .from(S).where(gte(S.lastSeenAt, since)).groupBy(S.userId),
    db.select({ userId: S.userId, area: S.area, seconds: sql<number>`sum(${S.seconds})` })
      .from(S).where(gte(S.lastSeenAt, since)).groupBy(S.userId, S.area),
    db.select({ userId: SE.userId, open: sql<number>`sum(case when ${SE.expiresAt} > ${now} then 1 else 0 end)`, lastLogin: sql<number>`max(${SE.createdAt})` })
      .from(SE).groupBy(SE.userId),
    db.select({ day: dayExpr, users: sql<number>`count(distinct ${S.userId})`, seconds: sql<number>`sum(${S.seconds})` })
      .from(S).where(gte(S.startedAt, since)).groupBy(dayExpr),
    db.select({ area: S.area, seconds: sql<number>`sum(${S.seconds})`, users: sql<number>`count(distinct ${S.userId})` })
      .from(S).where(gte(S.lastSeenAt, since)).groupBy(S.area),
    db.select({ userId: M.userId, name: O.name, metadata: O.metadata }).from(M).innerJoin(O, eq(M.organizationId, O.id)),
    db.select({ userId: SE.userId, at: SE.createdAt, expiresAt: SE.expiresAt, ua: SE.userAgent, name: U.name, email: U.email, image: U.image })
      .from(SE).innerJoin(U, eq(SE.userId, U.id)).orderBy(desc(SE.createdAt)).limit(60),
    Promise.all([
      db.select({ n: sql<number>`count(distinct ${S.userId})` }).from(S).where(gte(S.lastSeenAt, onlineSince)),
      db.select({ n: sql<number>`count(distinct ${S.userId})` }).from(S).where(gte(S.lastSeenAt, new Date(todayStart))),
      db.select({ n: sql<number>`count(distinct ${S.userId})` }).from(S).where(gte(S.lastSeenAt, since7)),
      db.select({ n: sql<number>`count(distinct ${S.userId})` }).from(S).where(gte(S.lastSeenAt, since30)),
      db.select({ n: sql<number>`count(distinct ${SE.userId})` }).from(SE).where(gte(SE.expiresAt, new Date(now))),
    ]),
  ]);

  // Último dispositivo visto por persona (segmento más reciente)
  const lastDevice = new Map<string, string | null>();
  const lastSegs = await db.select({ userId: S.userId, device: S.device, lastSeen: S.lastSeenAt }).from(S)
    .where(and(gte(S.lastSeenAt, since30))).orderBy(desc(S.lastSeenAt));
  for (const r of lastSegs) if (!lastDevice.has(r.userId)) lastDevice.set(r.userId, r.device);

  const agg = new Map(perUser.map((r) => [r.userId, r]));
  const sess = new Map(sessions.map((r) => [r.userId, r]));
  const topArea = new Map<string, { area: string; seconds: number }>();
  for (const r of perUserArea) {
    const cur = topArea.get(r.userId);
    if (!cur || Number(r.seconds) > cur.seconds) topArea.set(r.userId, { area: r.area, seconds: Number(r.seconds) });
  }
  const wsOf = new Map<string, string[]>();
  for (const m of memberships) {
    let kind = "team";
    try { kind = JSON.parse(m.metadata ?? "{}")?.kind ?? "team"; } catch { /* metadata rota */ }
    if (kind === "personal") continue;
    wsOf.set(m.userId, [...(wsOf.get(m.userId) ?? []), m.name]);
  }

  const list: ActivityUser[] = users.map((u) => {
    const a = agg.get(u.id), s = sess.get(u.id);
    const lastSeen = a?.lastSeen ? Number(a.lastSeen) : null;
    return {
      id: u.id, name: u.name, email: u.email, image: u.image ?? null, createdAt: u.createdAt.toISOString(),
      workspaces: wsOf.get(u.id) ?? [],
      lastSeenAt: lastSeen ? new Date(lastSeen).toISOString() : null,
      lastLoginAt: s?.lastLogin ? new Date(Number(s.lastLogin)).toISOString() : null,
      openSessions: Number(s?.open ?? 0),
      device: lastDevice.get(u.id) ?? null,
      online: !!lastSeen && lastSeen >= now - ONLINE_WINDOW_MS,
      seconds: Number(a?.seconds ?? 0),
      visits: Number(a?.visits ?? 0),
      topArea: topArea.get(u.id)?.area ?? null,
    };
  }).sort((x, y) => {
    if (x.online !== y.online) return x.online ? -1 : 1;
    return (y.lastSeenAt ?? y.lastLoginAt ?? "").localeCompare(x.lastSeenAt ?? x.lastLoginAt ?? "");
  });

  // Serie diaria completa (con ceros) del periodo
  const dayMap = new Map(daily.map((d) => [Number(d.day), d]));
  const series: ActivityDay[] = daySlots(days, off).map((s) => {
    const d = dayMap.get(s.day);
    return { date: s.date, label: s.label, users: Number(d?.users ?? 0), seconds: Number(d?.seconds ?? 0) };
  });

  const areas: ActivityArea[] = byArea.map((r) => ({ area: r.area, label: areaLabel(r.area), seconds: Number(r.seconds), users: Number(r.users) }))
    .filter((a) => a.seconds > 0).sort((a, b) => b.seconds - a.seconds);

  const totalSeconds = list.reduce((n, u) => n + u.seconds, 0);
  const activeInPeriod = list.filter((u) => u.seconds > 0 || (u.lastSeenAt && new Date(u.lastSeenAt) >= since)).length;
  const [online, activeToday, active7, active30, loggedIn] = distinctCounts.map((r) => Number(r[0]?.n ?? 0));

  return {
    days,
    generatedAt: new Date(now).toISOString(),
    kpis: {
      online, activeToday, active7, active30, loggedIn,
      totalUsers: users.length,
      newUsers: users.filter((u) => u.createdAt >= since).length,
      seconds: totalSeconds,
      avgSeconds: activeInPeriod ? Math.round(totalSeconds / activeInPeriod) : 0,
    },
    daily: series,
    areas,
    users: list,
    logins: collapseLogins(recentLogins.map((r) => ({
      userId: r.userId, name: r.name, email: r.email, image: r.image ?? null,
      at: r.at.toISOString(), device: deviceSummary(r.ua), alive: r.expiresAt.getTime() > now,
    }))),
  };
}
