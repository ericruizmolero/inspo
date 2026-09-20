// Comentarios por inspo, siempre acotados a un workspace.
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./items";
import type { InspoComment, CommentMap } from "@/types/inspo";

const C = schema.inspoComment;
const U = schema.user;

const select = {
  id: C.id, itemId: C.itemId, authorId: C.authorId, authorName: C.authorName,
  body: C.body, createdAt: C.createdAt, authorImage: U.image,
};
type Row = { id: string; itemId: string; authorId: string | null; authorName: string; body: string; createdAt: Date; authorImage: string | null };

const toComment = (r: Row): InspoComment => ({
  id: r.id, itemId: r.itemId, authorId: r.authorId, authorName: r.authorName,
  authorImage: r.authorImage ?? null, body: r.body, createdAt: r.createdAt.toISOString(),
});

/** Todos los comentarios del workspace agrupados por item (volumen pequeño, una consulta). */
export async function listComments(organizationId: string): Promise<CommentMap> {
  const rows = await db.select(select).from(C).leftJoin(U, eq(C.authorId, U.id))
    .where(eq(C.organizationId, organizationId)).orderBy(asc(C.createdAt));
  const map: CommentMap = {};
  for (const r of rows) (map[r.itemId] ??= []).push(toComment(r));
  return map;
}

export async function addComment(organizationId: string, input: { itemId: string; authorId: string; authorName: string; body: string }): Promise<InspoComment> {
  const body = input.body.trim();
  if (!body) throw new Error("El comentario está vacío");
  const [item] = await db.select({ id: schema.inspoItem.id }).from(schema.inspoItem)
    .where(and(eq(schema.inspoItem.id, input.itemId), eq(schema.inspoItem.organizationId, organizationId))).limit(1);
  if (!item) throw new Error("Ese item no está en el workspace");
  const row = { id: newId(), organizationId, itemId: input.itemId, authorId: input.authorId, authorName: input.authorName, body: body.slice(0, 4000), createdAt: new Date(), editedAt: null };
  await db.insert(C).values(row);
  const [u] = await db.select({ image: U.image }).from(U).where(eq(U.id, input.authorId)).limit(1);
  return toComment({ ...row, authorImage: u?.image ?? null });
}

/** Borra un comentario propio (o cualquiera si `admin`). Devuelve false si no existía o no era suyo. */
export async function deleteComment(organizationId: string, id: string, userId: string, admin: boolean): Promise<boolean> {
  const where = admin
    ? and(eq(C.id, id), eq(C.organizationId, organizationId))
    : and(eq(C.id, id), eq(C.organizationId, organizationId), eq(C.authorId, userId));
  const res = await db.delete(C).where(where);
  return (res.rowsAffected ?? 0) > 0;
}
