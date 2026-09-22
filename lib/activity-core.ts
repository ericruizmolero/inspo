// Tipos del panel de actividad, sin dependencias de servidor: lo importa tanto
// lib/activity.ts (BD) como app/admin/AdminPanel.tsx (cliente).
//
// Aquí no hay texto: el servidor manda códigos y fechas ISO, y el cliente los
// traduce y formatea con su idioma (t.labels.area, fmtDate).



export interface ActivityUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  workspaces: string[];
  /** Último latido (ISO) o null si nunca ha entrado con la app medida */
  lastSeenAt: string | null;
  /** Último inicio de sesión (ISO) */
  lastLoginAt: string | null;
  /** Sesiones sin caducar (cookies vivas) */
  openSessions: number;
  device: string | null;
  online: boolean;
  /** En el periodo elegido */
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
    /** Segundos totales en el periodo y media por persona activa */
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
  /** Nombre de la cuenta si ya existe en la app */
  name: string | null;
  /** Fijo por código o entorno: no se puede quitar desde el panel */
  fixed: boolean;
  addedBy: string;
  createdAt: string | null;
}
