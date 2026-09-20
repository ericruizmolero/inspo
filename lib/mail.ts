// Envío de correos transaccionales (magic link, invitaciones).
// Con RESEND_API_KEY usa Resend; sin ella (local) imprime el enlace en consola
// y lo guarda en .data/last-mail.txt para poder probar sin correo.
import { promises as fs } from "fs";
import path from "path";

const FROM = process.env.MAIL_FROM || "Inspo <inspo@savvia.studio>";

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
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function layout(title: string, body: string, cta: { label: string; url: string }) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#0d0d0d;color:#f2f2f2;font-family:ui-sans-serif,system-ui,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:48px 24px">
    <div style="font-size:22px;font-weight:700;margin-bottom:24px">Inspo</div>
    <h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
    <p style="color:#b4b4b4;line-height:1.5;margin:0 0 24px">${body}</p>
    <a href="${cta.url}" style="display:inline-block;background:#f2f2f2;color:#0d0d0d;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">${esc(cta.label)}</a>
    <p style="color:#7a7a7a;font-size:12px;margin-top:32px;word-break:break-all">Si el botón no funciona, copia este enlace: ${esc(cta.url)}</p>
  </div></body></html>`;
}

export function magicLinkMail(url: string) {
  return {
    subject: "Tu enlace para entrar en Inspo",
    html: layout("Entrar en Inspo", "Haz clic en el botón para iniciar sesión. El enlace caduca en 10 minutos.", { label: "Entrar", url }),
    text: `Entra en Inspo con este enlace (caduca en 10 minutos):\n${url}`,
  };
}

export function invitationMail(url: string, teamName: string, inviterName: string) {
  return {
    subject: `${inviterName} te invita al equipo ${teamName} en Inspo`,
    html: layout(`Te invitan a ${esc(teamName)}`, `${esc(inviterName)} quiere que te unas a su librería de inspiración.`, { label: "Aceptar invitación", url }),
    text: `${inviterName} te invita al equipo ${teamName} en Inspo. Acepta aquí:\n${url}`,
  };
}
