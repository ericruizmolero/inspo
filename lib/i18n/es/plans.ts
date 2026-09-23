import type { plans as EnPlans } from "../en/plans";

export const plans: typeof EnPlans = {
  solo: {
    tagline: "Para tu librería personal.",
    features: [
      "Inspos ilimitados",
      "Etiquetas automáticas",
      "3 DESIGN.md al mes",
      "30 búsquedas IA distintas al mes",
      "Directorio de 130+ webs",
    ],
  },
  studio: {
    tagline: "Para un estudio pequeño que comparte gusto.",
    features: [
      "Hasta 5 personas",
      "Inspos ilimitados",
      "25 DESIGN.md al mes",
      "Búsquedas IA ilimitadas",
      "Comentarios y revisiones de DESIGN.md",
    ],
  },
  agency: {
    tagline: "Para equipos con varios proyectos abiertos.",
    features: [
      "Hasta 15 personas",
      "Varios workspaces",
      "100 DESIGN.md al mes",
      "Búsquedas IA ilimitadas",
      "Soporte por correo el mismo día",
    ],
  },
};
