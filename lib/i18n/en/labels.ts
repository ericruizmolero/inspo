// Labels for codes that are stored in the database.
//
// Every stored code is English (migrated 2026-09-23); these are the words shown for them.
export const labels = {
  /** inspo_item.type */
  type: {
    inspiration: "Inspiration",
    videos: "Videos",
    ideas: "Ideas",
    documentaries: "Documentaries",
  },
  /** Date filter */
  date: {
    all: "All",
    thisMonth: "This month",
    thisYear: "This year",
  },
  /** "Both" is the author inherited from the sheet: not a person, "we don't know who" */
  author: {
    all: "All",
    Both: "Both",
  },
  /** activity_segment.area */
  area: {
    library: "Library",
    search: "AI search",
    "design-md": "DESIGN.md",
    comments: "Comments",
    directory: "Directory",
    add: "Add inspo",
    team: "Team",
    plans: "Plans",
    settings: "Settings",
    extension: "Browser extension",
    admin: "Activity",
    invitation: "Invitation",
  },
  /** ai_usage.action */
  action: {
    design_md: "DESIGN.md generated",
    vision: "Screenshots described",
    jev_tag: "Inspos tagged",
    jev_search: "AI searches",
    jev_directory: "Directory searches",
    explain: "Search explanations",
    revise: "DESIGN.md revisions",
    design_why: "Notes connected to the DESIGN.md",
  },
};
