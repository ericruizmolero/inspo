import type { mail as EnMail } from "../en/mail";

export const mail: typeof EnMail = {
  signature: "Eric, Andoni y Alberto",

  magicLink: {
    subject: "Tu enlace para entrar en criterio.design",
    text: (url: string): string => `Tu enlace para entrar:\n${url}\n\nCaduca en 10 minutos y solo funciona una vez. Si no lo has pedido, ignora este correo.`,
  },

  invitation: {
    subject: (inviter: string, team: string): string => `${inviter} te invita al equipo ${team} en criterio.design`,
    text: (who: string, team: string, invitee: string, url: string): string =>
      `${who} te invita a ${team} en criterio.design:\n${url}\n\nEntra con este mismo correo (${invitee}). El enlace caduca en 7 días.`,
  },

  overCapacity: {
    people: (n: number): string => `${n} ${n === 1 ? "persona" : "personas"}`,
    subject: (team: string, members: string, plan: string, limit: number): string => `${team} tiene ${members} y el plan ${plan} admite ${limit}`,
    text: (team: string, plan: string, limit: string, members: string, url: string): string =>
      `${team} ha pasado al plan ${plan}, que admite ${limit}, y ahora sois ${members}.\n\nNo hemos quitado a nadie. Mientras haya más gente de la que admite el plan, el equipo no puede enviar invitaciones nuevas ni usar la IA. Quita a alguien o vuelve a un plan más grande:\n${url}`,
  },

  adminAccess: {
    subject: (granter: string): string => `${granter} te ha dado acceso al panel de actividad de criterio.design`,
    text: (granter: string, url: string): string => `${granter} te ha dado acceso al panel de actividad de criterio.design:\n${url}\n\nEntra con este mismo correo.`,
  },

  feedback: {
    notes: (n: number): string => (n === 1 ? "1 nota" : `${n} notas`),
    subject: (who: string, notes: string, path: string): string => `Feedback de ${who}: ${notes} en ${path}`,
    text: (who: string, email: string, notes: string, path: string, when: string, url: string, markdown: string): string =>
      `${who} (${email}) ha dejado ${notes} sobre ${path} el ${when}.\nPágina: ${url}\n\n${markdown}`,
  },

  // ─── Correos de equipo (lib/notify.ts) ─────────────────────────────────────
  team: {
    why: (team: string): string => `Lo recibes porque estás en ${team} en criterio.design.`,
    stopText: (href: string): string => `Dejar de recibir estos correos (un clic, sin entrar):\n${href}`,
  },

  digest: {
    subject: (team: string, summary: string): string => `${team}: ${summary}`,
    title: (team: string): string => `Lo nuevo en ${team}`,
    count: {
      refs: (n: number): string => (n === 1 ? "1 referencia nueva" : `${n} referencias nuevas`),
      comments: (n: number): string => (n === 1 ? "1 comentario" : `${n} comentarios`),
      decisions: (n: number): string => (n === 1 ? "1 decisión" : `${n} decisiones`),
      proposals: (n: number): string => (n === 1 ? "1 propuesta" : `${n} propuestas`),
      votes: (n: number): string => (n === 1 ? "1 voto" : `${n} votos`),
      projects: (n: number): string => (n === 1 ? "1 proyecto nuevo" : `${n} proyectos nuevos`),
    },
    more: (n: number): string => `y ${n} más`,
  },

  reply: {
    subject: (who: string): string => `${who} ha respondido a tu comentario`,
    text: (who: string, mine: string, theirs: string, url: string): string => `Escribiste: ${mine}\n\n${who} responde: ${theirs}\n\nMíralo aquí:\n${url}`,
  },

  proposal: {
    subject: (who: string, accepted: boolean, area: string): string => `${who} ha ${accepted ? "aceptado" : "descartado"} tu propuesta de ${area}`,
    text: (who: string, accepted: boolean, area: string, project: string, decision: string, url: string): string =>
      `${who} ha ${accepted ? "aceptado" : "descartado"} lo que propusiste para ${area} en ${project}: ${decision}\n\nÁbrelo aquí:\n${url}`,
  },

  paused: {
    subject: "Hemos parado los resúmenes de tus equipos",
    text: (url: string): string => `Llevas un mes sin abrir criterio.design, así que hemos dejado de mandarte el resumen diario de tus equipos. Vuelve a activarlo aquí:\n${url}`,
  },
};
