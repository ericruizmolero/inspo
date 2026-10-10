// Logs and stored failures. Server only.
//
// One JSON object per line on stdout, which Vercel keeps and drains to Better Stack: level, event, the request
// id (x-request-id, set in proxy.ts), the route, and who it was for (userId, organizationId: never an email).
// Text that could hold an address or a signed R2 URL goes through redact() first.
//
// What failed out of sight (a model call, a capture, an email, a job, an action) is also stored in the failure
// table with recordFailure, so support can find it by person and time without the logs (/admin/failures).
import "server-only";
import { after } from "next/server";
import { headers } from "next/headers";
import { desc, eq, getTableColumns, gte, lt } from "drizzle-orm";
import { db, schema } from "./db";
import { redact } from "./error-reports";
import { newId } from "./workspace-core";

type Level = "info" | "warn" | "error";
export type FailureKind = (typeof schema.FAILURE_KINDS)[number];
interface Who { userId?: string | null; organizationId?: string | null }

// Who each request is for, filled once the session is known (requireCtx, the MCP and extension auth). Keyed on
// the request's headers object, which Next hands out once per request; React's cache is not scoped to a request
// in route handlers, so it can't hold this. Gone with the request.
const people = new WeakMap<object, Who>();

async function requestHeaders() {
  try { return await headers(); }
  catch { return null; } // not in a request: the cron's own calls, scripts
}

export async function logAs(who: Who) {
  const h = await requestHeaders();
  if (h) people.set(h, { ...people.get(h), ...who });
}

async function requestInfo(): Promise<{ requestId?: string; route?: string } & Who> {
  const h = await requestHeaders();
  if (!h) return {};
  return { requestId: h.get("x-request-id") ?? undefined, route: h.get("x-request-path") ?? undefined, ...people.get(h) };
}

const STACK_LINES = 6;
function errorFields(e: unknown): { error: string; stack?: string } {
  if (!(e instanceof Error)) return { error: redact(String(e)).slice(0, 1000) };
  const stack = e.stack?.split("\n").slice(1, STACK_LINES + 1).map((l) => l.trim()).join("\n");
  return { error: redact(`${e.name}: ${e.message}`).slice(0, 1000), stack };
}

function write(level: Level, event: string, fields: Record<string, unknown>) {
  const line = redact(JSON.stringify({ level, event, ...fields, at: new Date().toISOString() }));
  if (level === "error") console.error(line); else if (level === "warn") console.warn(line); else console.log(line);
}

function emit(level: Level, event: string, fields: { err?: unknown; [k: string]: unknown } = {}) {
  const { err, ...rest } = fields;
  void requestInfo().then((req) => write(level, event, { ...req, ...rest, ...(err !== undefined ? errorFields(err) : {}) }));
}

export const log = {
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: { err?: unknown; [k: string]: unknown }) => emit("warn", event, fields),
  error: (event: string, fields?: { err?: unknown; [k: string]: unknown }) => emit("error", event, fields),
};

/**
 * Logs a failure and stores it. Never throws, and the write outlives the response (after()).
 * `who` overrides the request's person when the work belongs to someone else (a job run by the cron).
 */
export function recordFailure(kind: FailureKind, what: string, err: unknown, extra: Who & { ref?: string | null } = {}): Promise<void> {
  const { ref, ...who } = extra;
  emit("error", `${kind}.failed`, { what, ref, ...who, err });
  const save = (async () => {
    const req = await requestInfo();
    const { error, stack } = errorFields(err);
    await db.insert(schema.failure).values({
      id: newId(), kind, what: what.slice(0, 200), message: error, stack: stack ?? null,
      requestId: req.requestId ?? null,
      userId: who.userId ?? req.userId ?? null, organizationId: who.organizationId ?? req.organizationId ?? null,
      ref: ref ? redact(ref).slice(0, 300) : (req.route ?? null), createdAt: new Date(),
    });
  })().catch((e) => write("warn", "failure.not_stored", { kind, what, ...errorFields(e) }));
  try { after(() => save); } catch { /* outside a request (scripts): the promise runs on its own */ }
  return save;
}

const KEEP_DAYS = 30;

/** Drops failures older than KEEP_DAYS. The morning cron runs it */
export async function pruneFailures(): Promise<number> {
  const gone = await db.delete(schema.failure).where(lt(schema.failure.createdAt, new Date(Date.now() - KEEP_DAYS * 864e5))).returning({ id: schema.failure.id });
  return gone.length;
}

export type FailureRow = typeof schema.failure.$inferSelect & { userName: string | null; userEmail: string | null; workspaceName: string | null };

/** The last `days` of failures, newest first, with the person and the workspace (/admin/failures, admins only) */
export async function listFailures(days: number, limit = 300): Promise<FailureRow[]> {
  const F = schema.failure, U = schema.user, O = schema.organization;
  return db.select({ ...getTableColumns(F), userName: U.name, userEmail: U.email, workspaceName: O.name }).from(F)
    .leftJoin(U, eq(U.id, F.userId)).leftJoin(O, eq(O.id, F.organizationId))
    .where(gte(F.createdAt, new Date(Date.now() - days * 864e5))).orderBy(desc(F.createdAt)).limit(limit);
}
