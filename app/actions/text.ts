"use server";
// Text as a reference of its own (lib/text-refs.ts): the project's content, pasted and kept whole.
import { and, eq, inArray } from "drizzle-orm";
import { withCtx, HttpError } from "@/lib/workspace";
import { addItem, setTags } from "@/lib/items";
import { fileItems } from "@/lib/projects";
import { enqueueEmbed } from "@/lib/jobs";
import { cleanText, putText, readText, rewriteText, textTags, deleteTextFile, ownsTextFile, TEXT_TITLE_MAX } from "@/lib/text-refs";
import { db, schema } from "@/lib/db";
import { getErrors } from "@/lib/i18n";
import { recordFailure } from "@/lib/log";
import { assertRoom } from "@/lib/quota";

/** A pasted text becomes a card: its words go to a file, whose path is the item's address.
 *  Added from inside a project, it is filed there too. Its "tags" are its first lines: no model reads it here. */
export async function addText(input: { title: string; text: string; note?: string; projectId?: string }) {
  return withCtx(async (ctx) => {
    const text = cleanText(input.text);
    const title = String(input.title ?? "").replace(/\s+/g, " ").trim().slice(0, TEXT_TITLE_MAX);
    if (!text || !title) throw new HttpError(400, (await getErrors()).badBody);
    await assertRoom(ctx.workspace, { items: 1 });
    const url = await putText(ctx.workspace.id, text);
    try {
      const item = await addItem(ctx.workspace.id, {
        name: title, web: url, type: "inspiration", note: input.note,
        author: ctx.user.name || ctx.user.email, createdBy: ctx.user.id,
      });
      await setTags(ctx.workspace.id, item.web, await textTags(item.web));
      if (input.projectId && item.id) await fileItems(ctx.workspace.id, input.projectId, [item.id], ctx.user.id).catch((e) => void recordFailure("action", "file in project", e, { ref: input.projectId }));
      const id = item.id;
      if (id) void enqueueEmbed([id]);
      return item;
    } catch (e) {
      // deleteFiles stores its own failure; the add's error is the one to throw
      await deleteTextFile(ctx.workspace.id, url).catch(() => {});
      throw e;
    }
  });
}

/** A saved text, written again: its panel and the document's Content edit it in place. The words go over the
 *  same file; its first lines (what the card and the models read) and its place in the search follow. */
export async function saveText(itemId: string, text: string) {
  return withCtx(async (ctx) => {
    const next = cleanText(text);
    const T = schema.inspoItem;
    const [row] = await db.select({ id: T.id, web: T.web }).from(T).where(and(eq(T.organizationId, ctx.workspace.id), eq(T.id, String(itemId)))).limit(1);
    if (!next || !row || !ownsTextFile(ctx.workspace.id, row.web)) throw new HttpError(400, (await getErrors()).badBody);
    await rewriteText(ctx.workspace.id, row.web, next);
    const tags = await textTags(row.web);
    await setTags(ctx.workspace.id, row.web, tags);
    void enqueueEmbed([row.id]);
    return { text: next, tags };
  });
}

/** A saved text under another title: the name its card, its panel and the document's Content give it */
export async function renameText(itemId: string, title: string) {
  return withCtx(async (ctx) => {
    const name = String(title ?? "").replace(/\s+/g, " ").trim().slice(0, TEXT_TITLE_MAX);
    const T = schema.inspoItem;
    const [row] = await db.select({ id: T.id, web: T.web }).from(T).where(and(eq(T.organizationId, ctx.workspace.id), eq(T.id, String(itemId)))).limit(1);
    if (!name || !row || !ownsTextFile(ctx.workspace.id, row.web)) throw new HttpError(400, (await getErrors()).badBody);
    await db.update(T).set({ name, updatedAt: new Date() }).where(and(eq(T.organizationId, ctx.workspace.id), eq(T.id, row.id)));
    void enqueueEmbed([row.id]);
    return { name };
  });
}

/** The words of this workspace's texts, by item id: what the document and the panel show whole */
export async function readTexts(itemIds: string[]) {
  return withCtx(async (ctx) => {
    const ids = Array.isArray(itemIds) ? [...new Set(itemIds.map(String))].slice(0, 200) : [];
    if (!ids.length) return {} as Record<string, string>;
    const T = schema.inspoItem;
    const rows = await db.select({ id: T.id, web: T.web }).from(T).where(and(eq(T.organizationId, ctx.workspace.id), inArray(T.id, ids)));
    const out: Record<string, string> = {};
    await Promise.all(rows.filter((r) => ownsTextFile(ctx.workspace.id, r.web)).map(async (r) => {
      const text = await readText(r.web);
      if (text !== null) out[r.id] = text;
    }));
    return out;
  });
}
