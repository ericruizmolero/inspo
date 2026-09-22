// Lo que se lee de cada plan. El precio, las cuotas y la clave viven en lib/plans.ts,
// que es donde manda: aquí solo está el texto.
export const plans = {
  solo: {
    tagline: "For your own library.",
    features: [
      "Unlimited inspos",
      "Automatic tags",
      "3 DESIGN.md a month",
      "30 different AI searches a month",
      "A directory of 130+ sites",
    ],
  },
  studio: {
    tagline: "For a small studio that shares a taste.",
    features: [
      "Up to 5 people",
      "Unlimited inspos",
      "25 DESIGN.md a month",
      "Unlimited AI searches",
      "Comments and DESIGN.md revisions",
    ],
  },
  agencia: {
    tagline: "For teams with several projects open at once.",
    features: [
      "Up to 15 people",
      "Several workspaces",
      "100 DESIGN.md a month",
      "Unlimited AI searches",
      "Same-day email support",
    ],
  },
};
