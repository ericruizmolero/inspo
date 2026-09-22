// Planes del SaaS. Sin pasarela de pago todavía: el plan vive en la metadata de la
// organización y se cambia a mano con `npx tsx scripts/set-plan.ts <slug> <plan>`.
// Las cuotas son mensuales (mes natural) y se cuentan sobre la tabla ai_usage.

export type PlanKey = "solo" | "studio" | "agencia";

// El texto de cada plan (titular y lista de lo que incluye) vive en
// lib/i18n/<idioma>/plans.ts, con la clave del plan como clave.
export interface Plan {
  key: PlanKey;
  name: string;
  priceEur: number;
  /** null = sin límite */
  members: number | null;
  designMdPerMonth: number | null;
  searchesPerMonth: number | null;
}

export const PLANS: Plan[] = [
  {
    key: "solo", name: "Solo", priceEur: 0,
    members: 1, designMdPerMonth: 3, searchesPerMonth: 30,
  },
  {
    key: "studio", name: "Studio", priceEur: 29,
    members: 5, designMdPerMonth: 25, searchesPerMonth: null,
  },
  {
    key: "agencia", name: "Agencia", priceEur: 79,
    members: 15, designMdPerMonth: 100, searchesPerMonth: null,
  },
];

export const DEFAULT_PLAN: PlanKey = "solo";

export function planOf(key: string | null | undefined): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}

export const isPlanKey = (k: string): k is PlanKey => PLANS.some((p) => p.key === k);

/** Correo de contacto para cambiar de plan mientras no hay pasarela */
export const PLANS_CONTACT = "hola@savvia.studio";
