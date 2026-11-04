// The readable text of each plan. Price, quotas and key live in lib/plans.ts,
// which is the source of truth: only the name and the text are here.
export const plans = {
  free: {
    name: "Free",
    tagline: "To try it out.",
    features: [
      "You and one more person",
      "1 project with up to 12 references",
      "The agent remembers what you corrected",
      "10 landing checks a month",
      "Your first criterio.md spends no AI actions",
      "30 AI actions a month",
    ],
  },
  personal: {
    name: "Personal",
    tagline: "For a designer on their own.",
    features: [
      "You and one more person",
      "Shared memory across your projects",
      "Unlimited projects and references",
      "Landing checks, fair use",
      "300 AI actions a month",
      "AI searches, fair use",
    ],
  },
  studio: {
    name: "Studio",
    tagline: "For a design or product team.",
    features: [
      "Up to 5 people",
      "Shared memory across your projects",
      "Unlimited projects and references",
      "Landing checks, fair use",
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
      "Shared memory for each client",
      "Landing checks, fair use",
      "2,000 AI actions a month",
      "AI searches, fair use",
    ],
  },
};
