// Every email Criterio sends is a Resend template, one per language, named criterio-<key>-<locale>. The wording of
// a template lives in Resend and is edited there; this registry holds only what the code must agree on: each
// template's variables and whether its foot carries a stop link. An email built in code (a list, real branching)
// goes through the letter template, whose body the code fills with the blocks of lib/mail-layout.ts.
//
// A variable carries data (a name, a date, a link, a count), never a sentence. A small branch in the wording is
// two templates, not a phrase passed in. Resend keeps some names for itself (EMAIL, FIRST_NAME, LAST_NAME,
// UNSUBSCRIBE_URL, RESEND_UNSUBSCRIBE_URL): hence YOUR_EMAIL and STOP_URL.
//
// Pure: the app and scripts/mail-templates.ts both read it.
import type { Locale } from "./i18n/locale";
import { escapeHtml, type Body, type Html, type Stop } from "./mail-layout";

/**
 * How a variable goes in. `text` is someone's words or a link, escaped for the HTML; `number` a count; `html` a body
 * built from the blocks; `raw` plain text that never lands in the HTML (the letter's subject and text part).
 */
type Kind = "text" | "number" | "html" | "raw";
interface Spec { vars: Record<string, Kind>; stop?: Stop }

export const TEMPLATES = {
  "magic-link": { vars: { URL: "text" } },
  invitation: { vars: { INVITER: "text", WHO: "text", TEAM: "text", INVITEE: "text", URL: "text" } },
  "personal-invite": { vars: { INVITER: "text", WHO: "text", INVITEE: "text", URL: "text" } },
  "admin-access": { vars: { GRANTER: "text", URL: "text" } },
  "on-the-list": { vars: { YOUR_EMAIL: "text" } },
  "access-invite": { vars: { YOUR_EMAIL: "text", URL: "text" } },

  "member-joined": { vars: { WHO: "text", TEAM: "text", URL: "text" } },
  "member-invite-ending": { vars: { INVITER: "text", TEAM: "text", INVITEE: "text", URL: "text" } },
  "member-now-admin": { vars: { WHO: "text", TEAM: "text", URL: "text" } },
  "member-now-member": { vars: { WHO: "text", TEAM: "text", URL: "text" } },
  "member-removed": { vars: { WHO: "text", TEAM: "text" } },
  "member-now-owner": { vars: { WHO: "text", TEAM: "text", URL: "text" } },
  "team-deleted": { vars: { WHO: "text", TEAM: "text" } },
  "over-capacity": { vars: { TEAM: "text", PLAN: "text", MEMBERS: "number", LIMIT: "number", URL: "text" } },

  "share-invite": { vars: { WHO: "text", PROJECT: "text", URL: "text" } },
  "client-answers-one": { vars: { PROJECT: "text", URL: "text" } },
  "client-answers": { vars: { PROJECT: "text", COUNT: "number", URL: "text" } },
  reply: { vars: { WHO: "text", MINE: "text", THEIRS: "text", URL: "text" }, stop: "team" },
  "proposal-accepted": { vars: { WHO: "text", AREA: "text", PROJECT: "text", DECISION: "text", URL: "text" }, stop: "team" },
  "proposal-declined": { vars: { WHO: "text", AREA: "text", PROJECT: "text", DECISION: "text", URL: "text" }, stop: "team" },
  paused: { vars: { URL: "text" }, stop: "team" },

  welcome: { vars: { URL: "text", GOAL: "number" } },
  "nudge-project": { vars: { URL: "text" }, stop: "account" },
  "nudge-refs-empty": { vars: { URL: "text", GOAL: "number" }, stop: "account" },
  "nudge-refs": { vars: { URL: "text", REFS: "number", GOAL: "number" }, stop: "account" },
  "nudge-polish": { vars: { URL: "text" }, stop: "account" },
  "nudge-out": { vars: { URL: "text" }, stop: "account" },
  "extension-link": { vars: { URL: "text" } },
  "connect-agent": { vars: { ADDRESS: "text", URL: "text" }, stop: "account" },
  "win-back": { vars: { PROJECT: "text", URL: "text" }, stop: "account" },

  "fair-use": { vars: { ACCOUNT: "text", PLAN: "text", USED: "text", CEILING: "text" } },
  "plan-requested": { vars: { PLAN: "text", PERIOD: "text", ACCOUNT: "text" } },
  "plan-on": { vars: { PLAN: "text", ACCOUNT: "text", URL: "text" } },
  "plan-on-until": { vars: { PLAN: "text", ACCOUNT: "text", UNTIL: "text", URL: "text" } },
  "plan-down": { vars: { PLAN: "text", ACCOUNT: "text", URL: "text" } },
  "plan-down-vault": { vars: { PLAN: "text", ACCOUNT: "text", URL: "text" } },
  "gift-ends": { vars: { PLAN: "text", ACCOUNT: "text", UNTIL: "text", URL: "text" } },
  "gift-ended": { vars: { PLAN: "text", ACCOUNT: "text", URL: "text" } },
  "gift-ended-vault": { vars: { PLAN: "text", ACCOUNT: "text", URL: "text" } },
  "let-go": { vars: { WORKSPACE: "text", ACCOUNT: "text", URL: "text" } },
  "let-go-vault": { vars: { WORKSPACE: "text", ACCOUNT: "text", URL: "text" } },
  "account-deleted": { vars: { YOUR_EMAIL: "text" } },

  letter: { vars: { SUBJECT: "raw", BODY: "html", BODY_TEXT: "raw" } },
  "letter-team": { vars: { SUBJECT: "raw", BODY: "html", BODY_TEXT: "raw" }, stop: "team" },
  "letter-vault": { vars: { SUBJECT: "raw", BODY: "html", BODY_TEXT: "raw" }, stop: "vault" },
} as const satisfies Record<string, Spec>;

export type TemplateKey = keyof typeof TEMPLATES;
export const TEMPLATE_KEYS = Object.keys(TEMPLATES) as TemplateKey[];
/** The templates whose body the code writes */
export const LETTERS = ["letter", "letter-team", "letter-vault"] as const satisfies TemplateKey[];

type KindType = { text: string; number: number; html: Html; raw: string };
type StopOf<K extends TemplateKey> = (typeof TEMPLATES)[K] extends { stop: infer S extends Stop } ? S : null;
/** What the foot needs: the stop link, and for a team email the team's name in its why-line */
type StopVars<S> = S extends "team" ? { TEAM: string; STOP_URL: string } : S extends Stop ? { STOP_URL: string } : unknown;
type VarsSpec<K extends TemplateKey> = (typeof TEMPLATES)[K]["vars"];
type OwnVars<K extends TemplateKey> = { -readonly [V in keyof VarsSpec<K>]: VarsSpec<K>[V] extends Kind ? KindType[VarsSpec<K>[V]] : never };
export type Vars<K extends TemplateKey> = OwnVars<K> & StopVars<StopOf<K>>;

/** One email, in the recipient's language: a template and its variables */
export type Mail = { [K in TemplateKey]: { template: K; locale: Locale; vars: Vars<K> } }[TemplateKey];

export const mail = <K extends TemplateKey>(template: K, locale: Locale, vars: Vars<K>): Mail => ({ template, locale, vars }) as unknown as Mail;

/** An email built in code: its subject and body in the shared layout, with a team's or the Vault's stop link if it has one */
export function letter(locale: Locale, subject: string, body: Body, foot?: { team: string; stopUrl: string } | { vault: true; stopUrl: string }): Mail {
  const own = { SUBJECT: subject, BODY: body.html, BODY_TEXT: body.text };
  if (!foot) return mail("letter", locale, own);
  return "team" in foot ? mail("letter-team", locale, { ...own, TEAM: foot.team, STOP_URL: foot.stopUrl }) : mail("letter-vault", locale, { ...own, STOP_URL: foot.stopUrl });
}

export const aliasOf = (key: TemplateKey, locale: Locale) => `criterio-${key}-${locale}`;

export const stopOf = (key: TemplateKey): Stop | undefined => (TEMPLATES[key] as Spec).stop;

/** Every variable a template takes, its own and the layout's (GREETING always; the foot's when it has a stop link) */
export function variablesOf(key: TemplateKey): Record<string, Kind> {
  const stop = stopOf(key);
  return { ...TEMPLATES[key].vars, GREETING: "text", ...(stop ? { STOP_URL: "text" } : {}), ...(stop === "team" ? { TEAM: "text" } : {}) };
}

/**
 * The variables as Resend takes them, checked against the registry: a missing, extra or mistyped one throws here
 * rather than going out as a blank in someone's inbox.
 */
export function resendVariables(m: Mail, greeting: string): Record<string, string | number> {
  const want = variablesOf(m.template);
  const given: Record<string, unknown> = { ...m.vars, GREETING: greeting };
  const wrong = [...Object.keys(want).filter((k) => typeof given[k] !== (want[k] === "number" ? "number" : "string")), ...Object.keys(given).filter((k) => !(k in want))];
  if (wrong.length) throw new Error(`Mail ${m.template}: variables missing, extra or of the wrong type: ${wrong.join(", ")}`);
  return Object.fromEntries(Object.entries(want).map(([k, kind]) => [k, kind === "text" ? escapeHtml(given[k] as string) : given[k] as string | number]));
}
