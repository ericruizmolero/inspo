// One team with its owner, and helpers to give it references and comments. Every id starts with a random tag, and
// cleanup deletes the team (its rows cascade), the person and the tombstones the cascade left.
import { randomBytes } from "node:crypto";
import { like } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { webKeyOf } from "@/lib/url";
import type { SessionUser, Workspace } from "@/lib/workspace-core";

export type Team = Awaited<ReturnType<typeof seedTeam>>;

export async function seedTeam() {
  const tag = `lib${randomBytes(4).toString("hex")}`;
  const now = new Date();
  const user: SessionUser = { id: `${tag}-user`, name: `${tag} owner`, email: `${tag}@example.test`, image: null, language: "en" } as SessionUser;
  await db.insert(schema.user).values({ id: user.id, name: user.name, email: user.email, emailVerified: true, createdAt: now, updatedAt: now });
  await db.insert(schema.organization).values({ id: `${tag}-team`, name: `${tag} team`, slug: `${tag}-team`, kind: "team", plan: "agency", createdAt: now });
  await db.insert(schema.member).values({ id: `${tag}-m`, organizationId: `${tag}-team`, userId: user.id, role: "owner", createdAt: now });
  const ws = { id: `${tag}-team`, name: `${tag} team`, slug: `${tag}-team`, kind: "team", plan: "agency", role: "owner" } as Workspace;
  return { tag, user, ws };
}

/** References `${tag}-<n>`, all on `date` and created at `createdAt` unless told otherwise */
export async function addItems(team: Team, n: number, o: { from?: number; date?: string; createdAt?: Date; author?: string } = {}) {
  const at = o.createdAt ?? new Date();
  const rows = Array.from({ length: n }, (_, k) => {
    const i = (o.from ?? 0) + k, web = `https://${team.tag}-${i}.example.com`;
    return {
      id: `${team.tag}-${i}`, organizationId: team.ws.id, name: `ref ${i}`, web, webKey: webKeyOf(web), date: o.date ?? at.toISOString().slice(0, 10),
      author: o.author ?? team.user.name, createdBy: team.user.id, note: "", tagStatus: "done", createdAt: at, updatedAt: at,
    };
  });
  for (let i = 0; i < rows.length; i += 500) await db.insert(schema.inspoItem).values(rows.slice(i, i + 500));
  return rows.map((r) => r.id);
}

export async function addComment(team: Team, itemId: string, body: string, at = new Date()) {
  const id = `${team.tag}-c-${randomBytes(3).toString("hex")}`;
  await db.insert(schema.inspoComment).values({ id, organizationId: team.ws.id, itemId, authorId: team.user.id, authorName: team.user.name, body, createdAt: at });
  return id;
}

export async function cleanupTeam(team: Team) {
  await db.delete(schema.organization).where(like(schema.organization.id, `${team.tag}%`));
  await db.delete(schema.user).where(like(schema.user.id, `${team.tag}%`));
  await db.delete(schema.libraryTombstone).where(like(schema.libraryTombstone.organizationId, `${team.tag}%`));
}
