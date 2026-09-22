// Tipos del uso de IA, sin dependencias de servidor: lo importan lib/usage.ts (BD)
// y los paneles de cliente (/equipo y /admin).
//
// Aquí no hay texto ni formato: el servidor manda códigos, fechas ISO y números, y
// el cliente los traduce y formatea con su idioma (t.labels.action, fmtUsd, fmtDate).

export type UsageAction = "design_md" | "vision" | "jev_tag" | "jev_search" | "jev_recursos" | "explain" | "revise";


export interface UsageDay { date: string; usd: number; calls: number }

/** Uso de IA de toda la app en un periodo (panel /admin) */
export interface UsageOverview {
  days: number;
  totalUsd: number;
  calls: number;
  /** Personas con al menos una llamada */
  people: number;
  byAction: { action: string; calls: number; usd: number; units: number }[];
  /** `name` null = llamada del sistema, sin persona detrás */
  byUser: { userId: string | null; name: string | null; email: string | null; image: string | null; usd: number; calls: number }[];
  /** `name` null = el workspace ya no existe */
  byWorkspace: { id: string; name: string | null; kind: "personal" | "team"; usd: number; calls: number }[];
  daily: UsageDay[];
}
