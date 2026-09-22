// Feedback visual sobre la app: guarda cada nota de la barra Agentation según llega y,
// cuando la persona pulsa "Enviar al equipo", manda todas las notas de esa página por
// correo a los socios (quienes ven /admin, lib/activity.ts) con el mismo markdown que
// copia la barra. No hay envíos automáticos: solo sale lo que la persona decide enviar.
import { and, eq, inArray, isNull } from "drizzle-orm";
import "server-only";
import { db, schema } from "./db";
import { listAdmins } from "./activity";
import { feedbackMail, sendMail } from "./mail";
import { feedbackMarkdown, pathOf, type Annotation, type FeedbackEvent } from "./feedback-core";

export * from "./feedback-core";

export interface FeedbackAuthor { id: string; name: string; email: string }

const F = schema.feedbackNote;
const noteId = (annotationId: string | number, userId: string) => `${String(annotationId).slice(0, 40)}@${userId}`;

/** Recorta campos enormes (estilos computados, HTML cercano) para no hinchar la fila */
function slim(a: Annotation): Annotation {
  const cut = (s: string | undefined, n: number) => (typeof s === "string" && s.length > n ? s.slice(0, n) + "…" : s);
  return {
    ...a,
    comment: String(a.comment ?? "").slice(0, 4000),
    element: String(a.element ?? "Elemento").slice(0, 200),
    elementPath: String(a.elementPath ?? "").slice(0, 600),
    selectedText: cut(a.selectedText, 1000),
    nearbyText: cut(a.nearbyText, 500),
    nearbyElements: cut(a.nearbyElements, 500),
    computedStyles: cut(a.computedStyles, 1500),
    fullPath: cut(a.fullPath, 1000),
    cssClasses: cut(a.cssClasses, 500),
    accessibility: cut(a.accessibility, 500),
    reactComponents: cut(a.reactComponents, 300),
    sourceFile: cut(a.sourceFile, 300),
    thread: undefined,
  };
}

const validAnnotation = (a: unknown): a is Annotation =>
  !!a && typeof a === "object" && (typeof (a as Annotation).id === "string" || typeof (a as Annotation).id === "number");

/** Guarda o actualiza notas (sin tocar sentAt en las que ya salieron) */
async function upsert(author: FeedbackAuthor, organizationId: string | null, annotations: Annotation[], url: string, viewport: string | null) {
  if (!annotations.length) return;
  const now = new Date();
  const path = pathOf(url);
  for (const a of annotations) {
    const data = JSON.stringify(slim(a));
    await db.insert(F).values({
      id: noteId(a.id, author.id), userId: author.id, organizationId, path, url, viewport,
      data, createdAt: now, updatedAt: now, sentAt: null,
    }).onConflictDoUpdate({ target: F.id, set: { data, updatedAt: now, url, path } });
  }
}

/** Procesa un evento de la barra. Devuelve cuántos correos han salido (1 solo al enviar). */
export async function handleFeedbackEvent(author: FeedbackAuthor, organizationId: string | null, ev: FeedbackEvent): Promise<{ sent: number }> {
  const url = String(ev.url ?? "").slice(0, 1000);
  const viewport = "viewport" in ev && typeof ev.viewport === "string" ? ev.viewport.slice(0, 40) : null;

  switch (ev.event) {
    case "annotation.add":
    case "annotation.update":
      if (!validAnnotation(ev.annotation)) throw new Error("Falta la anotación");
      await upsert(author, organizationId, [ev.annotation], url, viewport);
      return { sent: 0 };
    case "annotation.delete":
      // Solo se retira si aún no ha salido por correo; lo enviado, enviado está
      if (validAnnotation(ev.annotation)) await db.delete(F).where(and(eq(F.id, noteId(ev.annotation.id, author.id)), isNull(F.sentAt)));
      return { sent: 0 };
    case "submit": {
      const annotations = (Array.isArray(ev.annotations) ? ev.annotations : []).filter(validAnnotation);
      if (!annotations.length) throw new Error("No hay notas que enviar");
      await upsert(author, organizationId, annotations, url, viewport);
      const path = pathOf(url);
      const markdown = typeof ev.output === "string" && ev.output.trim() ? ev.output.trim().slice(0, 60000) : feedbackMarkdown(annotations.map(slim), path, viewport);
      const to = (await listAdmins()).map((a) => a.email);
      if (!to.length) throw new Error("No hay nadie en el equipo a quien avisar");
      const m = feedbackMail({ author, path, url, count: annotations.length, markdown, at: new Date() });
      await sendMail(to, m.subject, m.html, m.text, { replyTo: author.email });
      await db.update(F).set({ sentAt: new Date() }).where(inArray(F.id, annotations.map((a) => noteId(a.id, author.id))));
      return { sent: 1 };
    }
    default:
      throw new Error("Evento desconocido");
  }
}
