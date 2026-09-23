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

// Sender and reply-to address. inspo@ isn't a mailbox, so replies go to hola@,
// which does exist: Gmail penalizes senders you can't reply to.
const FROM = process.env.MAIL_FROM || "criterio.design <inspo@savvia.studio>";
const REPLY_TO = process.env.MAIL_REPLY_TO || "hola@savvia.studio";

// Inter from Google Fonts. Apple Mail, iOS Mail and Outlook mac load it; Gmail ignores web fonts and falls back to the system stack.
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** One email to one or more addresses. `replyTo` replaces the default reply-to address. */
export async function sendMail(to: string | string[], subject: string, html: string, text: string, opts: { replyTo?: string } = {}): Promise<void> {
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
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: recipients, reply_to: opts.replyTo || REPLY_TO, subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function layout(locale: Locale, title: string, body: string, cta: { label: string; url: string }, note: string) {
  const t = mailDict(locale);
  const href = esc(cta.url);
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#0d0d0d;color:#f2f2f2;font-family:${FONT};-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0d0d">
  <tr><td align="center" style="padding:56px 24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px">
      <tr><td style="padding:0 0 40px;font-family:${FONT};font-size:16px;font-weight:600;letter-spacing:-0.01em;color:#f2f2f2">criterio.design</td></tr>
      <tr><td style="padding:0 0 12px;font-family:${FONT};font-size:24px;line-height:1.2;font-weight:600;letter-spacing:-0.025em;color:#f2f2f2">${esc(title)}</td></tr>
      <tr><td style="padding:0 0 28px;font-family:${FONT};font-size:15px;font-weight:400;line-height:1.55;color:#a3a3a3">${body}</td></tr>
      <tr><td style="padding:0 0 36px">
        <a href="${href}" style="display:inline-block;background:#f2f2f2;color:#0d0d0d;text-decoration:none;padding:13px 22px;border-radius:999px;font-family:${FONT};font-size:15px;font-weight:500">${esc(cta.label)}</a>
      </td></tr>
      <tr><td style="border-top:1px solid #262626;padding:20px 0 0;font-family:${FONT};font-size:12px;font-weight:400;line-height:1.6;color:#6b6b6b">
        ${note} ${t.fallbackNote(href)}
      </td></tr>
      <tr><td style="padding:16px 0 0;font-family:${FONT};font-size:12px;font-weight:400;line-height:1.6;color:#6b6b6b">
        ${esc(t.signature)}. ${t.questions(REPLY_TO)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export function magicLinkMail(url: string, email: string | undefined, locale: Locale) {
  const t = mailDict(locale);
  const who = email ? t.magicLink.withAddress(esc(email)) : "";
  return {
    subject: t.magicLink.subject,
    html: layout(locale, t.magicLink.title, t.magicLink.body(who), { label: t.magicLink.cta, url }, t.magicLink.note),
    text: `${t.magicLink.text(email ? t.magicLink.withAddress(email) : "", url)}\n\n${t.signature}\n${REPLY_TO}`,
  };
}

export function invitationMail(url: string, teamName: string, inviterName: string, inviterEmail: string, inviteeEmail: string, locale: Locale) {
  const t = mailDict(locale);
  const who = inviterName === inviterEmail ? esc(inviterName) : `${esc(inviterName)} (${esc(inviterEmail)})`;
  return {
    subject: t.invitation.subject(inviterName, teamName),
    html: layout(locale, t.invitation.title(esc(teamName)), t.invitation.body(who, esc(teamName), esc(inviteeEmail)), { label: t.invitation.cta, url }, t.invitation.note),
    text: `${t.invitation.text(inviterName, inviterEmail, teamName, inviteeEmail, url)}\n\n${t.signature}\n${REPLY_TO}`,
  };
}

/**
 * On a downgrade a team can end up with more people than the new plan allows.
 * Nobody is removed: the owner is told so they can decide.
 */
export function overCapacityMail(url: string, teamName: string, planName: string, members: number, limit: number, locale: Locale) {
  const t = mailDict(locale);
  const nMembers = t.overCapacity.people(members);
  const nLimit = t.overCapacity.people(limit);
  return {
    subject: t.overCapacity.subject(teamName, nMembers, planName, limit),
    html: layout(locale, t.overCapacity.title, t.overCapacity.body(esc(teamName), esc(planName), nLimit, nMembers), { label: t.overCapacity.cta, url }, t.overCapacity.note),
    text: `${t.overCapacity.text(teamName, planName, nLimit, nMembers, url)}\n\n${t.signature}\n${REPLY_TO}`,
  };
}

export function adminAccessMail(url: string, granterName: string, locale: Locale) {
  const t = mailDict(locale);
  return {
    subject: t.adminAccess.subject(granterName),
    html: layout(locale, t.adminAccess.title, t.adminAccess.body(esc(granterName)), { label: t.adminAccess.cta, url }, t.adminAccess.note),
    text: `${t.adminAccess.text(granterName, url)}\n\n${t.signature}\n${REPLY_TO}`,
  };
}

/** Feedback time is always in the Madrid zone: it's a studio fact, not a language one. */
const fmtWhen = (locale: Locale) =>
  new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Europe/Madrid", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * Visual feedback on the app (Agentation bar) for the partners. The body carries the
 * markdown exactly as the bar copies it, ready to paste into an agent; the plain text
 * is just the markdown, so replying or forwarding works too.
 */
export function feedbackMail(f: { author: { name: string; email: string }; path: string; url: string; count: number; markdown: string; at: Date }, locale: Locale) {
  const t = mailDict(locale);
  const who = f.author.name || f.author.email;
  const n = t.feedback.notes(f.count);
  const when = fmtWhen(locale).format(f.at);
  const intro = t.feedback.intro(esc(who), esc(f.author.email), n, esc(f.path), esc(when));
  const pre = `<pre style="margin:0 0 28px;padding:18px 20px;background:#161616;border:1px solid #262626;border-radius:12px;color:#e5e5e5;font-family:'SF Mono',Menlo,Consolas,'Liberation Mono',monospace;font-size:12.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere">${esc(f.markdown)}</pre>`;
  const html = layout(locale, t.feedback.title(n, who), intro, { label: t.feedback.cta, url: f.url }, t.feedback.note)
    // The code block goes right before the button: the layout has no slot for it
    .replace('<tr><td style="padding:0 0 36px">', `<tr><td style="padding:0 0 0">${pre}</td></tr>\n      <tr><td style="padding:0 0 36px">`);
  return {
    subject: t.feedback.subject(who, n, f.path),
    html,
    text: `${t.feedback.text(who, f.author.email, n, f.path, when, f.url, f.markdown)}\n\n${t.signature}`,
  };
}
