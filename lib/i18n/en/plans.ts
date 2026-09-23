// The readable text of each plan. Price, quotas and key live in lib/plans.ts,
// which is the source of truth: only the text is here.
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
  agency: {
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
