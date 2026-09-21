import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { DesignTokens } from "./design-extract";
import { DesignSpecSchema, renderDesignMd, type DesignSpec } from "@/types/design";

const MODEL = process.env.DESIGN_MD_MODEL || "claude-opus-5";

const SYSTEM = `Extraes el sistema de diseño de una web real y lo conviertes en una spec estructurada, al estilo de styles.refero.design.

Recibes (1) un JSON con los tokens de diseño medidos en la página en vivo (estilos computados contados por frecuencia; colores de fondo ponderados por área visible) y (2) una captura del viewport. El JSON es la verdad para los valores. La captura sirve para el juicio: jerarquía, atmósfera, densidad, qué está haciendo realmente la marca. Si discrepan, fíate del JSON para los números y de la captura para la intención.

Reglas:
- Escribe TODO en castellano (español de España): descripción, roles, usos, reglas, prompt para agentes, nombres de colores, roles de la escala tipográfica. Nada en inglés salvo nombres propios de fuentes y marcas, y valores técnicos (hex, px, pesos, propiedades CSS).
- Valores concretos: hex, px, nombres de fuente, pesos. Convierte rgb()/rgba() a hex (alpha como hex de 8 dígitos cuando importe).
- Ignora el ruido: valores por defecto del navegador, banners de cookies, widgets de terceros, valores sueltos con recuento 1 salvo que sean claramente intencionados.
- Nombra los colores de forma evocadora y consistente, en castellano ("Obsidiana", "Azul Señal", "Blanco Papel"). Dale a cada color un rol real, no solo "se usa en botones".
- Paleta contenida. El JSON de tokens ya fusiona los tonos casi idénticos; no los vuelvas a separar. Si dos colores compartirían rol, quédate con uno. La mayoría de webs se resuelven con 6-10 tokens; una web monocroma y sobria puede necesitar solo 5 o 6. Nunca pases de 12.
- Describe los roles que cumple cada fuente y la decisión característica que la hace reconocible (p. ej. "el peso 510 es el de batalla, nada va en negrita").
- El tagline es un descriptor de atmósfera poético pero preciso, de 3 a 6 palabras, en minúsculas y en castellano: "portfolio editorial mate", "panel de instrumentos escarchado a medianoche".
- La descripción es un único párrafo denso, de 120 a 180 palabras, que un diseñador reconocería como esta web exacta.
- Las reglas de "sí" y "no" deben ser específicas de este sistema y reproducibles por un agente de IA.
- Los roles de la escala tipográfica van en castellano: leyenda, cuerpo-sm, cuerpo, subtítulo, título-sm, título, título-lg, display.
- Componentes: de 3 a 5 primitivos reutilizables (botón primario, botón secundario, input, enlace, tarjeta, cabecera, footer), solo los que existan de verdad. Nunca describas secciones de la página (hero, mosaico de imágenes, carrusel de logos, filas de features): eso es contenido de esa landing, no sistema. En cada primitivo cita los tokens por nombre ("fondo Obsidiana, radio pequeño, texto en cuerpo-sm") y añade solo lo que no está en otra sección: altura, padding, borde, hover, estado activo.
- Redondea los px que vienen de rem: 11,7px es 12px, 21,06px es 21px, 115,2px es 115px o el paso de la escala más cercano. Un decimal de conversión no es una decisión de diseño.
- Si un valor es dudoso, dilo brevemente en el texto del rol en lugar de inventarlo.`;

export interface GenerateResult {
  spec: DesignSpec;
  markdown: string;
  model: string;
  usage: { input: number; output: number; cacheRead: number };
}

export async function generateDesignMd(tokens: DesignTokens, screenshot: Buffer, signal?: AbortSignal): Promise<GenerateResult> {
  const client = new Anthropic();
  const date = new Date().toISOString().slice(0, 10);

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 12000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    // Effort medio: la mitad de tokens de razonamiento con un DESIGN.md prácticamente igual
    output_config: { format: zodOutputFormat(DesignSpecSchema), effort: (process.env.DESIGN_MD_EFFORT as "low" | "medium" | "high") || "medium" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: screenshot.toString("base64") },
          },
          {
            type: "text",
            text: `URL de origen: ${tokens.finalUrl}\nFecha: ${date}\n\nTokens medidos (JSON):\n${JSON.stringify(tokens)}`,
          },
        ],
      },
    ],
  }, { signal });

  // El SDK intenta parsear el JSON en finalMessage() aunque el stop_reason no sea end_turn,
  // así que capturamos stop_reason y el texto por el camino para dar un error útil si se corta.
  let stopReason: string | null = null;
  let raw = "";
  stream.on("streamEvent", (ev) => {
    if (ev.type === "message_delta" && ev.delta.stop_reason) stopReason = ev.delta.stop_reason;
  });
  stream.on("text", (t) => { raw += t; });

  let msg: Awaited<ReturnType<typeof stream.finalMessage>>;
  try {
    msg = await stream.finalMessage();
  } catch (err) {
    if (signal?.aborted) throw err; // parada del usuario: no es una respuesta rota
    const why = err instanceof Error ? err.message : String(err);
    console.error(`design-md: respuesta no parseable (stop_reason=${stopReason}, ${raw.length} chars). Cola: …${raw.slice(-200)}`);
    throw new Error(`Claude devolvió una respuesta incompleta (stop_reason=${stopReason ?? "desconocido"}): ${why}`);
  }

  if (msg.stop_reason === "refusal") {
    throw new Error(`Claude ha rechazado generar el DESIGN.md (${msg.stop_details?.category ?? "desconocido"})`);
  }
  if (msg.stop_reason === "max_tokens") throw new Error("Claude se ha quedado sin tokens de salida");

  const text = msg.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const spec = DesignSpecSchema.parse(JSON.parse(text));
  const markdown = renderDesignMd(spec, tokens.finalUrl, date);

  return {
    spec,
    markdown,
    model: msg.model,
    usage: {
      input: msg.usage.input_tokens,
      output: msg.usage.output_tokens,
      cacheRead: msg.usage.cache_read_input_tokens ?? 0,
    },
  };
}
