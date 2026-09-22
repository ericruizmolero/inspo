// Envío de correos transaccionales (magic link, invitaciones).
// Con RESEND_API_KEY usa Resend; sin ella (local) imprime el enlace en consola
// y lo guarda en .data/last-mail.txt para poder probar sin correo.
import { promises as fs } from "fs";
import path from "path";

// Remitente y dirección de respuesta. inspo@ no es un buzón, así que las respuestas van a hola@,
// que sí existe: Gmail penaliza a los remitentes a los que no se puede contestar.
const FROM = process.env.MAIL_FROM || "Inspo · Savvia <inspo@savvia.studio>";
const REPLY_TO = process.env.MAIL_REPLY_TO || "hola@savvia.studio";
const SIGNATURE = "Inspo es la librería de inspiración de Savvia · savvia.studio";

// Las fuentes del correo se sirven desde public/fonts (Family para títulos, Söhne para texto).
// Apple Mail, iOS Mail y Outlook mac las cargan; Gmail ignora @font-face y cae a la pila de sistema.
const FONT_BASE =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://inspo.savvia.studio";
const DISPLAY = "'Family', 'Schibsted Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const BODY = "'Söhne', 'Schibsted Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n✉️  [mail sin RESEND_API_KEY] → ${to}\n${subject}\n${text}\n`);
    try {
      await fs.mkdir(path.join(process.cwd(), ".data"), { recursive: true });
      await fs.writeFile(path.join(process.cwd(), ".data", "last-mail.txt"), `${to}\n${subject}\n${text}\n`);
    } catch { /* solo es ayuda para desarrollo */ }
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function layout(title: string, body: string, cta: { label: string; url: string }, note: string) {
  const href = esc(cta.url);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title>
<style>
  @font-face { font-family: 'Family'; font-weight: 700; font-style: normal; font-display: swap; src: url('${FONT_BASE}/fonts/family-bold.woff2') format('woff2'); }
  @font-face { font-family: 'Söhne'; font-weight: 400; font-style: normal; font-display: swap; src: url('${FONT_BASE}/fonts/soehne-buch.woff2') format('woff2'); }
  @font-face { font-family: 'Söhne'; font-weight: 500; font-style: normal; font-display: swap; src: url('${FONT_BASE}/fonts/soehne-kraftig.woff2') format('woff2'); }
</style></head>
<body style="margin:0;padding:0;background:#0d0d0d;color:#f2f2f2;font-family:${BODY};-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0d0d">
  <tr><td align="center" style="padding:56px 24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px">
      <tr><td style="padding:0 0 40px;font-family:${DISPLAY};font-size:16px;font-weight:700;letter-spacing:-0.01em;color:#f2f2f2">Inspo</td></tr>
      <tr><td style="padding:0 0 12px;font-family:${DISPLAY};font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:#f2f2f2">${esc(title)}</td></tr>
      <tr><td style="padding:0 0 28px;font-family:${BODY};font-size:15px;font-weight:400;line-height:1.55;color:#a3a3a3">${body}</td></tr>
      <tr><td style="padding:0 0 36px">
        <a href="${href}" style="display:inline-block;background:#f2f2f2;color:#0d0d0d;text-decoration:none;padding:13px 22px;border-radius:999px;font-family:${BODY};font-size:15px;font-weight:500">${esc(cta.label)}</a>
      </td></tr>
      <tr><td style="border-top:1px solid #262626;padding:20px 0 0;font-family:${BODY};font-size:12px;font-weight:400;line-height:1.6;color:#6b6b6b">
        ${note} Si el botón no funciona, <a href="${href}" style="color:#a3a3a3;text-decoration:underline">abre este enlace</a>.
      </td></tr>
      <tr><td style="padding:16px 0 0;font-family:${BODY};font-size:12px;font-weight:400;line-height:1.6;color:#6b6b6b">
        ${esc(SIGNATURE)}. Si tienes dudas, escríbenos a <a href="mailto:${REPLY_TO}" style="color:#a3a3a3;text-decoration:underline">${REPLY_TO}</a>.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export function magicLinkMail(url: string, email?: string) {
  const who = email ? ` con la dirección ${esc(email)}` : "";
  return {
    subject: "Tu enlace para entrar en Inspo",
    html: layout("Entrar en Inspo", `Has pedido entrar en Inspo${who}. Pulsa el botón para iniciar sesión: el enlace caduca en 10 minutos y solo funciona una vez.`, { label: "Entrar", url }, "Si no has pedido este correo, puedes ignorarlo: nadie puede entrar sin este enlace."),
    text: `Has pedido entrar en Inspo${email ? ` con la dirección ${email}` : ""}. Entra con este enlace (caduca en 10 minutos y solo funciona una vez):\n${url}\n\nSi no lo has pedido, ignora este correo.\n\n${SIGNATURE}\n${REPLY_TO}`,
  };
}

export function invitationMail(url: string, teamName: string, inviterName: string) {
  return {
    subject: `${inviterName} te invita al equipo ${teamName} en Inspo`,
    html: layout(`Te invitan a ${esc(teamName)}`, `${esc(inviterName)} quiere que te unas a su librería de inspiración.`, { label: "Aceptar invitación", url }, "Si no esperabas esta invitación, puedes ignorar este correo."),
    text: `${inviterName} te invita al equipo ${teamName} en Inspo. Acepta aquí:\n${url}\n\n${SIGNATURE}\n${REPLY_TO}`,
  };
}

export function adminAccessMail(url: string, granterName: string) {
  return {
    subject: `${granterName} te ha dado acceso al panel de actividad de Inspo`,
    html: layout("Ya puedes ver la actividad de Inspo", `${esc(granterName)} te ha dado acceso al panel de actividad: quién está conectado, cuánto tiempo pasa cada persona en la app y en qué zona.`, { label: "Abrir el panel", url }, "Entra con este mismo correo. Si no esperabas este acceso, puedes ignorar el mensaje."),
    text: `${granterName} te ha dado acceso al panel de actividad de Inspo. Entra con este correo y ábrelo aquí:\n${url}\n\n${SIGNATURE}\n${REPLY_TO}`,
  };
}

