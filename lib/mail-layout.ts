// The one look of every email: a letter in a narrow column, Tino at the top, the greeting, the body, the partners'
// signature and a quiet foot. Table-based and inline-styled, with the system's fonts and light only, so Gmail, Apple
// Mail and Outlook draw it alike.
//
// Resend holds each template's body between BODY_START and BODY_END; `npm run mail:templates layout` wraps it in
// this layout again (scripts/mail-templates.ts). An email built in code (lib/mail-templates.ts `letter`) fills the
// same layout through the letter template, with a body made of the blocks below.
//
// Pure: imported by the app and by the script, so no database and no server-only.
import type { Locale } from "./i18n/locale";
import { mail as en } from "./i18n/en/mail";
import { mail as es } from "./i18n/es/mail";

const COPY = { en: en.layout, es: es.layout } as const;

/** Why an email with a stop link came: you are in a team, you have an account, or you read the whole Vault */
export type Stop = "team" | "account" | "vault";

/** HTML that is safe to put in an email: made by the blocks below, never by hand from someone's words */
export type Html = string & { readonly __html: true };
/** A body built in code, as HTML for the letter and as plain text for its text part */
export interface Body { html: Html; text: string }

export const BODY_START = "<!--criterio:body-->";
export const BODY_END = "<!--/criterio:body-->";
/** Tino in pixels, the mark under marketing-site/public/assets/marca/, as PNG: Gmail and Outlook show no SVG */
export const LOGO_URL = "https://criterio.design/assets/marca/conejo-icono.png";
export const SITE_URL = "https://criterio.design";

const INK = "#1B1B18", PAPER = "#EDE6D6", TEXT_2 = "#5A5850", MUTED = "#6E695F", LINE = "#D9D1BF", WELL = "#F6F1E6";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

/**
 * Makes a value safe in an email's HTML, in text or inside a double-quoted attribute. The subject and the plain-text
 * part read the raw twin instead (lib/mail-templates.ts), so nothing there shows the entities.
 */
export const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attr = escapeHtml;
const html = (s: string) => s as Html;

// ─── Blocks ──────────────────────────────────────────────────────────────────

/** A run of text inside a paragraph: words, a link, or a few words in bold */
export type Inline = string | { href: string; text: string } | { strong: string };

const inlineHtml = (x: Inline) =>
  typeof x === "string" ? escapeHtml(x).replace(/\n/g, "<br>")
    : "href" in x ? `<a href="${attr(x.href)}" style="color:${INK};text-decoration:underline;">${escapeHtml(x.text)}</a>`
      : `<strong style="font-weight:700;">${escapeHtml(x.strong)}</strong>`;
const inlineText = (x: Inline) => (typeof x === "string" ? x : "href" in x ? `${x.text} (${x.href})` : x.strong);

export const para = (...parts: Inline[]): Body =>
  ({ html: html(`<p style="margin:0 0 16px;">${parts.map(inlineHtml).join("")}</p>`), text: parts.map(inlineText).join("") });

/** A step's short bold heading, as the welcome numbers them */
export const heading = (text: string): Body =>
  ({ html: html(`<p style="margin:24px 0 4px;font-weight:700;">${escapeHtml(text)}</p>`), text });

/** The email's one main link, as a pill */
export const button = (label: string, href: string): Body => ({
  html: html(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td bgcolor="${INK}" style="background:${INK};border-radius:999px;"><a href="${attr(href)}" style="display:inline-block;padding:12px 22px;border-radius:999px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:${PAPER};text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`),
  text: `${label}: ${href}`,
});

/** Someone's words, quoted as written */
export const quote = (text: string): Body => ({
  html: html(`<p style="margin:0 0 16px;padding:0 0 0 12px;border-left:2px solid ${LINE};color:${TEXT_2};">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`),
  text: `"${text}"`,
});

/** Literal data to copy, like an address: the one place for the monospace */
export const code = (text: string): Body => ({
  html: html(`<p style="margin:0 0 16px;padding:12px 14px;background:${WELL};border-radius:8px;font-family:${MONO};font-size:13px;line-height:1.5;word-break:break-all;">${escapeHtml(text)}</p>`),
  text,
});

/** A product screenshot, the column's width */
export const image = (src: string, alt: string): Body => ({
  html: html(`<img src="${attr(src)}" alt="${attr(alt)}" width="480" style="display:block;width:100%;max-width:480px;height:auto;margin:0 0 16px;border:1px solid ${LINE};border-radius:8px;">`),
  text: "",
});

export const join = (...parts: Body[]): Body => ({ html: html(parts.map((p) => p.html).join("\n")), text: parts.map((p) => p.text).filter(Boolean).join("\n\n") });

/** Plain text as paragraphs: a blank line starts a new one. For the partners' operations emails */
export const prose = (text: string): Body => join(...text.split(/\n{2,}/).map((p) => para(p)));

// ─── The layout ──────────────────────────────────────────────────────────────

/** What the layout needs of a template: the template's own variables are Resend's to fill */
export interface Frame { locale: Locale; stop?: Stop }

/** The foot's why-line, with the team as the template's TEAM variable */
const why = (f: Frame) => {
  const c = COPY[f.locale];
  return f.stop === "team" ? c.why.team("{{{TEAM}}}") : f.stop ? c.why[f.stop] : null;
};

/** The whole email around `body`, which is either a template's HTML or {{{BODY}}} for the letter */
export function layoutHtml(f: Frame, body: string): string {
  const c = COPY[f.locale];
  const reason = why(f);
  const foot = [
    reason && `${escapeHtml(reason)}<br><a href="{{{STOP_URL}}}" style="color:${MUTED};text-decoration:underline;">${escapeHtml(c.stop)}</a> ${escapeHtml(c.stopNote)}`,
    `<a href="${SITE_URL}" style="color:${MUTED};text-decoration:none;">criterio.design</a><br>&copy; Criterio`,
  ].filter(Boolean).map((line) => `<p style="margin:0 0 12px;">${line}</p>`).join("");
  return `<!doctype html>
<html lang="${f.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title></title>
</head>
<body style="margin:0;padding:0;background:#FFFFFF;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background:#FFFFFF;"><tr><td align="center" style="padding:40px 16px;">
<!--[if mso]><table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;">
<tr><td style="padding:0 0 32px;"><a href="${SITE_URL}"><img src="${LOGO_URL}" width="32" height="32" alt="Criterio" style="display:block;border:0;width:32px;height:32px;font-size:11px;line-height:32px;color:${INK};text-decoration:none;"></a></td></tr>
<tr><td style="font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};text-align:left;">
<p style="margin:0 0 16px;">{{{GREETING}}}</p>
${BODY_START}
${body}
${BODY_END}
<p style="margin:24px 0 0;">${escapeHtml(c.signature)}</p>
</td></tr>
<tr><td style="padding:40px 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${MUTED};text-align:left;">${foot}</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>`;
}

/** The plain-text part of an email, around its body as text: {{{BODY_TEXT}}} for the letter, a template's from htmlText */
export function layoutText(f: Frame, body: string): string {
  const c = COPY[f.locale];
  const reason = why(f);
  return [`{{{GREETING}}}`, body, c.signature, reason && `${reason}\n${c.stop} ${c.stopNote}:\n{{{STOP_URL}}}`, "criterio.design"].filter(Boolean).join("\n\n");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", copy: "©" };
const decode = (s: string) => s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
  e[0] !== "#" ? ENTITIES[e.toLowerCase()] ?? m : String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))));
const hrefOf = (attrs: string) => /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs)?.slice(1).find((h) => h !== undefined) ?? "";
const untag = (s: string) => s.replace(/<[^>]*>/g, "").trim();
/** A link as text: the button's "Label: URL", a link in a sentence "words (URL)", a bare address once */
const linkText = (sep: (label: string, href: string) => string) => (_: string, attrs: string, inner: string) => {
  const label = untag(inner), href = hrefOf(attrs);
  return !href || label === href ? label || href : !label ? href : sep(label, href);
};
const BLOCK = /<\/?(?:p|div|h[1-6]|ul|ol|table|tr|blockquote)\b[^>]*>/gi;

/**
 * A template's body as plain text, the way the blocks above write it: a blank line between paragraphs, the button as
 * "Label: URL", a link in a sentence as "words (URL)", a list item as "- item". Variables stay {{{VAR}}}.
 */
export function htmlText(body: string): string {
  return decode(
    body
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s+/g, " ")
      .replace(/<table\b[\s\S]*?<\/table\s*>/gi, (t) => t.replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi, linkText((l, h) => `${l}: ${h}`)))
      .replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi, linkText((l, h) => `${l} (${h})`))
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(BLOCK, "\n\n")
      .replace(/<[^>]*>/g, ""),
  ).split("\n").map((line) => line.replace(/ {2,}/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** A template's body: what sits between the markers. Null when they are gone, so nothing outside them is wrapped twice */
export function bodyOf(templateHtml: string): string | null {
  const a = templateHtml.indexOf(BODY_START), b = templateHtml.indexOf(BODY_END);
  return a >= 0 && b > a ? templateHtml.slice(a + BODY_START.length, b).trim() : null;
}

/** How the email greets someone: by first name when the account has one */
export function greeting(locale: Locale, name?: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  return COPY[locale].greeting(first && !first.includes("@") ? first : undefined);
}
