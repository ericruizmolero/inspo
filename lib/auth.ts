// Configuración de Better Auth: entrada por magic link (sin contraseñas) o con
// Google, Apple y X, y workspaces mediante el plugin organization. Solo servidor.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, organization } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { memberLimitMessage } from "./quota";
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

// Proveedores sociales. Cada uno se activa solo si tiene sus claves en el entorno,
// así en local se puede trabajar sin ellas. La lista (SOCIAL_PROVIDERS) la usa /login
// para pintar únicamente los botones que funcionan.
export type SocialProvider = "google" | "apple" | "twitter";
const env = (k: string) => (process.env[k] || "").trim();
const socialProviders = {
  ...(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET") ? {
    google: { clientId: env("GOOGLE_CLIENT_ID"), clientSecret: env("GOOGLE_CLIENT_SECRET") },
  } : {}),
  // Apple: clientId es el Services ID (web) y clientSecret un JWT firmado con la clave .p8
  // (caduca a los 6 meses; se regenera con `npm run apple:secret`). appBundleIdentifier solo
  // hace falta si además entra gente desde una app nativa.
  ...(env("APPLE_CLIENT_ID") && env("APPLE_CLIENT_SECRET") ? {
    apple: {
      clientId: env("APPLE_CLIENT_ID"),
      clientSecret: env("APPLE_CLIENT_SECRET"),
      ...(env("APPLE_APP_BUNDLE_IDENTIFIER") ? { appBundleIdentifier: env("APPLE_APP_BUNDLE_IDENTIFIER") } : {}),
    },
  } : {}),
  // X (Twitter): OAuth 2.0 con PKCE. El correo solo llega si la app tiene el permiso
  // "users.email"; si no, Better Auth crea uno de relleno y no se enlaza con cuentas previas.
  ...(env("TWITTER_CLIENT_ID") && env("TWITTER_CLIENT_SECRET") ? {
    twitter: { clientId: env("TWITTER_CLIENT_ID"), clientSecret: env("TWITTER_CLIENT_SECRET") },
  } : {}),
};
export const SOCIAL_PROVIDERS = Object.keys(socialProviders) as SocialProvider[];

export const auth = betterAuth({
  appName: "Inspo",
  baseURL: APP_URL || undefined,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  trustedOrigins: (request) => {
    // Apple devuelve el código por POST (form_post) desde su dominio, así que hay que confiar en él
    const fixed = [APP_URL, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "", "https://appleid.apple.com"].filter(Boolean);
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
  socialProviders,
  account: {
    // Quien entró por magic link puede entrar luego con Google o Apple con el mismo correo:
    // se enlaza a la cuenta existente. X no va en la lista porque no siempre verifica el correo.
    accountLinking: { enabled: true, trustedProviders: ["google", "apple"] },
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
        // Cuota de personas del plan: se comprueba al invitar y al aceptar
        async beforeCreateInvitation({ invitation, organization: org }) {
          const msg = await memberLimitMessage(invitation.organizationId, planFromOrg(org));
          if (msg) throw new APIError("FORBIDDEN", { message: msg });
        },
        async beforeAddMember({ member, organization: org }) {
          if (member.role === "owner") return; // creador del workspace
          const msg = await memberLimitMessage(member.organizationId, planFromOrg(org));
          if (msg) throw new APIError("FORBIDDEN", { message: msg });
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

function planFromOrg(org: { metadata?: unknown }): string | null {
  const m = org.metadata;
  if (m && typeof m === "object") return (m as { plan?: string }).plan ?? null;
  if (typeof m === "string") { try { return JSON.parse(m)?.plan ?? null; } catch { return null; } }
  return null;
}
