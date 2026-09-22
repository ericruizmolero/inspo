// Feedback visual sobre la app (barra Agentation): tipos y formato, sin dependencias
// de servidor. Lo importan lib/feedback.ts (BD y correo) y components/FeedbackTool.tsx.
import type { Annotation } from "agentation";

export type { Annotation };

/** Eventos que acepta POST /api/feedback */
export type FeedbackEvent =
  /** Se guarda cada nota según se añade o edita, por si acaso; no manda nada */
  | { event: "annotation.add" | "annotation.update"; annotation: Annotation; url?: string; viewport?: string }
  | { event: "annotation.delete"; annotation: Annotation; url?: string }
  /** Botón "Enviar al equipo": manda por correo todas las notas de la página */
  | { event: "submit"; output?: string; annotations: Annotation[]; url?: string; viewport?: string };

/** Ruta + query + hash de una URL, como la enseña Agentation en la cabecera del feedback */
export function pathOf(url: string | undefined | null, fallback = "/"): string {
  if (!url) return fallback;
  try {
    const u = new URL(url, "https://criterio.design");
    return (u.pathname + u.search + u.hash) || fallback;
  } catch { return fallback; }
}

/**
 * El mismo markdown que copia Agentation en su nivel "standard" (generateOutput):
 * cabecera con la página y el viewport, y una sección numerada por nota con el
 * elemento, su ruta en el DOM, el texto seleccionado y el comentario.
 */
export function feedbackMarkdown(annotations: Annotation[], path: string, viewport?: string | null): string {
  if (!annotations.length) return "";
  let out = `## Page Feedback: ${path}\n`;
  if (viewport) out += `**Viewport:** ${viewport}\n`;
  out += "\n";
  annotations.forEach((a, i) => {
    out += `### ${i + 1}. ${a.element}\n`;
    out += `**Location:** ${a.elementPath}\n`;
    if (a.sourceFile) out += `**Source:** ${a.sourceFile}\n`;
    if (a.reactComponents) out += `**React:** ${a.reactComponents}\n`;
    if (a.selectedText) out += `**Selected text:** "${a.selectedText}"\n`;
    out += `**Feedback:** ${a.comment}\n\n`;
  });
  return out.trim();
}

// ─── Lo que enseña /admin ────────────────────────────────────────────────────

/** Una nota, ya reducida a lo que se lee en el panel */
export interface FeedbackNoteView {
  id: string;
  element: string;
  elementPath: string;
  comment: string;
  selectedText: string | null;
  sourceFile: string | null;
  reactComponents: string | null;
  createdAt: string;
}

/** Un envío (o un borrador aún sin enviar): las notas de una persona sobre una página */
export interface FeedbackBatch {
  key: string;
  author: { id: string; name: string; email: string; image: string | null };
  workspace: string | null;
  path: string;
  url: string;
  viewport: string | null;
  /** Cuándo salió el correo; null = la persona aún no ha pulsado "Enviar al equipo" */
  sentAt: string | null;
  /** Última nota añadida o editada */
  updatedAt: string;
  notes: FeedbackNoteView[];
}

export interface FeedbackOverview {
  days: number;
  batches: FeedbackBatch[];
  /** Totales del periodo */
  notes: number;
  sent: number;
  pending: number;
  people: number;
}

/** El mismo markdown del correo, reconstruido desde el panel para pegárselo a un agente */
export function batchMarkdown(b: FeedbackBatch): string {
  return feedbackMarkdown(
    b.notes.map((n, i) => ({
      id: n.id, x: 0, y: 0, timestamp: i, comment: n.comment, element: n.element, elementPath: n.elementPath,
      selectedText: n.selectedText ?? undefined, sourceFile: n.sourceFile ?? undefined, reactComponents: n.reactComponents ?? undefined,
    })),
    b.path,
    b.viewport,
  );
}
