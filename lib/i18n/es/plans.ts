import type { plans as EnPlans } from "../en/plans";

export const plans: typeof EnPlans = {
  free: {
    name: "Gratis",
    tagline: "Para probarlo.",
    features: [
      "Tú y una persona más",
      "1 proyecto con hasta 12 referencias",
      "El Vault para mirar, con el código de las piezas gratis",
      "10 revisiones de landing al mes",
      "Tu primer criterio.md no gasta acciones de IA",
      "30 acciones de IA al mes",
    ],
  },
  duo: {
    name: "Duo",
    tagline: "Para dos personas que diseñan juntas.",
    features: [
      "El Vault entero, con su código, para tu agente",
      "Tú y una persona más",
      "Memoria compartida en tus proyectos",
      "Proyectos y referencias sin límite",
      "Revisiones de landing, uso razonable",
      "300 acciones de IA al mes",
    ],
  },
  studio: {
    name: "Studio",
    tagline: "Para un equipo de diseño o de producto.",
    features: ["Todo lo de Duo", "Hasta 5 personas", "500 acciones de IA al mes"],
  },
  agency: {
    name: "Agency",
    tagline: "Para una agencia, con un criterio.md por cliente.",
    features: ["Todo lo de Studio, para cada cliente", "Hasta 15 personas en cada espacio", "10 espacios en un plan", "2.000 acciones de IA al mes"],
  },
};
