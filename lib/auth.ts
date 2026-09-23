// Better Auth config: sign-in by magic link (no passwords) or with
// Google, Apple and X, and workspaces via the organization plugin. Server only.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, organization, lastLoginMethod } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { memberLimitMessage, memberRank } from "./quota";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "./db";
import { sendMail, magicLinkMail, invitationMail, localeForEmail } from "./mail";
import { LANG_COOKIE, isLocale, DEFAULT_LOCALE, type Locale } from "./i18n/locale";
import { getErrors } from "./i18n";
import { planOf } from "./plans";
import { eq } from "drizzle-orm";

const IS_PROD = process.env.NODE_ENV === "production";

// Dev auto-login: with DEV_LOGIN_EMAIL set (and never in production) you sign in
// as that user without going through email. See app/api/dev-login/route.ts.
export const DEV_LOGIN_EMAIL = IS_PROD ? "" : (process.env.DEV_LOGIN_EMAIL || "").trim().toLowerCase();

// The magic link for the DEV_LOGIN_EMAIL user isn't sent: it's stored here and /api/dev-login picks it up.
const g = globalThis as { __inspoDevLink?: string };
export function takeDevLink(): string | undefined {
  const url = g.__inspoDevLink;
  g.__inspoDevLink = undefined;
  return url;
}

// Public app URL. In production it's set with BETTER_AUTH_URL (or Vercel's);
// in development it's left empty and Better Auth infers it from each request (the Ship
// Studio preview uses a different port every time).
export const APP_URL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

// Public origin of the request. In development the Ship Studio preview acts as a proxy
// (e.g. localhost:49970 → localhost:3837), so we prefer the Origin header.
const originOf = (headers?: Headers | null, request?: Request) => {
  const fromOrigin = headers?.get("origin") || request?.headers.get("origin") || "";
  if (fromOrigin) return fromOrigin;
  try { return request ? new URL(request.url).origin : ""; } catch { return ""; }
};

// Rewrites the origin of a Better Auth link with the public one (development only).
// The preview proxy rewrites Host/Origin, so the only reliable hint of the public origin
// is the absolute callbackURL the client sends (see app/login/LoginForm.tsx).
const publicLink = (url: string, callbackURL?: string, headers?: Headers | null, request?: Request) => {
  if (IS_PROD || APP_URL) return url;
  let origin = "";
  try { if (callbackURL && /^https?:\/\//.test(callbackURL)) origin = new URL(callbackURL).origin; } catch { /* relative */ }
  origin ||= originOf(headers, request);
  if (!origin) return url;
  try { const u = new URL(url); return origin + u.pathname + u.search; } catch { return url; }
};

// Social providers. Each one is enabled only if its keys are in the env,
// so you can work locally without them. /login uses the list (SOCIAL_PROVIDERS)
// to render only the buttons that work.
export type SocialProvider = "google" | "apple" | "twitter";
const env = (k: string) => (process.env[k] || "").trim();
const socialProviders = {
  ...(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET") ? {
    google: { clientId: env("GOOGLE_CLIENT_ID"), clientSecret: env("GOOGLE_CLIENT_SECRET") },
  } : {}),
  // Apple: clientId is the Services ID (web) and clientSecret a JWT signed with the .p8 key
  // (expires after 6 months; regenerate with `npm run apple:secret`). appBundleIdentifier is only
  // needed if people also sign in from a native app.
  ...(env("APPLE_CLIENT_ID") && env("APPLE_CLIENT_SECRET") ? {
    apple: {
      clientId: env("APPLE_CLIENT_ID"),
      clientSecret: env("APPLE_CLIENT_SECRET"),
      ...(env("APPLE_APP_BUNDLE_IDENTIFIER") ? { appBundleIdentifier: env("APPLE_APP_BUNDLE_IDENTIFIER") } : {}),
    },
  } : {}),
  // X (Twitter): OAuth 2.0 with PKCE. The email only arrives if the app has the
  // "users.email" permission; otherwise Better Auth creates a placeholder and doesn't link to existing accounts.
  ...(env("TWITTER_CLIENT_ID") && env("TWITTER_CLIENT_SECRET") ? {
    twitter: { clientId: env("TWITTER_CLIENT_ID"), clientSecret: env("TWITTER_CLIENT_SECRET") },
  } : {}),
};
export const SOCIAL_PROVIDERS = Object.keys(socialProviders) as SocialProvider[];

/** Language from the request cookie, for when the email recipient has no account. */
function localeFromCookie(headers: Headers | null | undefined): Locale {
  const raw = headers?.get("cookie") ?? "";
  const m = new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]+)`).exec(raw);
  return isLocale(m?.[1]) ? m[1] : DEFAULT_LOCALE;
}

/** A user's saved language by id. For the invitation email: the inviter's. */
async function localeOfUser(userId: string): Promise<Locale> {
  const [row] = await db.select({ language: schema.user.language }).from(schema.user).where(eq(schema.user.id, userId)).limit(1);
  return isLocale(row?.language) ? row.language : DEFAULT_LOCALE;
}

export const auth = betterAuth({
  appName: "criterio.design",
  baseURL: APP_URL || undefined,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  trustedOrigins: (request) => {
    // Apple returns the code by POST (form_post) from its domain, so it must be trusted
    const fixed = [APP_URL, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "", "https://appleid.apple.com"].filter(Boolean);
    // In development we trust the requesting origin (the preview's localhost:<port>)
    // In development we trust any local port (the preview changes port)
    const dyn = !IS_PROD ? ["http://localhost:*", "http://127.0.0.1:*", originOf(request?.headers, request)].filter(Boolean) : [];
    return [...fixed, ...dyn];
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  socialProviders,
  account: {
    // Someone who signed in by magic link can later sign in with Google or Apple with the same email:
    // it links to the existing account. X isn't in the list because it doesn't always verify the email.
    accountLinking: { enabled: true, trustedProviders: ["google", "apple"] },
  },
  user: {
    // Nobody has a password; the name is filled from the email when the user is created
    additionalFields: {
      // The person's language: decides which language their emails are written in.
      // Written by setLanguage (app/actions/library.ts), never by the client directly.
      language: { type: "string", required: false, defaultValue: "en", input: false },
    },
  },
  plugins: [
    lastLoginMethod(),
    magicLink({
      expiresIn: 60 * 10,
      async sendMagicLink({ email, url }, ctx) {
        if (DEV_LOGIN_EMAIL && email.toLowerCase() === DEV_LOGIN_EMAIL) { g.__inspoDevLink = url; return; }
        const callbackURL = (ctx?.body as { callbackURL?: string } | undefined)?.callbackURL;
        // If the address already has an account, its language; otherwise that of the requesting tab
        const locale = await localeForEmail(email, localeFromCookie(ctx?.headers ?? ctx?.request?.headers));
        const m = magicLinkMail(publicLink(url, callbackURL, ctx?.headers, ctx?.request), email, locale);
        await sendMail(email, m.subject, m.html, m.text);
      },
    }),
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      invitationExpiresIn: 60 * 60 * 24 * 7,
      cancelPendingInvitationsOnReInvite: true,
      // The email doesn't decide whether the invitation is valid: the row already exists and the link works.
      // If Resend fails, log it and move on; the members settings can copy the link or resend.
      async sendInvitationEmail(data, request) {
        const base = APP_URL || originOf(request?.headers, request) || "http://localhost:3000";
        const inviter = data.inviter.user;
        // The case that always slips through: the invitee may not have an account
        // yet, so there's no language to look up. The inviter's is used, as the
        // best hint there is, and it's put on the URL itself so the accept screen
        // shows in the same language as the email.
        const locale = await localeForEmail(data.email, await localeOfUser(inviter.id));
        const url = `${base}/invite/${data.id}?lang=${locale}`;
        const m = invitationMail(url, data.organization.name, inviter.name || inviter.email, inviter.email, data.email, locale);
        try {
          await sendMail(data.email, m.subject, m.html, m.text);
        } catch (e) {
          console.error(`[invite] could not send the email to ${data.email}:`, e);
        }
      },
      organizationHooks: {
        // Everything created from the UI is a team; lib/workspace.ts creates the personal ones
        async beforeCreateOrganization({ organization: org }) {
          return { data: { ...org, metadata: { kind: "team", ...(org.metadata ?? {}) } } };
        },
        // Plan seat quota: checked on invite and on accept.
        // On invite, unaccepted invitations count too, except the one for this
        // same address: re-inviting replaces the pending one instead of adding to it.
        async beforeCreateInvitation({ invitation, organization: org }) {
          const msg = await memberLimitMessage(invitation.organizationId, planFromOrg(org), { includePending: true, exceptEmail: invitation.email });
          if (msg) throw new APIError("FORBIDDEN", { message: msg });
        },
        // Direct member add (not by invitation): counts members only
        async beforeAddMember({ member, organization: org }) {
          if (member.role === "owner") return; // workspace creator
          const msg = await memberLimitMessage(member.organizationId, planFromOrg(org));
          if (msg) throw new APIError("FORBIDDEN", { message: msg });
        },
        // Accepting an invitation does NOT go through beforeAddMember: Better Auth uses these two
        // hooks for that path. Only members count here, because the pending invitation
        // becomes the member who joins.
        async beforeAcceptInvitation({ invitation, organization: org }) {
          const msg = await memberLimitMessage(invitation.organizationId, planFromOrg(org));
          if (msg) throw new APIError("FORBIDDEN", { message: msg });
        },
        // Two people can accept the last seat at once: both pass the check above
        // before either gets inserted. Better Auth does the insert, so we can't put
        // it in the same transaction; it's checked afterwards and the extra one is
        // removed, always the last by join order.
        // ponytail: compensating check, not a transaction. If the insert ever moves
        // to our own code, replace this with a db.transaction() and delete it.
        async afterAcceptInvitation({ invitation, member, organization: org }) {
          const plan = planOf(planFromOrg(org));
          if (plan.members === null) return;
          const rank = await memberRank(member.organizationId, member.id);
          if (rank < plan.members) return; // the first ones within the plan always stay
          await db.delete(schema.member).where(eq(schema.member.id, member.id));
          // The invitation goes back to pending: the link still works once there's room
          await db.update(schema.invitation).set({ status: "pending" }).where(eq(schema.invitation.id, invitation.id));
          throw new APIError("FORBIDDEN", {
            message: (await getErrors()).seatTaken,
          });
        },
      },
    }),
    nextCookies(), // must be last
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
