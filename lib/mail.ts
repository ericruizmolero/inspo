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
  "https://criterio.design";
const DISPLAY = "'Family', 'Schibsted Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const BODY = "'Söhne', 'Schibsted Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Un correo a una o varias direcciones. `replyTo` sustituye a la dirección de respuesta por defecto. */
export async function sendMail(to: string | string[], subject: string, html: string, text: string, opts: { replyTo?: string } = {}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const recipients = Array.isArray(to) ? to : [to];
  if (!key) {
    console.log(`\n✉️  [mail sin RESEND_API_KEY] → ${recipients.join(", ")}\n${subject}\n${text}\n`);
    try {
      await fs.mkdir(path.join(process.cwd(), ".data"), { recursive: true });
      await fs.writeFile(path.join(process.cwd(), ".data", "last-mail.txt"), `${recipients.join(", ")}\n${subject}\n${text}\n`);
    } catch { /* solo es ayuda para desarrollo */ }
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

export function invitationMail(url: string, teamName: string, inviterName: string, inviterEmail: string, inviteeEmail: string) {
  const who = inviterName === inviterEmail ? esc(inviterName) : `${esc(inviterName)} (${esc(inviterEmail)})`;
  const body = `${who} quiere que te unas a <strong style="color:#f2f2f2;font-weight:500">${esc(teamName)}</strong> en Inspo: webs, vídeos e ideas guardadas en un sitio, cada una con su DESIGN.md. Compartiréis la misma librería.<br><br>Entra con este mismo correo: <strong style="color:#f2f2f2;font-weight:500">${esc(inviteeEmail)}</strong>.`;
  return {
    subject: `${inviterName} te invita al equipo ${teamName} en Inspo`,
    html: layout(`Te invitan a ${esc(teamName)}`, body, { label: "Aceptar invitación", url }, "El enlace caduca en 7 días. Si no esperabas esta invitación, puedes ignorar este correo."),
    text: `${inviterName} (${inviterEmail}) te invita al equipo ${teamName} en Inspo. Compartiréis la misma librería de inspiración.\n\nEntra con este mismo correo (${inviteeEmail}) y acepta aquí:\n${url}\n\nEl enlace caduca en 7 días.\n\n${SIGNATURE}\n${REPLY_TO}`,
  };
}

/**
 * Al bajar de plan un equipo puede quedarse con más gente de la que admite el plan nuevo.
 * No se quita a nadie: se avisa al dueño para que decida.
 */
export function overCapacityMail(url: string, teamName: string, planName: string, members: number, limit: number) {
  const n = (x: number) => `${x} ${x === 1 ? "persona" : "personas"}`;
  const body = `<strong style="color:#f2f2f2;font-weight:500">${esc(teamName)}</strong> ha pasado al plan ${esc(planName)}, que admite ${n(limit)}, y ahora mismo sois ${n(members)}.<br><br>No hemos quitado a nadie. Mientras haya más gente de la que admite el plan, el equipo no puede enviar invitaciones nuevas ni usar la IA (DESIGN.md, etiquetas y búsquedas). Tú decides: quita a alguien del equipo o vuelve a un plan más grande.`;
  return {
    subject: `${teamName} tiene ${n(members)} y el plan ${planName} admite ${limit}`,
    html: layout("Sobra gente para el plan nuevo", body, { label: "Abrir el equipo", url }, "Nadie ha perdido su sitio ni sus inspos."),
    text: `${teamName} ha pasado al plan ${planName}, que admite ${n(limit)}, y ahora sois ${n(members)}.\n\nNo hemos quitado a nadie. Mientras haya más gente de la que admite el plan, el equipo no puede enviar invitaciones nuevas ni usar la IA. Quita a alguien o vuelve a un plan más grande:\n${url}\n\n${SIGNATURE}\n${REPLY_TO}`,
  };
}

export function adminAccessMail(url: string, granterName: string) {
  return {
    subject: `${granterName} te ha dado acceso al panel de actividad de Inspo`,
    html: layout("Ya puedes ver la actividad de Inspo", `${esc(granterName)} te ha dado acceso al panel de actividad: quién está conectado, cuánto tiempo pasa cada persona en la app y en qué zona.`, { label: "Abrir el panel", url }, "Entra con este mismo correo. Si no esperabas este acceso, puedes ignorar el mensaje."),
    text: `${granterName} te ha dado acceso al panel de actividad de Inspo. Entra con este correo y ábrelo aquí:\n${url}\n\n${SIGNATURE}\n${REPLY_TO}`,
  };
}

const fmtWhen = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * Feedback visual sobre la app (barra Agentation) para los socios. El cuerpo lleva el
 * markdown tal cual lo copia la barra, listo para pegárselo a un agente; el texto plano
 * es solo el markdown, así que responder o reenviar también sirve.
 */
export function feedbackMail(f: { author: { name: string; email: string }; path: string; url: string; count: number; markdown: string; at: Date }) {
  const who = f.author.name || f.author.email;
  const n = f.count === 1 ? "1 nota" : `${f.count} notas`;
  const title = `${n} de ${who}`;
  const intro = `${esc(who)} (<a href="mailto:${esc(f.author.email)}" style="color:#a3a3a3;text-decoration:underline">${esc(f.author.email)}</a>) ha dejado ${n} sobre <strong style="color:#f2f2f2;font-weight:500">${esc(f.path)}</strong> el ${esc(fmtWhen.format(f.at))}. Debajo va el feedback tal cual lo copia la barra: pégaselo al agente.`;
  const pre = `<pre style="margin:0 0 28px;padding:18px 20px;background:#161616;border:1px solid #262626;border-radius:12px;color:#e5e5e5;font-family:'SF Mono',Menlo,Consolas,'Liberation Mono',monospace;font-size:12.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere">${esc(f.markdown)}</pre>`;
  const html = layout(title, intro, { label: "Abrir la página", url: f.url }, "Responde a este correo para hablar directamente con quien ha dejado el feedback.")
    // El bloque de código va justo antes del botón: el layout no tiene hueco para él
    .replace('<tr><td style="padding:0 0 36px">', `<tr><td style="padding:0 0 0">${pre}</td></tr>\n      <tr><td style="padding:0 0 36px">`);
  return {
    subject: `Feedback de ${who}: ${n} en ${f.path}`,
    html,
    text: `${who} (${f.author.email}) ha dejado ${n} sobre ${f.path} el ${fmtWhen.format(f.at)}.\nPágina: ${f.url}\n\n${f.markdown}\n\n${SIGNATURE}`,
  };
}
