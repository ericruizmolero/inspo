// Activity panel types, with no server dependencies: imported by both
// lib/activity.ts (DB) and app/admin/AdminPanel.tsx (client).
//
// No text here: the server sends codes and ISO dates, and the client
// translates and formats them in its language (t.labels.area, fmtDate).



export interface ActivityUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  workspaces: string[];
  /** Last heartbeat (ISO), or null if never seen with the tracked app */
  lastSeenAt: string | null;
  /** Last sign-in (ISO) */
  lastLoginAt: string | null;
  /** Unexpired sessions (live cookies) */
  openSessions: number;
  device: string | null;
  online: boolean;
  /** In the chosen period */
  seconds: number;
  visits: number;
  topArea: string | null;
}

export interface ActivityDay { date: string; users: number; seconds: number }
export interface ActivityArea { area: string; seconds: number; users: number }
export interface ActivityLogin { userId: string; name: string; email: string; image: string | null; at: string; device: string | null; alive: boolean }

export interface ActivityOverview {
  days: number;
  generatedAt: string;
  kpis: {
    online: number;
    activeToday: number;
    active7: number;
    active30: number;
    loggedIn: number;
    totalUsers: number;
    newUsers: number;
    /** Total seconds in the period and average per active person */
    seconds: number;
    avgSeconds: number;
  };
  daily: ActivityDay[];
  areas: ActivityArea[];
  users: ActivityUser[];
  logins: ActivityLogin[];
}

export interface AdminEntry {
  email: string;
  /** Account name if it already exists in the app */
  name: string | null;
  /** Fixed by code or env: cannot be removed from the panel */
  fixed: boolean;
  addedBy: string;
  createdAt: string | null;
}
