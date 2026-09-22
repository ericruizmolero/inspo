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
};

export function sectionIcon(name: string) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
