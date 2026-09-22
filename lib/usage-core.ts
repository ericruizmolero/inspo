// Tipos y etiquetas del uso de IA, sin dependencias de servidor: lo importan
// lib/usage.ts (BD) y los paneles de cliente (/equipo y /admin).

export type UsageAction = "design_md" | "vision" | "jev_tag" | "jev_search" | "jev_recursos" | "explain" | "revise";

export const ACTION_LABEL: Record<UsageAction, string> = {
  design_md: "DESIGN.md generados", vision: "Capturas descritas", jev_tag: "Inspos etiquetados",
  jev_search: "Búsquedas IA", jev_recursos: "Búsquedas en el directorio", explain: "Explicaciones de búsqueda", revise: "Revisiones de DESIGN.md",
};
export const actionLabel = (a: string) => ACTION_LABEL[a as UsageAction] ?? a;

/** "0,92 $", "<0,01 $" para importes minúsculos, "0,00 $" si no hay nada */
export const fmtUsd = (n: number) => (n < 0.005 && n > 0 ? "<0,01 $" : `${n.toFixed(2).replace(".", ",")} $`);

/** "4 llamadas" o, en Jev, "400 items en 5 llamadas" */
export function callsLabel(action: string, calls: number, units: number): string {
  if (action.startsWith("jev_") && units) return `${units} items en ${calls} ${calls === 1 ? "llamada" : "llamadas"}`;
  return `${calls} ${calls === 1 ? "llamada" : "llamadas"}`;
}

export interface UsageDay { date: string; label: string; usd: number; calls: number }

/** Uso de IA de toda la app en un periodo (panel /admin) */
export interface UsageOverview {
  days: number;
  totalUsd: number;
  calls: number;
  /** Personas con al menos una llamada */
  people: number;
  byAction: { action: string; label: string; calls: number; usd: number; units: number }[];
  byUser: { userId: string | null; name: string; email: string | null; image: string | null; usd: number; calls: number }[];
  byWorkspace: { id: string; name: string; kind: "personal" | "team"; usd: number; calls: number }[];
  daily: UsageDay[];
}
