// 16px, 1.5 stroke: the same drawing as the rest of the app's icons
import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  back: <path d="M9.5 3.5L5 8l4.5 4.5" />,
  account: <><circle cx="8" cy="5.5" r="2.5" /><path d="M3 13.5c.6-2.4 2.6-3.8 5-3.8s4.4 1.4 5 3.8" /></>,
  workspace: <><rect x="2.5" y="2.5" width="11" height="11" rx="2.5" /><path d="M2.5 6.5h11" /></>,
  members: <><circle cx="6" cy="6" r="2.2" /><path d="M2 13c.5-2 2-3.2 4-3.2s3.5 1.2 4 3.2" /><path d="M10.5 3.9a2.2 2.2 0 010 4.2M12 9.9c1 .5 1.7 1.6 2 3.1" /></>,
  plan: <><path d="M2.5 13.5h11" /><path d="M4.5 11V8M8 11V4.5M11.5 11V6.5" /></>,
  extension: <><path d="M6 2.5h4v2a1.5 1.5 0 003 0" /><rect x="2.5" y="4.5" width="9" height="9" rx="2" /></>,
  overview: <path d="M1.8 8.5h2.6l2-5 3.2 9 2-4h2.6" />,
  usage: <><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3l2 1.5" /></>,
  people: <><circle cx="6" cy="6" r="2.2" /><path d="M2 13c.5-2 2-3.2 4-3.2s3.5 1.2 4 3.2" /><path d="M10.5 3.9a2.2 2.2 0 010 4.2M12 9.9c1 .5 1.7 1.6 2 3.1" /></>,
  feedback: <path d="M3 3.5h10a1 1 0 011 1v6a1 1 0 01-1 1H7l-3 2.5v-2.5H3a1 1 0 01-1-1v-6a1 1 0 011-1z" />,
  access: <><rect x="3" y="7" width="10" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" /></>,
  // Design system: a spark of taste, a swatch, a part, a repeat, a bracket, a dated page
  principles: <path d="M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3M4.2 4.2l1.8 1.8M10 10l1.8 1.8M11.8 4.2L10 6M6 10l-1.8 1.8" />,
  foundations: <><rect x="2.5" y="2.5" width="5" height="5" rx="1.2" /><rect x="8.5" y="2.5" width="5" height="5" rx="1.2" /><rect x="2.5" y="8.5" width="5" height="5" rx="1.2" /><circle cx="11" cy="11" r="2.5" /></>,
  components: <><rect x="2.5" y="5" width="11" height="6" rx="3" /><circle cx="10.5" cy="8" r="1.5" /></>,
  patterns: <><path d="M2.5 5.5h4v4h-4zM9.5 6.5h4v4h-4z" /><path d="M6.5 7.5h3" /></>,
  keyboard: <><rect x="1.8" y="4" width="12.4" height="8" rx="2" /><path d="M4.5 6.8h.01M7 6.8h.01M9.5 6.8h.01M12 6.8h-.5M5 9.5h6" /></>,
  layout: <><rect x="2.5" y="2.5" width="11" height="11" rx="2.5" /><path d="M2.5 6.5h11M6.5 6.5v7" /></>,
  language: <><circle cx="8" cy="8" r="5.5" /><path d="M2.5 8h11M8 2.5c1.6 1.6 2.3 3.4 2.3 5.5S9.6 11.9 8 13.5C6.4 11.9 5.7 10.1 5.7 8S6.4 4.1 8 2.5z" /></>,
  page: <><path d="M4 2.5h5l3 3v8H4z" /><path d="M9 2.5v3h3" /></>,
  check: <><circle cx="8" cy="8" r="5.5" /><path d="M5.6 8.2l1.7 1.7 3.2-3.5" /></>,
  code: <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" />,
  decisions: <><rect x="3" y="2.5" width="10" height="11" rx="2" /><path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" /></>,
  // The library's token pages
  color: <><circle cx="8" cy="8" r="5.5" /><path d="M8 2.5a5.5 5.5 0 010 11z" fill="currentColor" stroke="none" /></>,
  type: <path d="M3 4.5V3h10v1.5M8 3v10M6 13h4" />,
  spacing: <><path d="M2.5 3v10M13.5 3v10" /><path d="M5 8h6M5 8l1.5-1.5M5 8l1.5 1.5M11 8l-1.5-1.5M11 8l-1.5 1.5" /></>,
  radius: <path d="M2.5 13.5V8a5.5 5.5 0 015.5-5.5h5.5" />,
  motion: <><path d="M2.5 12c3-9 8-9 11 0" /><circle cx="13.5" cy="12" r="1.2" fill="currentColor" stroke="none" /></>,
  icons: <><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1.2" /><circle cx="11.25" cy="4.75" r="2.25" /><path d="M2.5 13.5l2.25-4 2.25 4z" /><path d="M9.5 9.5h3.5v3.5h-3.5z" /></>,
  button: <><rect x="1.8" y="4.5" width="12.4" height="7" rx="3.5" /><path d="M5.5 8h5" /></>,
  brand: <><circle cx="8" cy="9" r="4.5" /><circle cx="6.3" cy="8.5" r=".6" fill="currentColor" stroke="none" /><circle cx="9.7" cy="8.5" r=".6" fill="currentColor" stroke="none" /><circle cx="8" cy="10.8" r=".6" fill="currentColor" stroke="none" /><path d="M6 4.8L4.5 2.5M10 4.8l1.5-2.3" /></>,
};

/** Every section icon, for the library's Iconos page */
export const SECTION_ICON_NAMES = Object.keys(PATHS);

export function sectionIcon(name: string) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
