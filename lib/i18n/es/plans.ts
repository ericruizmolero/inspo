import type { plans as EnPlans } from "../en/plans";

export const plans: typeof EnPlans = {
  free: {
    name: "Gratis",
    tagline: "Para probarlo.",
    features: [
      "Tú y una persona más",
      "1 proyecto con hasta 12 referencias",
      "El agente recuerda lo que corregiste",
      "10 revisiones de landing al mes",
      "Tu primer criterio.md no gasta acciones de IA",
      "30 acciones de IA al mes",
    ],
  },
  personal: {
    name: "Personal",
    tagline: "Para quien diseña por su cuenta.",
    features: [
      "Tú y una persona más",
      "Memoria compartida en tus proyectos",
      "Proyectos y referencias sin límite",
      "Revisiones de landing, uso razonable",
      "300 acciones de IA al mes",
      "Búsquedas IA, uso razonable",
    ],
  },
  studio: {
    name: "Studio",
    tagline: "Para un equipo de diseño o de producto.",
    features: [
      "Hasta 5 personas",
      "Memoria compartida en tus proyectos",
      "Proyectos y referencias sin límite",
      "Revisiones de landing, uso razonable",
      "500 acciones de IA al mes",
      "Búsquedas IA, uso razonable",
    ],
  },
  agency: {
    name: "Agency",
    tagline: "Para una agencia, con un criterio por cliente.",
    features: [
      "Hasta 15 personas en cada espacio",
      "10 espacios en un plan",
      "Memoria compartida por cliente",
      "Revisiones de landing, uso razonable",
      "2.000 acciones de IA al mes",
      "Búsquedas IA, uso razonable",
    ],
  },
};
