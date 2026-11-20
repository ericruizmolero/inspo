// The readable text of each plan. Price, quotas and key live in lib/plans.ts,
// which is the source of truth: only the name and the text are here.
export const plans = {
  free: {
    name: "Free",
    tagline: "To try it out.",
    features: [
      "You and one more person",
      "1 project with up to 12 references",
      "Browse the Vault, with the code of the free pieces",
      "10 landing checks a month",
      "Your first criterio.md spends no AI actions",
      "30 AI actions a month",
    ],
  },
  duo: {
    name: "Duo",
    tagline: "For two people designing together.",
    features: [
      "You and one more person",
      "The whole Vault, code included, for your agent",
      "Shared memory across your projects",
      "Unlimited projects and references",
      "Landing checks, fair use",
      "300 AI actions a month",
    ],
  },
  studio: {
    name: "Studio",
    tagline: "For a design or product team.",
    features: [
      "Up to 5 people",
      "The whole Vault for the whole team",
      "Shared memory across your projects",
      "Unlimited projects and references",
      "Landing checks, fair use",
      "500 AI actions a month",
    ],
  },
  agency: {
    name: "Agency",
    tagline: "For an agency, one criterio per client.",
    features: [
      "Up to 15 people in each workspace",
      "10 workspaces on one plan",
      "The whole Vault in every client workspace",
      "Shared memory for each client",
      "Landing checks, fair use",
      "2,000 AI actions a month",
    ],
  },
};
