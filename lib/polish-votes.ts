// Polish as a team: each member says keep or forget about each reference of a project's board, and nothing
// leaves the board on a vote. Closing the polish settles what was voted: what everyone who voted forgot goes back
// to the Inbox, what they disagree on stays unless whoever closes decides it. A workspace of one person has
// nobody to agree with: there a vote is settled as it is cast.
import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { getErrors } from "./i18n";
import { HttpError } from "./workspace-core";
import { fileItems } from "./projects";
import type { PolishChoice, PolishVote } from "@/types/inspo";

const V = schema.polishVote;
const PI = schema.projectItem;

const isChoice = (v: unknown): v is PolishChoice => v === "keep" || v === "forget";

/** Every vote of the workspace's projects, open and settled: the board reads who said what from them */
export async function listVotes(organizationId: string): Promise<PolishVote[]> {
  const rows = await db.select({ projectId: V.projectId, itemId: V.itemId, userId: V.userId, vote: V.vote, closedAt: V.closedAt, closedBy: V.closedBy })
    .from(V).where(eq(V.organizationId, organizationId));
  return rows.map((r) => ({ ...r, vote: r.vote as PolishChoice, closedAt: r.closedAt?.toISOString() ?? null }));
}

/** The references of `itemIds` that are on the project's board, the only ones a vote can be about */
async function onBoard(organizationId: string, projectId: string, itemIds: string[]): Promise<string[]> {
  if (!itemIds.length) return [];
  const rows = await db.select({ id: PI.itemId }).from(PI)
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId), inArray(PI.itemId, itemIds)));
  return rows.map((r) => r.id);
}

/** Off the board and back to the Inbox, keeping its votes: they say who forgot it (the reference's sheet shows them) */
async function leaveBoard(organizationId: string, projectId: string, itemIds: string[]): Promise<void> {
  if (!itemIds.length) return;
  await db.delete(PI).where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId), inArray(PI.itemId, itemIds)));
}

async function isSolo(organizationId: string): Promise<boolean> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.member).where(eq(schema.member.organizationId, organizationId));
  return (r?.n ?? 0) <= 1;
}

/**
 * This person's vote on these references: keep, forget, or none (taken back). Voting again reopens a settled vote.
 * In a workspace of one the vote is settled at once, and a forgotten reference leaves the board with it.
 */
export async function castVotes(organizationId: string, projectId: string, itemIds: string[], userId: string, vote: PolishChoice | null): Promise<{ settled: boolean }> {
  if (vote !== null && !isChoice(vote)) throw new HttpError(400, (await getErrors()).badBody);
  const ids = await onBoard(organizationId, projectId, itemIds);
  if (!ids.length) return { settled: false };
  if (vote === null) {
    await db.delete(V).where(and(eq(V.projectId, projectId), eq(V.userId, userId), inArray(V.itemId, ids)));
    return { settled: false };
  }
  const now = new Date();
  const solo = await isSolo(organizationId);
  const closed = solo ? { closedAt: now, closedBy: userId } : { closedAt: null, closedBy: null };
  await db.insert(V)
    .values(ids.map((itemId) => ({ projectId, itemId, userId, organizationId, vote, updatedAt: now, ...closed })))
    .onConflictDoUpdate({ target: [V.projectId, V.itemId, V.userId], set: { vote, updatedAt: now, ...closed } });
  if (solo && vote === "forget") await leaveBoard(organizationId, projectId, ids);
  return { settled: solo };
}

/**
 * Closes the project's polish: settles every reference with open votes. All who voted agree: that is what happens.
 * They disagree: what `resolve` says for it (whoever closes decides), and with nothing said it stays on the board,
 * still open. Returns what left the board.
 */
export async function closePolish(organizationId: string, projectId: string, userId: string, resolve: Record<string, unknown>): Promise<{ removed: string[]; settled: string[]; closedAt: string }> {
  const open = await db.select({ itemId: V.itemId, vote: V.vote }).from(V)
    .innerJoin(PI, and(eq(PI.projectId, V.projectId), eq(PI.itemId, V.itemId)))
    .where(and(eq(V.organizationId, organizationId), eq(V.projectId, projectId), isNull(V.closedAt)));
  const said = new Map<string, Set<string>>();
  for (const r of open) said.set(r.itemId, (said.get(r.itemId) ?? new Set()).add(r.vote));
  const removed: string[] = [], settled: string[] = [];
  for (const [itemId, votes] of said) {
    const choice = votes.size === 1 ? [...votes][0] : resolve?.[itemId];
    if (!isChoice(choice)) continue;
    settled.push(itemId);
    if (choice === "forget") removed.push(itemId);
  }
  const now = new Date();
  if (settled.length) {
    await db.update(V).set({ closedAt: now, closedBy: userId, updatedAt: now })
      .where(and(eq(V.projectId, projectId), isNull(V.closedAt), inArray(V.itemId, settled)));
  }
  await leaveBoard(organizationId, projectId, removed);
  return { removed, settled, closedAt: now.toISOString() };
}

/** A reference the polish forgot, back on the board and to be voted again: its votes there go */
export async function restoreForgotten(organizationId: string, projectId: string, itemId: string, userId: string): Promise<void> {
  await fileItems(organizationId, projectId, [itemId], userId);
  await db.delete(V).where(and(eq(V.organizationId, organizationId), eq(V.projectId, projectId), eq(V.itemId, itemId)));
}
