// Revisiones del DESIGN.md por workspace: una persona discrepa de una sección,
// Claude corrige la spec estructurada y el cambio queda registrado con autor y resumen.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { desc, and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { DesignSpecSchema, renderDesignMd, type DesignSpec } from "@/types/design";

// Revisar es reescribir una spec ya hecha con un cambio acotado: Sonnet lo resuelve bien y en un tercio del tiempo que Opus.
const MODEL = process.env.DESIGN_REVISE_MODEL || "claude-sonnet-5";

export const SECTIONS: Record<string, string> = {
  general: "Identidad y descripción",
  color: "Color",
  tipografia: "Tipografía",
  espaciado: "Espaciado y forma",
  componentes: "Componentes",
  reglas: "Reglas",
  sistema: "Sistema (elevación, layout, imagen, movimiento)",
  afines: "Marcas afines",
  prompt: "Prompt para agentes",
};

export interface RevisionMeta {
  id: string;
  kind: "regeneracion" | "revision" | "reversion";
  authorName: string;
  section: string | null;
  comment: string;
  summary: string;
  warning: string | null;
  createdAt: string;
}

const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);

const toMeta = (r: typeof schema.designRevision.$inferSelect): RevisionMeta => ({
  id: r.id, kind: r.kind as RevisionMeta["kind"], authorName: r.authorName, section: r.section,
  comment: r.comment, summary: r.summary, warning: r.warning, createdAt: r.createdAt.toISOString(),
});

export async function listRevisions(organizationId: string, url: string): Promise<RevisionMeta[]> {
  const rows = await db.select().from(schema.designRevision)
    .where(and(eq(schema.designRevision.organizationId, organizationId), eq(schema.designRevision.url, url)))
    .orderBy(desc(schema.designRevision.createdAt));
  return rows.map(toMeta);
}

/** Última spec vigente del workspace para esa URL, o null si nunca se ha revisado */
export async function latestRevision(organizationId: string, url: string): Promise<{ meta: RevisionMeta; spec: DesignSpec } | null> {
  const [row] = await db.select().from(schema.designRevision)
    .where(and(eq(schema.designRevision.organizationId, organizationId), eq(schema.designRevision.url, url)))
    .orderBy(desc(schema.designRevision.createdAt)).limit(1);
  if (!row) return null;
  return { meta: toMeta(row), spec: DesignSpecSchema.parse(JSON.parse(row.specJson)) };
}

export async function getRevisionSpec(organizationId: string, id: string): Promise<{ meta: RevisionMeta; spec: DesignSpec } | null> {
  const [row] = await db.select().from(schema.designRevision)
    .where(and(eq(schema.designRevision.organizationId, organizationId), eq(schema.designRevision.id, id))).limit(1);
  if (!row) return null;
  return { meta: toMeta(row), spec: DesignSpecSchema.parse(JSON.parse(row.specJson)) };
}

export async function addRevision(input: {
  organizationId: string; url: string; authorId: string; authorName: string;
  kind: RevisionMeta["kind"]; section?: string | null; comment?: string; summary: string; warning?: string | null; spec: DesignSpec;
}): Promise<RevisionMeta> {
  const row = {
    id: newId(), organizationId: input.organizationId, url: input.url,
    authorId: input.authorId, authorName: input.authorName, kind: input.kind,
    section: input.section ?? null, comment: input.comment ?? "", summary: input.summary,
    warning: input.warning ?? null, specJson: JSON.stringify(input.spec), createdAt: new Date(),
  };
  await db.insert(schema.designRevision).values(row);
  return toMeta({ ...row });
}

/** Aplica la spec vigente del workspace (si la hay) sobre la entrada global */
export async function overlayRevision<T extends { url: string; spec?: DesignSpec; markdown: string; generatedAt: string }>(
  organizationId: string, entry: T
): Promise<T & { revisions: RevisionMeta[] }> {
  const revisions = await listRevisions(organizationId, entry.url);
  if (!revisions.length) return { ...entry, revisions };
  const latest = await getRevisionSpec(organizationId, revisions[0].id);
  if (!latest) return { ...entry, revisions };
  const date = latest.meta.createdAt.slice(0, 10);
  return { ...entry, spec: latest.spec, markdown: renderDesignMd(latest.spec, entry.url, date), revisions };
}

// ─── Claude ──────────────────────────────────────────────────────────────────

// Claude devuelve solo las claves de primer nivel que cambian (no la spec entera): la salida
// pasa de ~10k tokens a unos pocos cientos y la revisión tarda segundos en vez de un minuto.
const ReviseOutput = z.object({
  changed: z.boolean().describe("true si el comentario pedía un cambio y lo has aplicado; false si no pedía nada concreto (una prueba, una pregunta, un comentario vacío)"),
  patch: DesignSpecSchema.partial().describe("Solo las claves de primer nivel de la spec que cambian, cada una completa (si cambia un color, devuelve el array 'colors' entero). Vacío si changed es false."),
  summary: z.string().describe("2-3 frases en castellano: qué has cambiado exactamente y en qué partes de la spec se ha propagado"),
  warning: z.string().nullable().describe("Si el comentario contradice valores que están claramente medidos o visibles, dilo aquí en una frase en castellano. Si no, null."),
});

const SYSTEM = `Mantienes el DESIGN.md de una web para un equipo de diseño. Recibes la spec estructurada vigente y un comentario de una persona del equipo que no está de acuerdo con una parte. Tu trabajo es aplicar ese cambio con criterio y devolver la spec completa corregida.

Reglas:
- Aplica lo que pide la persona. Es quien conoce la marca; su criterio manda sobre lo generado automáticamente.
- Propaga el cambio a todo lo que dependa de él: si cambia un color, actualiza su rol, los componentes que lo usan, la descripción, las reglas y el prompt para agentes. La spec debe seguir siendo coherente.
- No toques nada que el comentario no afecte. Conserva literalmente el resto de textos y valores.
- Si el comentario contradice algo que está claramente medido o visible en la captura (p. ej. dice que el fondo es blanco y la captura es negra), aplícalo igualmente pero avísalo en "warning".
- Si el comentario es ambiguo, elige la interpretación más razonable y explícala en "summary".
- Si el comentario no pide ningún cambio (es una prueba, una pregunta o no dice nada concreto), devuelve "changed": false, "patch" vacío y explica en "summary" qué te faltaría para poder aplicarlo.
- Devuelve en "patch" únicamente las claves de primer nivel que cambian, pero cada una completa: si tocas un color, devuelve el array "colors" entero con todos los colores; si tocas una regla, "dos" o "donts" enteros. No devuelvas claves que no cambian.
- Todo en castellano (español de España), salvo nombres de fuentes, marcas y valores técnicos (hex, px, pesos).
- Respeta las restricciones del esquema: entre 4 y 12 colores, 6-9 pasos de escala, 5-7 reglas de cada tipo.`;

export async function reviseDesignSpec(input: {
  spec: DesignSpec; url: string; section: string; comment: string; screenshot?: Buffer | null;
}): Promise<{ changed: boolean; spec: DesignSpec; summary: string; warning: string | null; model: string }> {
  const client = new Anthropic();
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (input.screenshot) {
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: input.screenshot.toString("base64") } });
  }
  content.push({
    type: "text",
    text: `URL: ${input.url}\nSección a la que se refiere el comentario: ${SECTIONS[input.section] ?? input.section}\n\nComentario de la persona:\n"""\n${input.comment}\n"""\n\nSpec vigente (JSON):\n${JSON.stringify(input.spec)}`,
  });

  const msg = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 6000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { format: zodOutputFormat(ReviseOutput) },
    messages: [{ role: "user", content }],
  });

  if (msg.stop_reason === "refusal") throw new Error("Claude ha rechazado revisar el DESIGN.md");
  if (msg.stop_reason === "max_tokens") throw new Error("Claude se ha quedado sin tokens de salida");
  const text = msg.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  const out = ReviseOutput.parse(JSON.parse(text));
  const spec = out.changed ? DesignSpecSchema.parse({ ...input.spec, ...out.patch }) : input.spec;
  return { changed: out.changed, spec, summary: out.summary, warning: out.warning, model: msg.model };
}
