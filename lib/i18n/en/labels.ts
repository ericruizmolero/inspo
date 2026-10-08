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
  /** activity_segment.area: the places of the interface, named as the interface names them (lib/activity.ts
   *  folds the codes from before projects, "library" and "design-md", into "board" and "sheet") */
  area: {
    home: "Home",
    inbox: "Inbox",
    board: "Board",
    polish: "Polish",
    system: "System",
    sheet: "Reference sheet",
    search: "Search",
    directory: "Resources",
    examples: "Examples",
    skills: "Skills",
    add: "Add",
    comments: "Comments",
    team: "Team",
    plans: "Plans",
    settings: "Settings",
    extension: "Browser extension",
    admin: "Activity",
    invitation: "Invitation",
    "design-system": "Design system",
    mcp: "Connector",
  },
  /** ai_usage.action */
  action: {
    design_md: "Sheets generated (DESIGN.md)",
    vision: "Screenshots described",
    jev_tag: "Inspos tagged",
    jev_search: "AI searches",
    jev_directory: "Directory searches",
    explain: "Search explanations",
    revise: "Sheet revisions",
    design_why: "Notes connected to the sheet",
    polish: "Boards polished",
    auto_tag: "Inspos tagged",
    query_en: "Searches translated",
    embed: "Search by meaning",
    system: "Systems built",
    brand: "Brand values",
  },
};
