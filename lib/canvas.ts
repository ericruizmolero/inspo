// Where each reference sits on a space's canvas (schema.canvasPosition). Always scoped to a workspace.
// A space is "all", "inbox" or a project id; a reference with no row is placed by the client.
// Not used by the canvas for now: its layout is always the automatic one. The project cleanup below stays,
// so the table never keeps rows of a deleted project.
import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { getErrors } from "./i18n";
import { HttpError } from "./workspace-core";
import type { CanvasPositions } from "@/types/inspo";

const C = schema.canvasPosition;
const MAX_ROWS = 500;
// Far enough for any real board, close enough that a bad number can't send a card to infinity
const LIMIT = 1_000_000;

/** Every space's positions in one query: { space: { itemId: { x, y } } } */
export async function loadPositions(organizationId: string): Promise<CanvasPositions> {
  const rows = await db.select({ space: C.space, itemId: C.itemId, x: C.x, y: C.y }).from(C).where(eq(C.organizationId, organizationId));
  const out: CanvasPositions = {};
  for (const r of rows) (out[r.space] ??= {})[r.itemId] = { x: r.x, y: r.y };
  return out;
}

/** Saves where some references sit in one space. Only this workspace's items and spaces; last write wins. */
export async function savePositions(organizationId: string, space: string, rows: { id: string; x: number; y: number }[], userId: string): Promise<void> {
  const errors = await getErrors();
  if (space !== "all" && space !== "inbox") {
    const [p] = await db.select({ id: schema.project.id }).from(schema.project)
      .where(and(eq(schema.project.organizationId, organizationId), eq(schema.project.id, space))).limit(1);
    if (!p) throw new HttpError(404, errors.projectNotFound);
  }
  const clean = new Map<string, { x: number; y: number }>();
  for (const r of Array.isArray(rows) ? rows.slice(0, MAX_ROWS) : []) {
    const x = Number(r?.x), y = Number(r?.y);
    if (typeof r?.id !== "string" || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    clean.set(r.id, { x: Math.max(-LIMIT, Math.min(LIMIT, x)), y: Math.max(-LIMIT, Math.min(LIMIT, y)) });
  }
  if (!clean.size) return;
  const own = await db.select({ id: schema.inspoItem.id }).from(schema.inspoItem)
    .where(and(eq(schema.inspoItem.organizationId, organizationId), inArray(schema.inspoItem.id, [...clean.keys()])));
  if (!own.length) return;
  const now = new Date();
  await db.insert(C)
    .values(own.map((r) => ({ organizationId, space, itemId: r.id, ...clean.get(r.id)!, updatedBy: userId, updatedAt: now })))
    .onConflictDoUpdate({
      target: [C.organizationId, C.space, C.itemId],
      set: { x: sql`excluded.x`, y: sql`excluded.y`, updatedBy: sql`excluded.updated_by`, updatedAt: sql`excluded.updated_at` },
    });
}

/** A project's whole canvas, when the project goes */
export async function dropSpace(organizationId: string, space: string): Promise<void> {
  await db.delete(C).where(and(eq(C.organizationId, organizationId), eq(C.space, space)));
}

/** References taken out of a project leave its canvas */
export async function dropFromSpace(organizationId: string, space: string, itemIds: string[]): Promise<void> {
  if (!itemIds.length) return;
  await db.delete(C).where(and(eq(C.organizationId, organizationId), eq(C.space, space), inArray(C.itemId, itemIds)));
}
