// Schematic thumbnail of each app area: a mini interface drawn
// in SVG (40×28) to recognize each panel section at a glance.
// All monochrome with the theme tokens; looks the same in light and dark.
import type { ReactNode } from "react";

const ink = "var(--text-2)";
const soft = "var(--surface-3)";

const DRAWINGS: Record<string, ReactNode> = {
  // Home: three project covers, the first one open
  home: (
    <>
      <rect x="4" y="5" width="10" height="13" rx="1.5" fill={ink} />
      <rect x="4" y="20" width="7" height="2" rx="1" fill={soft} />
      <rect x="15" y="5" width="10" height="13" rx="1.5" fill={soft} />
      <rect x="15" y="20" width="7" height="2" rx="1" fill={soft} />
      <rect x="26" y="5" width="10" height="13" rx="1.5" fill={soft} />
      <rect x="26" y="20" width="7" height="2" rx="1" fill={soft} />
    </>
  ),
  // Inbox: a tray with something dropping in
  inbox: (
    <>
      <path d="M6 15h7l2 3h10l2-3h7v6.5a2.5 2.5 0 0 1-2.5 2.5h-23A2.5 2.5 0 0 1 6 21.5z" fill={soft} />
      <path d="M20 3.5v8M16.5 8.5l3.5 3.5 3.5-3.5" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Board: tiles at different heights (masonry)
  board: (
    <>
      <rect x="4" y="4" width="9" height="11" rx="1.5" fill={ink} />
      <rect x="15.5" y="4" width="9" height="7" rx="1.5" fill={soft} />
      <rect x="27" y="4" width="9" height="13" rx="1.5" fill={soft} />
      <rect x="4" y="17" width="9" height="7" rx="1.5" fill={soft} />
      <rect x="15.5" y="13" width="9" height="11" rx="1.5" fill={ink} />
      <rect x="27" y="19" width="9" height="5" rx="1.5" fill={soft} />
    </>
  ),
  // Polish: a deck of cards, the front one upright
  polish: (
    <>
      <rect x="9" y="5" width="14" height="18" rx="2" fill={soft} transform="rotate(-12 16 14)" />
      <rect x="17" y="5" width="14" height="18" rx="2" fill={soft} transform="rotate(12 24 14)" />
      <rect x="13" y="4" width="14" height="19" rx="2" fill={ink} stroke="var(--panel)" strokeWidth="1.5" />
    </>
  ),
  // System: a sea of nodes, joined
  system: (
    <>
      <path d="M10 8L20 14 30 7M20 14L12 21M20 14l10 7" stroke={soft} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="8" r="3" fill={soft} />
      <circle cx="30" cy="7" r="3" fill={soft} />
      <circle cx="12" cy="21" r="3" fill={soft} />
      <circle cx="30" cy="21" r="3" fill={soft} />
      <circle cx="20" cy="14" r="4" fill={ink} />
    </>
  ),
  // Sheet of a reference: its picture over a few lines
  sheet: (
    <>
      <rect x="11" y="3" width="18" height="22" rx="2" fill={soft} />
      <rect x="13.5" y="5.5" width="13" height="8" rx="1.2" fill={ink} />
      <rect x="13.5" y="16" width="13" height="1.5" rx=".75" fill={ink} opacity=".6" />
      <rect x="13.5" y="19.5" width="9" height="1.5" rx=".75" fill={ink} opacity=".6" />
    </>
  ),
  // Examples: a finished project in a frame
  examples: (
    <>
      <rect x="5" y="4" width="30" height="20" rx="2.5" fill={soft} />
      <rect x="5" y="4" width="30" height="4" rx="2.5" fill={ink} opacity=".5" />
      <rect x="8" y="11" width="11" height="10" rx="1.2" fill={ink} />
      <rect x="21" y="11" width="11" height="2" rx="1" fill={ink} opacity=".6" />
      <rect x="21" y="15" width="8" height="2" rx="1" fill={ink} opacity=".6" />
    </>
  ),
  // Skills: a switch turned on, with a spark
  skills: (
    <>
      <rect x="6" y="9" width="20" height="10" rx="5" fill={ink} />
      <circle cx="21" cy="14" r="3.5" fill="var(--panel)" />
      <path d="M32 6l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill={ink} />
    </>
  ),
  // Design system: swatches and a type line
  "design-system": (
    <>
      <rect x="5" y="5" width="7" height="7" rx="1.5" fill={ink} />
      <rect x="14" y="5" width="7" height="7" rx="1.5" fill={soft} />
      <rect x="23" y="5" width="7" height="7" rx="1.5" fill={soft} />
      <rect x="5" y="16" width="30" height="3" rx="1.5" fill={ink} opacity=".6" />
      <rect x="5" y="21" width="18" height="2" rx="1" fill={soft} />
    </>
  ),
  // Connector: two blocks joined by a lead
  mcp: (
    <>
      <rect x="4" y="8" width="12" height="12" rx="2.5" fill={ink} />
      <rect x="24" y="8" width="12" height="12" rx="2.5" fill={soft} />
      <path d="M16 14h8" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  // Codes from before projects, kept so an old row still has a face
  library: (
    <>
      <rect x="4" y="4" width="9" height="11" rx="1.5" fill={ink} />
      <rect x="15.5" y="4" width="9" height="7" rx="1.5" fill={soft} />
      <rect x="27" y="4" width="9" height="13" rx="1.5" fill={soft} />
      <rect x="4" y="17" width="9" height="7" rx="1.5" fill={soft} />
      <rect x="15.5" y="13" width="9" height="11" rx="1.5" fill={ink} />
      <rect x="27" y="19" width="9" height="5" rx="1.5" fill={soft} />
    </>
  ),
  // Search bar with a sparkle
  search: (
    <>
      <rect x="4" y="9" width="32" height="10" rx="5" fill={soft} />
      <circle cx="10.5" cy="14" r="2.4" fill="none" stroke={ink} strokeWidth="1.5" />
      <path d="M12.3 15.8l1.7 1.7" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M29 11l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill={ink} />
    </>
  ),
  // Document with lines of text
  "design-md": (
    <>
      <rect x="11" y="3" width="18" height="22" rx="2" fill={soft} />
      <rect x="14" y="7" width="8" height="2" rx="1" fill={ink} />
      <rect x="14" y="11" width="12" height="1.5" rx=".75" fill={ink} opacity=".6" />
      <rect x="14" y="14.5" width="12" height="1.5" rx=".75" fill={ink} opacity=".6" />
      <rect x="14" y="18" width="8" height="1.5" rx=".75" fill={ink} opacity=".6" />
    </>
  ),
  // Two speech bubbles
  comments: (
    <>
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h14A2.5 2.5 0 0 1 24 6.5v6a2.5 2.5 0 0 1-2.5 2.5H12l-4 3.5V15H7.5A2.5 2.5 0 0 1 5 12.5z" fill={ink} />
      <path d="M17 13.5h15.5A2.5 2.5 0 0 1 35 16v5.5a2.5 2.5 0 0 1-2.5 2.5H31v3l-3.5-3h-8A2.5 2.5 0 0 1 17 21.5z" fill={soft} />
    </>
  ),
  // List of links with favicon
  directory: (
    <>
      <rect x="5" y="4" width="5" height="5" rx="1.2" fill={ink} />
      <rect x="13" y="5" width="18" height="3" rx="1.5" fill={soft} />
      <rect x="5" y="11.5" width="5" height="5" rx="1.2" fill={ink} />
      <rect x="13" y="12.5" width="22" height="3" rx="1.5" fill={soft} />
      <rect x="5" y="19" width="5" height="5" rx="1.2" fill={ink} />
      <rect x="13" y="20" width="14" height="3" rx="1.5" fill={soft} />
    </>
  ),
  // Drop zone with a plus
  add: (
    <>
      <rect x="5" y="4" width="30" height="20" rx="3" fill="none" stroke={soft} strokeWidth="1.5" strokeDasharray="3 2.5" />
      <path d="M20 9.5v9M15.5 14h9" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  // Three overlapping avatars
  team: (
    <>
      <circle cx="13" cy="14" r="6.5" fill={soft} />
      <circle cx="27" cy="14" r="6.5" fill={soft} />
      <circle cx="20" cy="14" r="7" fill={ink} stroke="var(--panel)" strokeWidth="1.5" />
    </>
  ),
  // Three price columns, the middle one highlighted
  plans: (
    <>
      <rect x="4" y="9" width="9" height="15" rx="1.5" fill={soft} />
      <rect x="15.5" y="4" width="9" height="20" rx="1.5" fill={ink} />
      <rect x="27" y="9" width="9" height="15" rx="1.5" fill={soft} />
    </>
  ),
  // Column chart
  admin: (
    <>
      <rect x="5" y="16" width="5" height="8" rx="1" fill={soft} />
      <rect x="12.5" y="10" width="5" height="14" rx="1" fill={soft} />
      <rect x="20" y="13" width="5" height="11" rx="1" fill={soft} />
      <rect x="27.5" y="5" width="5" height="19" rx="1" fill={ink} />
    </>
  ),
  // Settings: three sliders at different positions
  settings: (
    <>
      <rect x="6" y="7" width="28" height="2" rx="1" fill={soft} />
      <circle cx="14" cy="8" r="3" fill={ink} />
      <rect x="6" y="14" width="28" height="2" rx="1" fill={soft} />
      <circle cx="26" cy="15" r="3" fill={ink} />
      <rect x="6" y="21" width="28" height="2" rx="1" fill={soft} />
      <circle cx="18" cy="22" r="3" fill={ink} />
    </>
  ),
  // Browser extension: a window with the toolbar button lit
  extension: (
    <>
      <rect x="4" y="4" width="32" height="20" rx="2.5" fill={soft} />
      <rect x="7" y="7" width="18" height="3" rx="1.5" fill="var(--panel)" />
      <rect x="28" y="6.5" width="5" height="4" rx="1.2" fill={ink} />
      <rect x="7" y="13" width="26" height="8" rx="1.5" fill="var(--panel)" opacity=".5" />
    </>
  ),
  // Envelope
  invitation: (
    <>
      <rect x="6" y="6" width="28" height="17" rx="2.5" fill={soft} />
      <path d="M7.5 8.5L20 16.5 32.5 8.5" fill="none" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
    </>
  ),
};

export default function AreaThumb({ area, label }: { area: string; label?: string }) {
  const drawing = DRAWINGS[area] ?? (
    <rect x="5" y="5" width="30" height="18" rx="2.5" fill={soft} />
  );
  return (
    <span className="area-thumb" data-tip={label} aria-hidden>
      <svg width="40" height="28" viewBox="0 0 40 28">{drawing}</svg>
    </span>
  );
}
