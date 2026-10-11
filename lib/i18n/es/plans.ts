import type { plans as EnPlans } from "../en/plans";

export const plans: typeof EnPlans = {
  free: {
    name: "Gratis",
    tagline: "Para probarlo.",
    features: [
      "Hasta 200 referencias y 1 GB",
      "Etiquetas automáticas",
      "30 acciones de IA al mes",
      "30 búsquedas IA distintas al mes",
      "Directorio de 130+ webs",
    ],
  },
  personal: {
    name: "Personal",
    tagline: "Para quien diseña solo.",
    features: [
      "Solo tú, sin invitaciones",
      "Referencias sin límite",
      "300 acciones de IA al mes",
      "Búsquedas IA con uso justo",
      "Directorio de 130+ webs",
    ],
  },
  studio: {
    name: "Studio",
    tagline: "Para un equipo de diseño o de producto.",
    features: [
      "Hasta 5 personas",
      "Referencias sin límite",
      "500 acciones de IA al mes",
      "Búsquedas IA con uso justo",
    ],
  },
  agency: {
    name: "Agency",
    tagline: "Para una agencia, con un criterio por cliente.",
    features: [
      "Hasta 15 personas en cada espacio",
      "10 espacios con un solo plan",
      "2.000 acciones de IA al mes",
      "Búsquedas IA con uso justo",
    ],
  },
};
