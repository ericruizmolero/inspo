"use server";
// Cambios de la biblioteca que hace la propia interfaz: alta y baja de webs, comentarios, idioma.
// Lo que pide la extensión (llave, no cookie) o dura minutos (etiquetas, DESIGN.md) sigue en app/api.
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { withCtx, getSession, canManage, HttpError } from "@/lib/workspace";
import { addItem, deleteItem } from "@/lib/items";
import { addComment, deleteComment } from "@/lib/comments";
import { siteTextWithin } from "@/lib/extract";
import { normalizeWebUrl, guessEmpresa, tipoFromUrl } from "@/lib/url";
import { db, schema } from "@/lib/db";
import { getErrors } from "@/lib/i18n";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, isLocale } from "@/lib/i18n/locale";
import type { CommentAttachment } from "@/types/inspo";

/** Solo la URL es obligatoria: nombre y colección se deducen si no llegan. */
export async function addInspo(input: { web: string; empresa?: string; tipo?: string; comentarios?: string; subcomentarios?: string }) {
  return withCtx(async (ctx) => {
    const web = normalizeWebUrl(input.web ?? "");
    if (!web) throw new HttpError(400, (await getErrors()).badUrl);
    return addItem(ctx.workspace.id, {
      empresa: input.empresa?.trim() || guessEmpresa(web, await siteTextWithin(web)),
      web,
      tipo: input.tipo?.trim() || tipoFromUrl(web),
      comentarios: input.comentarios, subcomentarios: input.subcomentarios,
      autor: ctx.user.name || ctx.user.email,
      createdBy: ctx.user.id,
    });
  });
}

/** Cualquier miembro puede quitar una tarjeta (con su hilo). Si ya no estaba, no es un error. */
export async function removeInspo(id: string) {
  return withCtx(async (ctx) => { await deleteItem(ctx.workspace.id, id); });
}

/** Los adjuntos se suben antes por /api/comments/upload; aquí solo llegan sus URLs. */
export async function postComment(itemId: string, body: string, attachments: CommentAttachment[]) {
  return withCtx(async (ctx) =>
    addComment(ctx.workspace.id, { itemId, authorId: ctx.user.id, authorName: ctx.user.name || ctx.user.email.split("@")[0], body: String(body ?? ""), attachments }));
}

/** Propio, o cualquiera si administra el workspace. */
export async function removeComment(id: string) {
  return withCtx(async (ctx) => {
    if (!(await deleteComment(ctx.workspace.id, id, ctx.user.id, canManage(ctx.workspace.role)))) {
      throw new HttpError(403, (await getErrors()).cannotDeleteComment);
    }
  });
}

/** La cookie es lo que lee cada página; con sesión se guarda también en la cuenta (idioma de sus correos). */
export async function setLanguage(lang: string): Promise<void> {
  if (!isLocale(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: LANG_COOKIE_MAX_AGE, sameSite: "lax" });
  const session = await getSession();
  if (session) await db.update(schema.user).set({ language: lang, updatedAt: new Date() }).where(eq(schema.user.id, session.user.id));
}

/**
 * A shared /i/<id> link can point to an inspiration in another of the person's workspaces.
 * Returns that workspace when the person is a member of it, so the client can switch to it; null otherwise.
 * It never says whether an item exists in a workspace the person cannot see.
 */
export async function workspaceOfItem(itemId: string) {
  return withCtx(async (ctx) => {
    const [row] = await db.select({ organizationId: schema.inspoItem.organizationId })
      .from(schema.inspoItem).where(eq(schema.inspoItem.id, itemId)).limit(1);
    if (!row || !ctx.workspaces.some((w) => w.id === row.organizationId)) return null;
    return row.organizationId;
  });
}
