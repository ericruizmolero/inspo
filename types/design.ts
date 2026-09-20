import { z } from "zod";

// ─── Spec estructurada que devuelve Claude ───────────────────────────────────

export const DesignSpecSchema = z.object({
  brand: z.string().describe("Nombre de la marca o de la web, corto"),
  tagline: z.string().describe("Descriptor poético de la atmósfera visual, 3-6 palabras, en minúsculas y en castellano, p. ej. 'galería de museo blanca a mediodía'"),
  theme: z.enum(["light", "dark"]),
  description: z.string().describe("Un párrafo en castellano, 120-180 palabras: qué transmite la interfaz y las decisiones concretas que lo producen. Menciona hex y nombres de fuente en el texto."),
  colors: z.array(z.object({
    name: z.string().describe("Nombre evocador de 1-2 palabras en castellano, p. ej. 'Azul Señal', 'Obsidiana'"),
    hex: z.string().describe("#rrggbb, o #rrggbbaa cuando el alpha importa"),
    group: z.enum(["brand", "accent", "neutral", "semantic"]),
    role: z.string().describe("Dónde y por qué se usa, una frase en castellano"),
  })).min(4).max(12).describe("Entre 6 y 10 colores en la mayoría de sistemas; 12 solo en paletas realmente ricas. Una paleta es un conjunto de decisiones, no un censo: fusiona en un solo token los tonos que difieren en unos pocos puntos RGB, agrupa los blancos o negros con poca opacidad en un único token de 'filete' o 'velo', y descarta cualquier color sin un rol distinto. Lo típico: fondo, 1-2 superficies, texto, texto atenuado, borde, 1-3 acentos, y semánticos solo si existen de verdad. Neutros ordenados de oscuro a claro."),
  fonts: z.array(z.object({
    family: z.string(),
    role: z.enum(["display", "body", "mono", "ui"]),
    weights: z.array(z.number()),
    sizes: z.string().describe("Rango y recuento, p. ej. '21-96px · 8 valores'"),
    lineHeight: z.string(),
    letterSpacing: z.string(),
    fallback: z.string().describe("Stack sustituto libre/de sistema si la fuente es propietaria"),
    usage: z.string().describe("2-3 frases en castellano: para qué se usa y la decisión característica"),
  })),
  typeScale: z.array(z.object({
    role: z.string().describe("leyenda | cuerpo-sm | cuerpo | subtítulo | título-sm | título | título-lg | display"),
    size: z.number().describe("px"),
    weight: z.number(),
    lineHeight: z.number().describe("ratio sin unidad"),
    letterSpacing: z.string(),
    family: z.string(),
  })).describe("6-9 pasos de menor a mayor"),
  spacing: z.object({
    density: z.enum(["compact", "comfortable", "airy"]),
    baseUnit: z.string(),
    maxWidth: z.string(),
    sectionGap: z.string(),
    cardPadding: z.string(),
    elementGap: z.string(),
  }),
  radii: z.array(z.object({ element: z.string(), value: z.string() })),
  elevation: z.string().describe("Cómo se consigue la profundidad: sombras, bordes o escalones de superficie. Incluye los valores de sombra si los hay. En castellano."),
  components: z.array(z.object({
    name: z.string(),
    role: z.string(),
    spec: z.string().describe("Concreto y en castellano: fondo, color de texto, fuente, tamaño, padding, radio, borde, hover"),
  })).describe("5-9 componentes: botones, nav, tarjetas, inputs, enlaces, patrones característicos. Nombres y roles en castellano."),
  motion: z.string().describe("Transiciones, easing, duraciones, qué se anima y qué no. En castellano."),
  layout: z.string().describe("Estructura, contenedor, grid, ritmo, alineación. En castellano."),
  imagery: z.string().describe("Fotografía vs ilustración, densidad, tratamiento. En castellano."),
  dos: z.array(z.string()).describe("5-7 reglas en castellano"),
  donts: z.array(z.string()).describe("5-7 reglas en castellano"),
  similar: z.array(z.object({ brand: z.string(), why: z.string() })).describe("3-5 marcas reales con un sistema parecido; el porqué en castellano"),
  agentPrompt: z.string().describe("Párrafo de 60-100 palabras en castellano que un agente de IA pueda pegar para reproducir el estilo"),
});

export type DesignSpec = z.infer<typeof DesignSpecSchema>;

// ─── Render a markdown (formato tipo Refero) ─────────────────────────────────

const THEME_ES: Record<DesignSpec["theme"], string> = { light: "claro", dark: "oscuro" };
const GROUP_ES: Record<DesignSpec["colors"][number]["group"], string> = {
  brand: "marca", accent: "acento", neutral: "neutro", semantic: "semántico",
};
const DENSITY_ES: Record<DesignSpec["spacing"]["density"], string> = {
  compact: "compacta", comfortable: "cómoda", airy: "aireada",
};
const FONT_ROLE_ES: Record<DesignSpec["fonts"][number]["role"], string> = {
  display: "display", body: "cuerpo", mono: "mono", ui: "interfaz",
};

export function renderDesignMd(spec: DesignSpec, url: string, date: string): string {
  const L: string[] = [];
  const p = (s = "") => L.push(s);

  p(`# ${spec.brand} — DESIGN.md`);
  p(`> ${spec.tagline}`);
  p();
  p(`**Tema:** ${THEME_ES[spec.theme]}  `);
  p(`**Origen:** ${url} · ${date}`);
  p();
  p("Las medidas de origen están normalizadas; los roles y las recomendaciones son interpretados.");
  p();
  p(spec.description);
  p();

  p("## Colores");
  p();
  p("| Nombre | Valor | Grupo | Rol |");
  p("|--------|-------|-------|-----|");
  for (const c of spec.colors) p(`| ${c.name} | \`${c.hex}\` | ${GROUP_ES[c.group]} | ${c.role} |`);
  p();

  p("## Tipografía");
  p();
  for (const f of spec.fonts) {
    p(`### ${f.family} — ${FONT_ROLE_ES[f.role]}`);
    p(f.usage);
    p(`- **Sustituto:** ${f.fallback}`);
    p(`- **Pesos:** ${f.weights.join(", ")}`);
    p(`- **Tamaños:** ${f.sizes}`);
    p(`- **Interlineado:** ${f.lineHeight}`);
    p(`- **Tracking:** ${f.letterSpacing}`);
    p();
  }
  p("### Escala tipográfica");
  p();
  p("| Rol | Familia | Peso | Tamaño | Interlineado | Tracking |");
  p("|-----|---------|------|--------|--------------|----------|");
  for (const t of spec.typeScale) p(`| ${t.role} | ${t.family} | ${t.weight} | ${t.size}px | ${t.lineHeight} | ${t.letterSpacing} |`);
  p();

  p("## Espaciado y layout");
  p();
  p(`**Densidad:** ${DENSITY_ES[spec.spacing.density]}`);
  p();
  p(`- **Unidad base:** ${spec.spacing.baseUnit}`);
  p(`- **Ancho máximo de página:** ${spec.spacing.maxWidth}`);
  p(`- **Separación entre secciones:** ${spec.spacing.sectionGap}`);
  p(`- **Padding de tarjeta:** ${spec.spacing.cardPadding}`);
  p(`- **Separación entre elementos:** ${spec.spacing.elementGap}`);
  p();
  p("### Radios de borde");
  p();
  for (const r of spec.radii) p(`- **${r.element}:** ${r.value}`);
  p();
  p("## Elevación");
  p();
  p(spec.elevation);
  p();

  p("## Componentes");
  p();
  for (const c of spec.components) {
    p(`### ${c.name}`);
    p(`**Rol:** ${c.role}`);
    p();
    p(c.spec);
    p();
  }

  p("## Movimiento");
  p();
  p(spec.motion);
  p();
  p("## Layout");
  p();
  p(spec.layout);
  p();
  p("## Imagen");
  p();
  p(spec.imagery);
  p();

  p("## Qué hacer y qué no");
  p();
  p("### Sí");
  for (const d of spec.dos) p(`- ${d}`);
  p();
  p("### No");
  for (const d of spec.donts) p(`- ${d}`);
  p();

  p("## Marcas afines");
  p();
  for (const s of spec.similar) p(`- **${s.brand}** — ${s.why}`);
  p();

  p("## Prompt para agentes");
  p();
  p(spec.agentPrompt);
  p();

  return L.join("\n");
}
