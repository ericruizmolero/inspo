// Sends Criterio's emails. Each one is a Resend template in the recipient's language (lib/mail-templates.ts): the
// wording lives in Resend, and the functions below only pick the template and fill its variables. The emails built
// from lists (the digest, a client's comments, a Vault release, the partners' own) go through the letter template,
// with a body made here from the blocks of lib/mail-layout.ts and their words in lib/i18n/<locale>/mail.ts.
// Without RESEND_API_KEY (local) nothing leaves: the template and its variables go to the console and to
// .data/last-mail.txt.
//
// The language is the RECIPIENT's, never that of whoever triggers the email: localeForEmail() looks it up on the
// recipient's account.
import { promises as fs } from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { recordFailure } from "./log";
import { toLocale, INTL_LOCALE, DEFAULT_LOCALE, type Locale } from "./i18n/locale";
import { fmtGiftDay } from "./i18n/format";
import en from "./i18n/en";
import es from "./i18n/es";
import type { PlanKey } from "./plans";
import type { PlanPeriod } from "./db/schema";
import { REFS_GOAL, type StepKey } from "./first-steps-core";
import { aliasOf, letter, mail, preview, resendVariables, type Mail } from "./mail-templates";
import { button, code, greeting, heading, join, para, quote } from "./mail-layout";

const DICTS = { en, es } as const;
export const mailDict = (locale: Locale) => DICTS[locale].mail;
const planName = (plan: PlanKey, locale: Locale) => DICTS[locale].plans.items[plan].name;

/**
 * A recipient's language. If the address has an account, theirs; otherwise `fallback`
 * (English by default). That's the invitation case: the invitee may have no account.
 */
export async function localeForEmail(email: string, fallback: Locale = DEFAULT_LOCALE): Promise<Locale> {
  const [row] = await db.select({ language: schema.user.language }).from(schema.user).where(eq(schema.user.email, email)).limit(1);
  return row ? toLocale(row.language) : fallback;
}

/** The name on the account of an address, for the greeting; null without one */
async function nameOf(email: string): Promise<string | null> {
  const [row] = await db.select({ name: schema.user.name }).from(schema.user).where(eq(schema.user.email, email)).limit(1);
  return row?.name ?? null;
}

// hola@ is a real mailbox: Gmail penalizes senders you can't reply to.
const FROM = process.env.MAIL_FROM || "Criterio <hola@criterio.design>";
const REPLY_TO = process.env.MAIL_REPLY_TO || "hola@criterio.design";

/** Headers for a mail client's own unsubscribe button (RFC 8058): the POST goes to the same signed link */
const unsubscribeHeaders = (stopUrl: string): Record<string, string> => ({ "List-Unsubscribe": `<${stopUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });

/**
 * One email to one or more addresses. One address is greeted by the name on its account. An email with a stop link
 * also carries it in List-Unsubscribe. `replyTo` replaces the default reply-to address.
 */
export async function sendMail(to: string | string[], m: Mail, opts: { replyTo?: string } = {}): Promise<void> {
  const recipients = Array.isArray(to) ? to : [to];
  const hello = greeting(m.locale, recipients.length === 1 ? await nameOf(recipients[0]) : null);
  const variables = resendVariables(m, hello);
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const shown = `${recipients.join(", ")}\n${preview(m, { GREETING: hello })}\n`;
    console.log(`\n✉️  [mail without RESEND_API_KEY] → ${shown}`);
    try {
      await fs.mkdir(path.join(process.cwd(), ".data"), { recursive: true });
      await fs.writeFile(path.join(process.cwd(), ".data", "last-mail.txt"), shown);
    } catch { /* just a development aid */ }
    return;
  }
  const stopUrl = "STOP_URL" in m.vars ? m.vars.STOP_URL : null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: recipients, reply_to: opts.replyTo || REPLY_TO, template: { id: aliasOf(m.template, m.locale), variables }, ...(stopUrl ? { headers: unsubscribeHeaders(stopUrl) } : {}) }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  } catch (e) {
    // Never the subject or the address: both can name a person
    void recordFailure("mail", "resend", e);
    throw e;
  }
}

/** "Name (address)", or the address alone when the name is it */
const whoIs = (name: string, email: string) => (name === email ? name : `${name} (${email})`);

export const magicLinkMail = (url: string, locale: Locale): Mail => mail("magic-link", locale, { URL: url });

export const invitationMail = (url: string, teamName: string, inviterName: string, inviterEmail: string, inviteeEmail: string, locale: Locale): Mail =>
  mail("invitation", locale, { INVITER: inviterName, WHO: whoIs(inviterName, inviterEmail), TEAM: teamName, INVITEE: inviteeEmail, URL: url });

/** What changed in a team for the one person told about it (lib/team-mail.ts). `who` is whoever did it */
export type MembershipNews =
  | { kind: "joined"; team: string; who: string; url: string }
  | { kind: "ending"; team: string; who: string; invitee: string; url: string }
  | { kind: "role"; team: string; who: string; role: "admin" | "member"; url: string }
  | { kind: "removed"; team: string; who: string }
  | { kind: "owner"; team: string; who: string; url: string }
  | { kind: "deleted"; team: string; who: string };

export function membershipMail(n: MembershipNews, locale: Locale): Mail {
  switch (n.kind) {
    case "joined": return mail("member-joined", locale, { WHO: n.who, TEAM: n.team, URL: n.url });
    case "ending": return mail("member-invite-ending", locale, { INVITER: n.who, TEAM: n.team, INVITEE: n.invitee, URL: n.url });
    case "role": return mail(n.role === "admin" ? "member-now-admin" : "member-now-member", locale, { WHO: n.who, TEAM: n.team, URL: n.url });
    case "removed": return mail("member-removed", locale, { WHO: n.who, TEAM: n.team });
    case "owner": return mail("member-now-owner", locale, { WHO: n.who, TEAM: n.team, URL: n.url });
    case "deleted": return mail("team-deleted", locale, { WHO: n.who, TEAM: n.team });
  }
}

/** A personal invite (lib/access.ts): the person gets their own space on the free plan, not a seat in the inviter's */
export const personalInviteMail = (url: string, inviterName: string, inviterEmail: string, inviteeEmail: string, locale: Locale): Mail =>
  mail("personal-invite", locale, { INVITER: inviterName, WHO: whoIs(inviterName, inviterEmail), INVITEE: inviteeEmail, URL: url });

/**
 * On a downgrade a team can end up with more people than the new plan allows.
 * Nobody is removed: the owner is told so they can decide.
 */
export const overCapacityMail = (url: string, teamName: string, plan: PlanKey, members: number, limit: number, locale: Locale): Mail =>
  mail("over-capacity", locale, { TEAM: teamName, PLAN: planName(plan, locale), MEMBERS: members, LIMIT: limit, URL: url });

/** A paid account passed its fair-use ceiling of searches (lib/plans.ts). Nothing is cut off: the owner is told */
export function fairUseMail(account: string, plan: PlanKey, used: number, ceiling: number, locale: Locale): Mail {
  const n = (x: number) => x.toLocaleString(INTL_LOCALE[locale]);
  return mail("fair-use", locale, { ACCOUNT: account, PLAN: planName(plan, locale), USED: n(used), CEILING: n(ceiling) });
}

/** To the partners: an account asks for a plan. `price` is already written out, in the period asked for */
export function planRequestMail(r: { account: string; owner: string; now: PlanKey; plan: PlanKey; period: PlanPeriod; price: string; workspaces: string[]; url: string }, locale: Locale): Mail {
  const t = mailDict(locale).plans, name = (k: PlanKey) => planName(k, locale);
  return letter(locale, t.newSubject(r.account, name(r.plan), t.period[r.period]), join(
    para(t.newText(r.account, r.owner, name(r.now), name(r.plan), t.period[r.period], r.price, r.workspaces.join(", "))),
    button(t.setPlan, r.url),
  ));
}

/** To whoever asked for a plan: it arrived, and we write back */
export const planRequestedMail = (plan: PlanKey, period: PlanPeriod, account: string, locale: Locale): Mail =>
  mail("plan-requested", locale, { PLAN: planName(plan, locale), PERIOD: mailDict(locale).plans.period[period], ACCOUNT: account });

/** "Your plan is on", with its last day when it has one (a gift, or a partner's end date) */
export function planOnMail(plan: PlanKey, account: string, url: string, locale: Locale, until?: Date | null): Mail {
  const vars = { PLAN: planName(plan, locale), ACCOUNT: account, URL: url };
  return until ? mail("plan-on-until", locale, { ...vars, UNTIL: fmtGiftDay(until, locale) }) : mail("plan-on", locale, vars);
}

export const adminAccessMail = (url: string, granterName: string, locale: Locale): Mail => mail("admin-access", locale, { GRANTER: granterName, URL: url });

/** Once, when someone joins the waitlist (lib/access.ts enlist): no link, only that they are on it and what comes next */
export const onTheListMail = (email: string, locale: Locale): Mail => mail("on-the-list", locale, { YOUR_EMAIL: email });

/** A place opened from the waitlist, or a loose invite made out to someone: the link carries the code. */
export const accessInviteMail = (url: string, email: string, locale: Locale): Mail => mail("access-invite", locale, { YOUR_EMAIL: email, URL: url });

/** Feedback time is always in the Madrid zone: it's a studio fact, not a language one. */
const fmtWhen = (locale: Locale) =>
  new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Europe/Madrid", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * Visual feedback on the app (Agentation bar) for the partners. The body carries the
 * markdown exactly as the bar copies it, ready to paste into an agent.
 */
export function feedbackMail(f: { author: { name: string; email: string }; path: string; url: string; count: number; markdown: string; at: Date }, locale: Locale): Mail {
  const t = mailDict(locale).feedback;
  const who = f.author.name || f.author.email;
  const n = t.notes(f.count);
  return letter(locale, t.subject(who, n, f.path), join(
    para(t.intro(who, f.author.email, n, f.path, fmtWhen(locale).format(f.at))),
    para(t.page, { href: f.url, text: f.url }),
    code(f.markdown),
  ));
}

// ─── Team emails (lib/notify.ts) ─────────────────────────────────────────────
// The digest and the instant replies. Each carries, at its foot, why it came and a one-click link to stop
// it (no sign-in), and the same link goes in List-Unsubscribe so mail clients show their own button.

export interface TeamMailFoot { team: string; stopUrl: string }

export interface DigestLine { text: string; url: string; quote?: string }
export interface DigestGroup { title: string; url: string; lines: DigestLine[]; more: number }

/** The daily digest: what the others did, grouped by project (or the library), each line with its link */
export function digestMail(d: { summary: string; url: string; groups: DigestGroup[] }, foot: TeamMailFoot, locale: Locale): Mail {
  const t = mailDict(locale).digest;
  const groups = d.groups.flatMap((g) => [
    heading(g.title),
    ...g.lines.flatMap((l) => [para({ href: l.url, text: l.text }), ...(l.quote ? [quote(l.quote)] : [])]),
    ...(g.more > 0 ? [para(t.more(g.more))] : []),
  ]);
  return letter(locale, t.subject(foot.team, d.summary), join(para(t.title(foot.team)), button(t.open, d.url), ...groups), foot);
}

/** Someone answered one of your comments: their words under yours, and the email replies to them */
export const replyMail = (r: { who: string; mine: string; theirs: string; url: string }, foot: TeamMailFoot, locale: Locale): Mail =>
  mail("reply", locale, { WHO: r.who, MINE: r.mine, THEIRS: r.theirs, URL: r.url, TEAM: foot.team, STOP_URL: foot.stopUrl });

/** Someone accepted or turned down a change you proposed to an area */
export const proposalMail = (p: { who: string; accepted: boolean; area: string; project: string; decision: string; url: string }, foot: TeamMailFoot, locale: Locale): Mail =>
  mail(p.accepted ? "proposal-accepted" : "proposal-declined", locale, { WHO: p.who, AREA: p.area, PROJECT: p.project, DECISION: p.decision, URL: p.url, TEAM: foot.team, STOP_URL: foot.stopUrl });

/** One comment a client left through a share link: their name, the reference, their words */
export interface ClientComment { who: string; reference: string; body: string }

/** What clients wrote through a share link since its last email (lib/client-comments.ts), with the link's label if it has one */
export function clientCommentsMail(c: { project: string; link: string; comments: ClientComment[]; url: string }, foot: TeamMailFoot, locale: Locale): Mail {
  const t = mailDict(locale).clientComments;
  const said = c.comments.flatMap((x) => [para({ strong: t.on(x.who, x.reference) }), quote(x.body)]);
  return letter(locale, t.subject(c.project), join(para(t.intro(c.project, c.link)), ...said, button(t.answer, c.url)), foot);
}

/** The client answered through the link (lib/client-ask.ts): one email to whoever sent it */
export const clientAnswersMail = (a: { project: string; n: number; url: string }, locale: Locale): Mail =>
  a.n === 1 ? mail("client-answers-one", locale, { PROJECT: a.project, URL: a.url }) : mail("client-answers", locale, { PROJECT: a.project, COUNT: a.n, URL: a.url });

/** Someone invited to a share link (lib/share.ts): their own address to the board, to comment and choose */
export const shareInviteMail = (s: { who: string; project: string; url: string }, locale: Locale): Mail =>
  mail("share-invite", locale, { WHO: s.who, PROJECT: s.project, URL: s.url });

// ─── New in the Vault (lib/vault-release.ts) ─────────────────────────────────

/** A piece as the release lists it, already in the reader's language */
export interface ReleasePiece { title: string; category: string; summary: string; url: string }

/** The new pieces, each with its category, its line and its link, and at the foot the one-click stop */
export function vaultReleaseMail(pieces: ReleasePiece[], stopUrl: string, locale: Locale): Mail {
  const t = mailDict(locale).vaultRelease;
  const list = pieces.flatMap((p) => [para({ href: p.url, text: p.title }, ` (${p.category})`), ...(p.summary ? [para(p.summary)] : [])]);
  return letter(locale, t.subject(pieces.length), join(para(t.intro(pieces.length)), ...list), { vault: true, stopUrl });
}

// ─── First use (lib/first-use-mail.ts) ───────────────────────────────────────

/** Once, when the account is made: the first steps, numbered in the order the app asks for them */
export const welcomeMail = (url: string, locale: Locale): Mail => mail("welcome", locale, { URL: url, GOAL: REFS_GOAL });

/** What a nudge says of the step it names: where it is done, and how many references the project has of the goal */
export interface NudgeAt { url: string; refs: number; goal: number }

/** One template per step, so a new step without its email does not compile */
const NUDGES: Record<StepKey, (at: NudgeAt, stopUrl: string, locale: Locale) => Mail> = {
  project: (at, stop, locale) => mail("nudge-project", locale, { URL: at.url, STOP_URL: stop }),
  refs: (at, stop, locale) => at.refs
    ? mail("nudge-refs", locale, { URL: at.url, REFS: at.refs, GOAL: at.goal, STOP_URL: stop })
    : mail("nudge-refs-empty", locale, { URL: at.url, GOAL: at.goal, STOP_URL: stop }),
  polish: (at, stop, locale) => mail("nudge-polish", locale, { URL: at.url, STOP_URL: stop }),
  out: (at, stop, locale) => mail("nudge-out", locale, { URL: at.url, STOP_URL: stop }),
};

/** A nudge on day 3 or 7: the first step not done, with its link. It stops with the digest's switch */
export const nudgeMail = (step: StepKey, at: NudgeAt, stopUrl: string, locale: Locale): Mail => NUDGES[step](at, stopUrl, locale);

// ─── After Welcome (components/Welcome.tsx, lib/connect-mail.ts) ──────────────────────────────────────────────

/** Asked for at Welcome away from Chrome: the extension's install page, to open on a computer */
export const extensionLinkMail = (url: string, locale: Locale): Mail => mail("extension-link", locale, { URL: url });

/** Days after Welcome ended with no AI client connected: the connector's address and how each client adds it. It
 *  stops with the digest's switch */
export const connectAgentMail = (at: { address: string; url: string }, stopUrl: string, locale: Locale): Mail =>
  mail("connect-agent", locale, { ADDRESS: at.address, URL: at.url, STOP_URL: stopUrl });

/** A month without opening the app: the digest stops on its own, and this says so once. Its foot is the digest's: the
 *  signed link opens the page that turns it back on with one click */
export const pausedMail = (url: string, foot: TeamMailFoot, locale: Locale): Mail => mail("paused", locale, { URL: url, TEAM: foot.team, STOP_URL: foot.stopUrl });

/** Two weeks away (lib/win-back.ts): their latest project, where they left it. It stops with the digest's switch */
export const winBackMail = (w: { project: string; url: string }, stopUrl: string, locale: Locale): Mail =>
  mail("win-back", locale, { PROJECT: w.project, URL: w.url, STOP_URL: stopUrl });

// ─── The plan's lifecycle (lib/plan-change.ts) and deleting an account (lib/account-delete.ts) ───────────────
// Each email that announces a smaller plan says what it means; with `-vault` it also says the paid Vault pieces lock.

/** To the account's owner: a partner moved it to a smaller plan */
export const planDownMail = (to: PlanKey, vaultLocks: boolean, account: string, url: string, locale: Locale): Mail =>
  mail(vaultLocks ? "plan-down-vault" : "plan-down", locale, { PLAN: planName(to, locale), ACCOUNT: account, URL: url });

/** To the account's owner, a week ahead: the gifted plan ends on `until` */
export const giftEndsMail = (plan: PlanKey, until: Date, account: string, url: string, locale: Locale): Mail =>
  mail("gift-ends", locale, { PLAN: planName(plan, locale), ACCOUNT: account, UNTIL: fmtGiftDay(until, locale), URL: url });

/** To the account's owner: the gifted plan ran out and the account is back on the free plan */
export const giftEndedMail = (plan: PlanKey, vaultLocks: boolean, account: string, url: string, locale: Locale): Mail =>
  mail(vaultLocks ? "gift-ended-vault" : "gift-ended", locale, { PLAN: planName(plan, locale), ACCOUNT: account, URL: url });

/** The last email to a person: their account is gone */
export const accountDeletedMail = (email: string, locale: Locale): Mail => mail("account-deleted", locale, { YOUR_EMAIL: email });

// ─── A client's workspace let go from an agency's plan (lib/account-workspaces.ts) ───────────────────────────

/** To the workspace's owner: the plan that paid for it let it go, and it is on Free on an account of their own */
export const letGoMail = (g: { workspace: string; account: string; vaultLocks: boolean; url: string }, locale: Locale): Mail =>
  mail(g.vaultLocks ? "let-go-vault" : "let-go", locale, { WORKSPACE: g.workspace, ACCOUNT: g.account, URL: g.url });
