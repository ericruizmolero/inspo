export interface InspoItem {
  /** id en base de datos (ausente solo en objetos transitorios) */
  id?: string;
  empresa: string;
  web: string;
  /** DD/MM/YYYY (formato histórico del sheet, el cliente lo parsea así) */
  fecha: string;
  /** Nombre visible de quien lo puso. "Ambos" es un valor heredado del sheet. */
  puestoPor: string;
  tipo: "Inspiración" | "Videos" | "Ideas" | "Documentales";
  comentarios: string;
  subcomentarios?: string;
}

export type FilterTipo = "Todos" | InspoItem["tipo"];
export type FilterAutor = "Todos" | string;
export type FilterFecha = "Todos" | "Este mes" | "Este año";

// ─── Etiquetas IA (Jev) ───────────────────────────────────────────────────────
export interface InspoTags {
  /** Sector elegido por Jev (clave de SECTORES) */
  sector: string;
  sectorP: number;
  /** Estilo dominante (clave de ESTILOS) */
  estilo: string;
  estiloP: number;
  /** Probabilidad 0–1 de cada tag booleano (clave de TAGS) */
  tags: Record<string, number>;
  /** Resumen corto del sitio (título + descripción) para la búsqueda IA */
  resumen: string;
  /** Descripción visual de la captura generada por Claude (vacío si no hubo captura) */
  visual?: string;
  /** ISO date de cuándo se etiquetó */
  at: string;
  /** Versión de la taxonomía usada */
  v: number;
}

export type TagMap = Record<string, InspoTags>;
