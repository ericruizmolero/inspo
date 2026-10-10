import type { mail as EnMail } from "../en/mail";

export const mail: typeof EnMail = {
  signature: "criterio.design, la biblioteca de inspiración de tu equipo",
  fallbackNote: (href: string): string => `Si el botón no funciona, <a href="${href}" style="color:#a3a3a3;text-decoration:underline">abre este enlace</a>.`,
  questions: (email: string): string => `Si tienes dudas, escríbenos a <a href="mailto:${email}" style="color:#a3a3a3;text-decoration:underline">${email}</a>.`,

  magicLink: {
    subject: "Tu enlace para entrar en criterio.design",
    title: "Entrar en criterio.design",
    body: (who: string): string => `Has pedido entrar en criterio.design${who}. Pulsa el botón para iniciar sesión: el enlace caduca en 10 minutos y solo funciona una vez.`,
    withAddress: (email: string): string => ` con la dirección ${email}`,
    cta: "Entrar",
    note: "Si no has pedido este correo, puedes ignorarlo: nadie puede entrar sin este enlace.",
    text: (who: string, url: string): string => `Has pedido entrar en criterio.design${who}. Entra con este enlace (caduca en 10 minutos y solo funciona una vez):\n${url}\n\nSi no lo has pedido, ignora este correo.`,
  },

  invitation: {
    subject: (inviter: string, team: string): string => `${inviter} te invita al equipo ${team} en criterio.design`,
    title: (team: string): string => `Te invitan a ${team}`,
    body: (who: string, team: string, invitee: string): string =>
      `${who} quiere que te unas a <strong style="color:#f2f2f2;font-weight:500">${team}</strong> en criterio.design: webs, vídeos e ideas guardadas en un sitio, cada una con su DESIGN.md. Compartiréis la misma librería.<br><br>Entra con este mismo correo: <strong style="color:#f2f2f2;font-weight:500">${invitee}</strong>.`,
    cta: "Aceptar invitación",
    note: "El enlace caduca en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.",
    text: (inviter: string, inviterEmail: string, team: string, invitee: string, url: string): string =>
      `${inviter} (${inviterEmail}) te invita al equipo ${team} en criterio.design. Compartiréis la misma librería de inspiración.\n\nEntra con este mismo correo (${invitee}) y acepta aquí:\n${url}\n\nEl enlace caduca en 7 días.`,
  },

  overCapacity: {
    people: (n: number): string => `${n} ${n === 1 ? "persona" : "personas"}`,
    subject: (team: string, members: string, plan: string, limit: number): string => `${team} tiene ${members} y el plan ${plan} admite ${limit}`,
    title: "Sobra gente para el plan nuevo",
    body: (team: string, plan: string, limit: string, members: string): string =>
      `<strong style="color:#f2f2f2;font-weight:500">${team}</strong> ha pasado al plan ${plan}, que admite ${limit}, y ahora mismo sois ${members}.<br><br>No hemos quitado a nadie. Mientras haya más gente de la que admite el plan, el equipo no puede enviar invitaciones nuevas ni usar la IA (DESIGN.md, etiquetas y búsquedas). Tú decides: quita a alguien del equipo o vuelve a un plan más grande.`,
    cta: "Abrir el equipo",
    note: "Nadie ha perdido su sitio ni sus inspos.",
    text: (team: string, plan: string, limit: string, members: string, url: string): string =>
      `${team} ha pasado al plan ${plan}, que admite ${limit}, y ahora sois ${members}.\n\nNo hemos quitado a nadie. Mientras haya más gente de la que admite el plan, el equipo no puede enviar invitaciones nuevas ni usar la IA. Quita a alguien o vuelve a un plan más grande:\n${url}`,
  },

  adminAccess: {
    subject: (granter: string): string => `${granter} te ha dado acceso al panel de actividad de criterio.design`,
    title: "Ya puedes ver la actividad de criterio.design",
    body: (granter: string): string => `${granter} te ha dado acceso al panel de actividad: quién está conectado, cuánto tiempo pasa cada persona en la app y en qué zona.`,
    cta: "Abrir el panel",
    note: "Entra con este mismo correo. Si no esperabas este acceso, puedes ignorar el mensaje.",
    text: (granter: string, url: string): string => `${granter} te ha dado acceso al panel de actividad de criterio.design. Entra con este correo y ábrelo aquí:\n${url}`,
  },

  feedback: {
    notes: (n: number): string => (n === 1 ? "1 nota" : `${n} notas`),
    title: (notes: string, who: string): string => `${notes} de ${who}`,
    subject: (who: string, notes: string, path: string): string => `Feedback de ${who}: ${notes} en ${path}`,
    intro: (who: string, email: string, notes: string, path: string, when: string): string =>
      `${who} (<a href="mailto:${email}" style="color:#a3a3a3;text-decoration:underline">${email}</a>) ha dejado ${notes} sobre <strong style="color:#f2f2f2;font-weight:500">${path}</strong> el ${when}. Debajo va el feedback tal cual lo copia la barra: pégaselo al agente.`,
    cta: "Abrir la página",
    note: "Responde a este correo para hablar directamente con quien ha dejado el feedback.",
    text: (who: string, email: string, notes: string, path: string, when: string, url: string, markdown: string): string =>
      `${who} (${email}) ha dejado ${notes} sobre ${path} el ${when}.\nPágina: ${url}\n\n${markdown}`,
  },

  // ─── Correos de equipo (lib/notify.ts) ─────────────────────────────────────
  team: {
    why: (team: string): string => `Lo recibes porque estás en ${team} en criterio.design.`,
    stop: "Dejar de recibir estos correos",
    stopNote: (href: string, settings: string): string =>
      `<a href="${href}" style="color:#a3a3a3;text-decoration:underline">Deja de recibir estos correos</a> con un clic, o elige cuáles te llegan en <a href="${settings}" style="color:#a3a3a3;text-decoration:underline">Cuenta</a>.`,
    stopText: (href: string): string => `Dejar de recibir estos correos (un clic, sin entrar):\n${href}`,
  },

  digest: {
    subject: (team: string, summary: string): string => `${team}: ${summary}`,
    title: (team: string): string => `Lo nuevo en ${team}`,
    body: "Lo que hicieron los demás desde la última vez que miraste. Como mucho un correo al día, y ninguno si no pasó nada o ya estabas ahí.",
    count: {
      refs: (n: number): string => (n === 1 ? "1 referencia nueva" : `${n} referencias nuevas`),
      comments: (n: number): string => (n === 1 ? "1 comentario" : `${n} comentarios`),
      decisions: (n: number): string => (n === 1 ? "1 decisión" : `${n} decisiones`),
      proposals: (n: number): string => (n === 1 ? "1 propuesta" : `${n} propuestas`),
      votes: (n: number): string => (n === 1 ? "1 voto" : `${n} votos`),
      projects: (n: number): string => (n === 1 ? "1 proyecto nuevo" : `${n} proyectos nuevos`),
    },
    more: (n: number): string => `y ${n} más`,
    cta: "Abrir el equipo",
    note: "",
  },

  reply: {
    subject: (who: string): string => `${who} ha respondido a tu comentario`,
    title: (who: string): string => `${who} te ha respondido`,
    body: (who: string, mine: string, theirs: string): string =>
      `Escribiste:<br><span style="color:#6b6b6b">${mine}</span><br><br>${who} responde:<br><strong style="color:#f2f2f2;font-weight:500">${theirs}</strong>`,
    cta: "Ver la respuesta",
    note: "Responde a este correo para contestar directamente.",
    text: (who: string, mine: string, theirs: string, url: string): string => `Escribiste: ${mine}\n\n${who} responde: ${theirs}\n\nMíralo aquí:\n${url}`,
  },

  proposal: {
    subject: (who: string, accepted: boolean, area: string): string => `${who} ha ${accepted ? "aceptado" : "descartado"} tu propuesta de ${area}`,
    title: (accepted: boolean): string => (accepted ? "Tu propuesta ya está dentro" : "Tu propuesta se ha descartado"),
    body: (who: string, accepted: boolean, area: string, project: string, decision: string): string =>
      `${who} ha ${accepted ? "aceptado" : "descartado"} lo que propusiste para <strong style="color:#f2f2f2;font-weight:500">${area}</strong> en ${project}:<br><span style="color:#6b6b6b">${decision}</span>`,
    cta: "Abrir el sistema",
    note: "",
    text: (who: string, accepted: boolean, area: string, project: string, decision: string, url: string): string =>
      `${who} ha ${accepted ? "aceptado" : "descartado"} lo que propusiste para ${area} en ${project}: ${decision}\n\nÁbrelo aquí:\n${url}`,
  },

  paused: {
    subject: "Hemos parado los resúmenes de tus equipos",
    title: "Resúmenes en pausa",
    body: "Llevas un mes sin abrir criterio.design, así que hemos dejado de mandarte el resumen diario de tus equipos. Nada más cambia: tus referencias y tus equipos siguen donde los dejaste.",
    cta: "Volver a activarlo",
    note: "Si prefieres el silencio, no hagas nada.",
    text: (url: string): string => `Llevas un mes sin abrir criterio.design, así que hemos dejado de mandarte el resumen diario de tus equipos. Vuelve a activarlo aquí:\n${url}`,
  },
};
