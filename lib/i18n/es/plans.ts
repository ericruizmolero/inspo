import type { plans as EnPlans } from "../en/plans";

export const plans: typeof EnPlans = {
  solo: {
    tagline: "Para tu librería personal.",
    features: [
      "Hasta 200 referencias y 1 GB",
      "Etiquetas automáticas",
      "30 acciones de IA al mes",
      "30 búsquedas IA distintas al mes",
      "Directorio de 130+ webs",
    ],
  },
  studio: {
    tagline: "Para un estudio pequeño que comparte gusto.",
    features: [
      "Hasta 5 personas",
      "Inspos ilimitados",
      "500 acciones de IA al mes",
      "Búsquedas IA ilimitadas",
      "Comentarios y revisiones de DESIGN.md",
    ],
  },
  agency: {
    tagline: "Para equipos con varios proyectos abiertos.",
    features: [
      "Hasta 15 personas",
      "Varios workspaces",
      "2.000 acciones de IA al mes",
      "Búsquedas IA ilimitadas",
      "Soporte por correo el mismo día",
    ],
  },
};
