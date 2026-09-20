// Configuración de Better Auth: entrada por magic link (sin contraseñas) y
// workspaces mediante el plugin organization. Solo servidor.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "./db";
import { sendMail, magicLinkMail, invitationMail } from "./mail";

const IS_PROD = process.env.NODE_ENV === "production";

// Auto-login en desarrollo: con DEV_LOGIN_EMAIL definido (y nunca en producción) se entra
// como ese usuario sin pasar por el correo. Ver app/api/dev-login/route.ts.
export const DEV_LOGIN_EMAIL = IS_PROD ? "" : (process.env.DEV_LOGIN_EMAIL || "").trim().toLowerCase();

// El magic link del usuario de DEV_LOGIN_EMAIL no se envía: se guarda aquí y lo recoge /api/dev-login.
const g = globalThis as { __inspoDevLink?: string };
export function takeDevLink(): string | undefined {
  const url = g.__inspoDevLink;
  g.__inspoDevLink = undefined;
  return url;
}

// URL pública de la app. En producción se fija con BETTER_AUTH_URL (o la de Vercel);
// en desarrollo se deja vacía y Better Auth la deduce de cada petición (el preview
// de Ship Studio usa un puerto distinto cada vez).
export const APP_URL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

// Origen público de la petición. En desarrollo el preview de Ship Studio hace de proxy
// (p. ej. localhost:49970 → localhost:3837), así que priorizamos la cabecera Origin.
const originOf = (headers?: Headers | null, request?: Request) => {
  const fromOrigin = headers?.get("origin") || request?.headers.get("origin") || "";
  if (fromOrigin) return fromOrigin;
  try { return request ? new URL(request.url).origin : ""; } catch { return ""; }
};

// Reescribe el origen de un enlace generado por Better Auth con el público (solo en desarrollo).
// El proxy del preview reescribe Host/Origin, así que la única pista fiable del origen público
// es la callbackURL absoluta que manda el cliente (ver app/login/LoginForm.tsx).
const publicLink = (url: string, callbackURL?: string, headers?: Headers | null, request?: Request) => {
  if (IS_PROD || APP_URL) return url;
  let origin = "";
  try { if (callbackURL && /^https?:\/\//.test(callbackURL)) origin = new URL(callbackURL).origin; } catch { /* relativa */ }
  origin ||= originOf(headers, request);
  if (!origin) return url;
  try { const u = new URL(url); return origin + u.pathname + u.search; } catch { return url; }
};

export const auth = betterAuth({
  appName: "Inspo",
  baseURL: APP_URL || undefined,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  trustedOrigins: (request) => {
    const fixed = [APP_URL, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""].filter(Boolean);
    // En desarrollo confiamos en el origen que hace la petición (localhost:<puerto> del preview)
    // En desarrollo confiamos en cualquier puerto local (el preview cambia de puerto)
    const dyn = !IS_PROD ? ["http://localhost:*", "http://127.0.0.1:*", originOf(request?.headers, request)].filter(Boolean) : [];
    return [...fixed, ...dyn];
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  user: {
    // Nadie tiene contraseña; el nombre se rellena desde el correo al crear el usuario
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 10,
      async sendMagicLink({ email, url }, ctx) {
        if (DEV_LOGIN_EMAIL && email.toLowerCase() === DEV_LOGIN_EMAIL) { g.__inspoDevLink = url; return; }
        const callbackURL = (ctx?.body as { callbackURL?: string } | undefined)?.callbackURL;
        const m = magicLinkMail(publicLink(url, callbackURL, ctx?.headers, ctx?.request));
        await sendMail(email, m.subject, m.html, m.text);
      },
    }),
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      invitationExpiresIn: 60 * 60 * 24 * 7,
      cancelPendingInvitationsOnReInvite: true,
      async sendInvitationEmail(data, request) {
        const base = APP_URL || originOf(request?.headers, request) || "http://localhost:3000";
        const url = `${base}/invitacion/${data.id}`;
        const m = invitationMail(url, data.organization.name, data.inviter.user.name || data.inviter.user.email);
        await sendMail(data.email, m.subject, m.html, m.text);
      },
      organizationHooks: {
        // Todo lo que se crea desde la UI es un equipo; los personales los crea lib/workspace.ts
        async beforeCreateOrganization({ organization: org }) {
          return { data: { ...org, metadata: { kind: "team", ...(org.metadata ?? {}) } } };
        },
      },
    }),
    nextCookies(), // debe ir el último
  ],
  databaseHooks: {
    user: {
      create: {
        async before(u) {
          const name = (u.name && u.name.trim()) || u.email.split("@")[0];
          return { data: { ...u, name } };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
