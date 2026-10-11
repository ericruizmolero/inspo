// The readable text of each plan. Price, quotas and key live in lib/plans.ts,
// which is the source of truth: only the name and the text are here.
export const plans = {
  free: {
    name: "Free",
    tagline: "To try it out.",
    features: [
      "Up to 200 references and 1 GB",
      "Automatic tags",
      "30 AI actions a month",
      "Your first criterio.md spends no AI actions",
      "30 different AI searches a month",
      "A directory of 130+ sites",
    ],
  },
  personal: {
    name: "Personal",
    tagline: "For a designer working alone.",
    features: [
      "Just you, no invitations",
      "Unlimited references",
      "300 AI actions a month",
      "AI searches, fair use",
      "A directory of 130+ sites",
    ],
  },
  studio: {
    name: "Studio",
    tagline: "For a design or product team.",
    features: [
      "Up to 5 people",
      "Unlimited references",
      "500 AI actions a month",
      "AI searches, fair use",
    ],
  },
  agency: {
    name: "Agency",
    tagline: "For an agency, one criterio per client.",
    features: [
      "Up to 15 people in each workspace",
      "10 workspaces on one plan",
      "2,000 AI actions a month",
      "AI searches, fair use",
    ],
  },
};
