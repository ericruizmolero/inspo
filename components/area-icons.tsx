// The eight areas of the system, one drawing each: 16px, 1.5 stroke, the same hand as the rest of
// the app's icons. Wherever an area is named (a node, a tile, the "to the system" menu) its icon goes first.
import type { ReactNode } from "react";
import type { SystemArea } from "@/types/system";

const PATHS: Record<SystemArea, ReactNode> = {
  // A capital with its serifs
  typography: <path d="M3.5 5V3.5h9V5M8 3.5v9M6.5 12.5h3" />,
  // A drop of ink
  color: <path d="M8 2.3c2.5 2.7 4 4.8 4 6.9a4 4 0 01-8 0c0-2.1 1.5-4.2 4-6.9z" />,
  // A page split in header, side and body
  layout: <><rect x="2.5" y="2.5" width="11" height="11" rx="2.5" /><path d="M2.5 6.5h11M6.5 6.5v7" /></>,
  // Something that moves and the trail it leaves
  motion: <><circle cx="10.5" cy="8" r="3.5" /><path d="M2.5 5.5H5M1.5 8h2.8M2.5 10.5H5" /></>,
  // The three shapes every icon set starts from
  iconography: <><path d="M8 2.3l2.8 4.7H5.2z" /><rect x="2.5" y="9.2" width="4.6" height="4.6" rx="1" /><circle cx="11.3" cy="11.5" r="2.4" /></>,
  // The registered mark
  logo: <><circle cx="8" cy="8" r="5.75" /><path d="M6.5 10.6V5.4h1.8a1.5 1.5 0 010 3H6.5M8.5 8.5l1.4 2.1" /></>,
  // A picture: sun and hills in a frame
  imagery: <><rect x="2.5" y="3" width="11" height="10" rx="2" /><circle cx="6" cy="6.4" r="1" /><path d="M2.8 11.2l3-2.8 2.5 2.3 1.8-1.6 3.1 2.8" /></>,
  // Quotation marks: what the brand says and how
  voice: <><path d="M6.4 7.9H2.8V4.5h3.6v4.6c0 1.4-.8 2.3-2.2 2.6" /><path d="M13 7.9H9.4V4.5H13v4.6c0 1.4-.8 2.3-2.2 2.6" /></>,
};

/** `size` in px: 16 in menus, 12 next to the small mono labels of nodes and tiles */
export function areaIcon(area: SystemArea, size = 16) {
  return (
    <svg className="area-icon" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[area]}
    </svg>
  );
}
