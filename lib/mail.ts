// Sends transactional emails (magic link, invitations).
// With RESEND_API_KEY it uses Resend; without it (local) it prints the link to the console
// and saves it to .data/last-mail.txt so you can test without email.
//
// The language is the RECIPIENT's, never that of whoever triggers the email:
// localeForEmail() looks it up on the recipient's account. The text lives in
// lib/i18n/<locale>/mail.ts.
import { promises as fs } from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { recordFailure } from "./log";
import { toLocale, INTL_LOCALE, DEFAULT_LOCALE, type Locale } from "./i18n/locale";
import en from "./i18n/en";
import es from "./i18n/es";

const DICTS = { en, es } as const;
export const mailDict = (locale: Locale) => DICTS[locale].mail;

/**
 * A recipient's language. If the address has an account, theirs; otherwise `fallback`
 * (English by default). That's the invitation case: the invitee may have no account.
 */
export async function localeForEmail(email: string, fallback: Locale = DEFAULT_LOCALE): Promise<Locale> {
  const [row] = await db.select({ language: schema.user.language }).from(schema.user).where(eq(schema.user.email, email)).limit(1);
  return row ? toLocale(row.language) : fallback;
}

// hola@ is a real mailbox: Gmail penalizes senders you can't reply to.
const FROM = process.env.MAIL_FROM || "Criterio <hola@criterio.design>";
const REPLY_TO = process.env.MAIL_REPLY_TO || "hola@criterio.design";

/** Every email is plain text: it always reads, and the link is near the top. No HTML part, on purpose (#39). */
export interface Mail { subject: string; text: string }

/** One email to one or more addresses. `replyTo` replaces the default reply-to address. */
export async function sendMail(to: string | string[], { subject, text }: Mail, opts: { replyTo?: string; headers?: Record<string, string> } = {}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const recipients = Array.isArray(to) ? to : [to];
  if (!key) {
    console.log(`\n✉️  [mail without RESEND_API_KEY] → ${recipients.join(", ")}\n${subject}\n${text}\n`);
    try {
      await fs.mkdir(path.join(process.cwd(), ".data"), { recursive: true });
      await fs.writeFile(path.join(process.cwd(), ".data", "last-mail.txt"), `${recipients.join(", ")}\n${subject}\n${text}\n`);
    } catch { /* just a development aid */ }
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: recipients, reply_to: opts.replyTo || REPLY_TO, subject, text, ...(opts.headers ? { headers: opts.headers } : {}) }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  } catch (e) {
    // Never the subject or the address: both can name a person
    void recordFailure("mail", "resend", e);
    throw e;
  }
}

/** Signed by the three partners: a person, not a product, sends it */
const signed = (locale: Locale, text: string) => `${text}\n\n${mailDict(locale).signature}`;

export function magicLinkMail(url: string, locale: Locale): Mail {
  const t = mailDict(locale);
  return { subject: t.magicLink.subject, text: signed(locale, t.magicLink.text(url)) };
}

export function invitationMail(url: string, teamName: string, inviterName: string, inviterEmail: string, inviteeEmail: string, locale: Locale): Mail {
  const t = mailDict(locale);
  const who = inviterName === inviterEmail ? inviterName : `${inviterName} (${inviterEmail})`;
  return { subject: t.invitation.subject(inviterName, teamName), text: signed(locale, t.invitation.text(who, teamName, inviteeEmail, url)) };
}

/**
 * On a downgrade a team can end up with more people than the new plan allows.
 * Nobody is removed: the owner is told so they can decide.
 */
export function overCapacityMail(url: string, teamName: string, planName: string, members: number, limit: number, locale: Locale): Mail {
  const t = mailDict(locale);
  const nMembers = t.overCapacity.people(members);
  return {
    subject: t.overCapacity.subject(teamName, nMembers, planName, limit),
    text: signed(locale, t.overCapacity.text(teamName, planName, t.overCapacity.people(limit), nMembers, url)),
  };
}

export function adminAccessMail(url: string, granterName: string, locale: Locale): Mail {
  const t = mailDict(locale);
  return { subject: t.adminAccess.subject(granterName), text: signed(locale, t.adminAccess.text(granterName, url)) };
}

/** Feedback time is always in the Madrid zone: it's a studio fact, not a language one. */
const fmtWhen = (locale: Locale) =>
  new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Europe/Madrid", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * Visual feedback on the app (Agentation bar) for the partners. The body carries the
 * markdown exactly as the bar copies it, ready to paste into an agent.
 */
export function feedbackMail(f: { author: { name: string; email: string }; path: string; url: string; count: number; markdown: string; at: Date }, locale: Locale): Mail {
  const t = mailDict(locale);
  const who = f.author.name || f.author.email;
  const n = t.feedback.notes(f.count);
  return {
    subject: t.feedback.subject(who, n, f.path),
    text: t.feedback.text(who, f.author.email, n, f.path, fmtWhen(locale).format(f.at), f.url, f.markdown),
  };
}

// ─── Team emails (lib/notify.ts) ─────────────────────────────────────────────
// The digest and the instant replies. Each carries, at its foot, why it came and a one-click link to stop
// it (no sign-in), and the same link goes in List-Unsubscribe so mail clients show their own button.

export interface TeamMailFoot { team: string; stopUrl: string }

const footerText = (locale: Locale, f: TeamMailFoot) => `${mailDict(locale).team.why(f.team)}\n${mailDict(locale).team.stopText(f.stopUrl)}`;
/** Headers for a mail client's own unsubscribe button (RFC 8058): the POST goes to the same signed link */
export const unsubscribeHeaders = (stopUrl: string): Record<string, string> => ({ "List-Unsubscribe": `<${stopUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });

export interface DigestLine { text: string; url: string; quote?: string }
export interface DigestGroup { title: string; url: string; lines: DigestLine[]; more: number }

/** The daily digest: what the others did, grouped by project (or the library), each line with its link */
export function digestMail(d: { summary: string; url: string; groups: DigestGroup[] }, foot: TeamMailFoot, locale: Locale): Mail {
  const t = mailDict(locale);
  const groups = d.groups.map((g) => `${g.title}\n${g.lines.map((l) => `  ${l.text}${l.quote ? ` \u00ab${l.quote}\u00bb` : ""}\n  ${l.url}`).join("\n")}${g.more > 0 ? `\n  ${t.digest.more(g.more)}` : ""}`).join("\n\n");
  return {
    subject: t.digest.subject(foot.team, d.summary),
    text: signed(locale, `${t.digest.title(foot.team)}\n${d.url}\n\n${groups}\n\n${footerText(locale, foot)}`),
  };
}

/** Someone answered one of your comments: their words under yours, and the email replies to them */
export function replyMail(r: { who: string; mine: string; theirs: string; url: string }, foot: TeamMailFoot, locale: Locale): Mail {
  const t = mailDict(locale);
  return { subject: t.reply.subject(r.who), text: signed(locale, `${t.reply.text(r.who, r.mine, r.theirs, r.url)}\n\n${footerText(locale, foot)}`) };
}

/** Someone accepted or turned down a change you proposed to an area */
export function proposalMail(p: { who: string; accepted: boolean; area: string; project: string; decision: string; url: string }, foot: TeamMailFoot, locale: Locale): Mail {
  const t = mailDict(locale);
  return {
    subject: t.proposal.subject(p.who, p.accepted, p.area),
    text: signed(locale, `${t.proposal.text(p.who, p.accepted, p.area, p.project, p.decision, p.url)}\n\n${footerText(locale, foot)}`),
  };
}

/** A month without opening the app: the digest stops on its own, and this says so once */
export function pausedMail(url: string, locale: Locale): Mail {
  const t = mailDict(locale);
  return { subject: t.paused.subject, text: signed(locale, t.paused.text(url)) };
}
