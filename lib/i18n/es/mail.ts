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

  membership: {
    joinedSubject: (who: string, team: string): string => `${who} ha entrado en ${team}`,
    joinedText: (who: string, team: string, url: string): string => `${who} ha aceptado la invitación y ya está en ${team}:\n${url}`,
    endingSubject: (team: string): string => `Tu invitación a ${team} caduca mañana`,
    endingText: (inviter: string, team: string, invitee: string, url: string): string =>
      `${inviter} te invitó a ${team} en criterio.design, y el enlace deja de funcionar mañana:\n${url}\n\nEntra con este mismo correo (${invitee}). Si caduca, pídele otro a ${inviter}.`,
    roleSubject: (team: string, role: string): string => `Tu rol en ${team} ahora es ${role}`,
    roleText: (who: string, team: string, role: string, admin: boolean, url: string): string =>
      `${who} te ha cambiado el rol en ${team}: ahora eres ${role}. ${admin ? "Puedes invitar a gente, cambiar sus roles y quitarla." : "Sigues trabajando en el equipo como antes; invitar y gestionar a la gente queda para el propietario y los admins."}\n${url}`,
    removedSubject: (team: string): string => `Ya no estás en ${team}`,
    removedText: (who: string, team: string): string =>
      `${who} te ha quitado de ${team}. Sus proyectos y referencias se quedan en el equipo; tu espacio y tus otros equipos siguen como estaban.\n\nSi ha sido un error, pídele a ${who} que te invite otra vez.`,
    ownerSubject: (team: string): string => `Ahora ${team} es tuyo`,
    ownerText: (who: string, team: string, url: string): string =>
      `${who} te ha pasado ${team}. Ahora eres su propietario: puedes eliminar el equipo y nadie puede quitarte. ${who} se queda como admin.\n\nEl plan y sus facturas siguen a nombre de quien los pagaba.\n${url}`,
    deletedSubject: (team: string): string => `${team} se ha eliminado`,
    deletedText: (who: string, team: string): string =>
      `${who} ha eliminado ${team}, con sus proyectos, referencias y comentarios. Tu espacio y tus otros equipos siguen como estaban.`,
  },

  personalInvite: {
    subject: (inviter: string): string => `${inviter} te invita a criterio.design`,
    text: (who: string, plan: string, invitee: string, url: string): string =>
      `${who} tiene una invitación a criterio.design para ti:\n${url}\n\nTendrás tu propio espacio en el plan ${plan}. Entra con este mismo correo (${invitee}).`,
  },

  overCapacity: {
    people: (n: number): string => `${n} ${n === 1 ? "persona" : "personas"}`,
    subject: (team: string, members: string, plan: string, limit: number): string => `${team} tiene ${members} y el plan ${plan} admite ${limit}`,
    text: (team: string, plan: string, limit: string, members: string, url: string): string =>
      `${team} ha pasado al plan ${plan}, que admite ${limit}, y ahora sois ${members}.\n\nNo hemos quitado a nadie y la IA sigue funcionando. Mientras haya más gente de la que admite el plan, el equipo no puede enviar invitaciones nuevas. Quita a alguien o vuelve a un plan más grande:\n${url}`,
  },

  fairUse: {
    subject: (account: string, ceiling: string): string => `${account} ha pasado las ${ceiling} búsquedas este mes`,
    text: (account: string, plan: string, used: string, ceiling: string): string =>
      `Este mes ${account} lleva ${used} búsquedas. En el plan ${plan} las búsquedas son de uso justo, y ${ceiling} al mes es mucho más de lo que hace un equipo normal.\n\nNo hemos cortado nada y puedes seguir buscando. Si no sabes de dónde salen tantas, contesta a este correo y lo miramos juntos.`,
  },

  plans: {
    period: { month: "mensual", year: "anual" },
    newSubject: (account: string, plan: string, period: string): string => `Nueva petición de plan: ${account} pide ${plan}, ${period}`,
    newText: (account: string, owner: string, now: string, plan: string, period: string, price: string, workspaces: string, url: string): string =>
      `${account} (${owner}) pide pasar de ${now} a ${plan}, con pago ${period}: ${price}, sin IVA.\nEspacios: ${workspaces}\n\nCóbralo y activa el plan aquí:\n${url}`,
    gotSubject: "Hemos recibido tu petición",
    gotText: (plan: string, period: string, account: string): string =>
      `Hemos recibido tu petición del plan ${plan}, con pago ${period}, para ${account}.\n\nTe escribimos hoy para el pago y lo activamos en el día. Si tienes alguna duda, contesta a este correo.`,
    onSubject: (plan: string): string => `Tu plan ya está activo: ${plan}`,
    onText: (plan: string, account: string, url: string, until?: string): string =>
      `${account} está en el plan ${plan} desde ahora${until ? `, hasta el ${until}` : ""}, y todo lo que incluye ya funciona:\n${url}\n\n${until ? "Una semana antes de que acabe te lo recordamos; después vuelve a Gratis y no se borra nada.\n\n" : ""}Gracias por la confianza.`,
  },

  adminAccess: {
    subject: (granter: string): string => `${granter} te ha dado acceso al panel de actividad de criterio.design`,
    text: (granter: string, url: string): string => `${granter} te ha dado acceso al panel de actividad de criterio.design:\n${url}\n\nEntra con este mismo correo.`,
  },

  onTheList: {
    subject: "Ya estás en la lista",
    text: (email: string): string => `Ya estás en la lista de espera de criterio.design con este correo (${email}). Abrimos por tandas; cuando te toque, te escribimos con un enlace para entrar.\n\nSi no has sido tú, responde a este correo y te quitamos de la lista.`,
  },

  accessInvite: {
    subject: "Ya puedes entrar",
    text: (url: string, email: string): string => `Ya puedes entrar en criterio.design:\n${url}\n\nEntra con este mismo correo (${email}).`,
  },

  feedback: {
    notes: (n: number): string => (n === 1 ? "1 nota" : `${n} notas`),
    subject: (who: string, notes: string, path: string): string => `Feedback de ${who}: ${notes} en ${path}`,
    text: (who: string, email: string, notes: string, path: string, when: string, url: string, markdown: string): string =>
      `${who} (${email}) ha dejado ${notes} sobre ${path} el ${when}.\nPágina: ${url}\n\n${markdown}`,
  },

  // ─── Nuevo en el Vault (lib/vault-release.ts) ──────────────────────────────
  vaultRelease: {
    subject: (n: number): string => (n === 1 ? "Nuevo en el Vault: 1 pieza" : `Nuevo en el Vault: ${n} piezas`),
    intro: (n: number): string => `${n === 1 ? "Hay una pieza nueva" : `Hay ${n} piezas nuevas`} en el Vault. Su código es tuyo: tu agente lo lee por el conector cuando construye.`,
    why: "Te llega porque lees el Vault entero en criterio.design.",
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

  shareInvite: {
    subject: (who: string, project: string): string => `${who} quiere tu opinión sobre ${project}`,
    text: (who: string, project: string, url: string): string => `${who} te ha compartido el tablón de ${project} en criterio.design. Abre cada referencia, coméntala y elige las que te gustan:\n${url}\n\nEl enlace es solo tuyo: lo que escribas irá con tu nombre. No hace falta cuenta.`,
  },

  clientAnswers: {
    subject: (project: string): string => `Tu cliente ha respondido sobre ${project}`,
    text: (project: string, n: number, url: string): string => `Tu cliente ha respondido ${n === 1 ? "1 pregunta" : `${n} preguntas`} sobre ${project}. El archivo no ha cambiado: lanza una pasada cuando quieras que las lea.\n\nÁbrelo aquí:\n${url}`,
  },

  // ─── Los comentarios de un cliente, y dos semanas fuera (lib/client-comments.ts, lib/win-back.ts) ─────────
  clientComments: {
    subject: (project: string): string => `Tu cliente ha comentado en ${project}`,
    intro: (project: string, link: string): string => `Tu cliente ha comentado en ${project}${link ? ` desde el enlace "${link}"` : ""}:`,
    line: (who: string, reference: string, body: string): string => `${who} en ${reference}: ${body}`,
    open: (url: string): string => `Respóndele en el proyecto:\n${url}`,
  },

  winBack: {
    subject: "Tu criterio sigue donde lo dejaste",
    text: (project: string, url: string): string => `Llevas dos semanas sin abrir criterio.design. ${project} sigue donde lo dejaste:\n${url}\n\nSi algo te frenó, responde y cuéntanoslo.`,
    why: "Te llega porque tienes una cuenta en criterio.design.",
  },

  proposal: {
    subject: (who: string, accepted: boolean, area: string): string => `${who} ha ${accepted ? "aceptado" : "descartado"} tu propuesta de ${area}`,
    text: (who: string, accepted: boolean, area: string, project: string, decision: string, url: string): string =>
      `${who} ha ${accepted ? "aceptado" : "descartado"} lo que propusiste para ${area} en ${project}: ${decision}\n\nÁbrelo aquí:\n${url}`,
  },

  welcome: {
    subject: "Por dónde empezar en Criterio",
    intro: (url: string): string =>
      `Ya tienes tu espacio:\n${url}\n\n` +
      `Estos son los primeros pasos, en el orden que seguiríamos nosotros. La app tiene la misma lista junto a tu plan y marca cada uno según lo haces.`,
    steps: {
      project: (): string => "Crea un proyecto. Uno por cada marca o producto en el que trabajas.",
      refs: (goal: number): string => `Guarda ${goal} referencias en él. Con la extensión del navegador, pegando un enlace o importando un tablero que ya tengas en Are.na, Pinterest o Cosmos.`,
      polish: (): string => "Pule el tablón. Tino te pregunta por cada referencia y tú eliges. Lo que olvidas vuelve al Cajón.",
      out: (): string => "Conecta tu IA. Claude, ChatGPT, Cursor o Claude Code leen tus referencias antes de construir. Está en Conectores, en la barra de arriba.",
    },
    example: "¿Prefieres ver uno terminado antes? Abre uno de los Ejemplos en Descubrir. Un ejemplo no gasta el proyecto del plan gratis.",
    outro: "Si algo se atasca, responde a este correo.",
  },

  nudge: {
    steps: {
      project: {
        subject: (): string => "Tu cuenta de Criterio aún no tiene proyecto",
        text: ({ url }: { url: string }): string =>
          `Tu cuenta en Criterio aún no tiene ningún proyecto. Empieza uno aquí, uno por cada marca o producto en el que trabajas:\n${url}\n\n` +
          `O abre uno de los Ejemplos en Descubrir para ver uno terminado antes. Un ejemplo no gasta el proyecto del plan gratis.`,
      },
      refs: {
        subject: ({ refs, goal }: { refs: number; goal: number }): string => refs ? `Tu proyecto tiene ${refs} de sus primeras ${goal} referencias` : "Tu proyecto sigue vacío",
        text: ({ url, refs, goal }: { url: string; refs: number; goal: number }): string =>
          `${refs ? `Tu proyecto en Criterio tiene ${refs} de las ${goal} referencias con las que arranca. Guarda las que faltan aquí` : `Tu proyecto en Criterio aún no tiene referencias. Guarda las ${goal} primeras aquí`}:\n${url}\n\n` +
          `Lo más rápido es traer un tablero que ya tengas. Pega el enlace de un tablero de Are.na, Pinterest o Cosmos donde Criterio te pide un enlace, y entra todo lo que guardaste.`,
      },
      polish: {
        subject: (): string => "Tu tablón está listo para pulir",
        text: ({ url }: { url: string }): string =>
          `Tu proyecto en Criterio ya tiene sus referencias. El siguiente paso es pulir el tablón. Tino te pregunta por cada referencia y tú eliges cuál se queda:\n${url}`,
      },
      out: {
        subject: (): string => "Conecta tu IA a tus referencias",
        text: ({ url }: { url: string }): string =>
          `Tu tablón en Criterio ya está pulido. El último paso es conectar tu IA, para que Claude, ChatGPT, Cursor o Claude Code lean tus referencias antes de construir. Abre tu proyecto y pulsa Conectores en la barra de arriba:\n${url}`,
      },
    },
    stuck: "Si te has atascado en algún punto, responde y cuéntanos dónde.",
    why: "Te llega porque abriste una cuenta en criterio.design.",
  },

  afterWelcome: {
    extensionLink: {
      subject: "La extensión de Criterio, para tu ordenador",
      text: (url: string): string =>
        `Pediste este enlace mientras empezabas en Criterio. Ábrelo en un ordenador con Chrome, Edge, Arc u otro navegador Chromium e instala la extensión desde ahí:\n${url}\n\n` +
        `Con ella, un clic guarda la página en la que estás, y entran tus marcadores de X y del navegador.`,
    },
    connect: {
      subject: "Conecta tu agente a Criterio",
      text: ({ address, url }: { address: string; url: string }): string =>
        `Empezaste en Criterio hace unos días sin conectar tu agente. Conectado, Claude, ChatGPT, Cursor o Claude Code leen tus referencias y tu criterio.md antes de construir.\n\n` +
        `Se hace en un minuto. La dirección del conector es:\n${address}\n\n` +
        `- Claude: abre Ajustes, luego Conectores, añade un conector personalizado, pega la dirección y pulsa Conectar.\n` +
        `- ChatGPT: abre Ajustes, luego Conectores, y crea uno (pide el modo desarrollador). Pega la dirección y deja el acceso como OAuth.\n` +
        `- Cursor: abre Ajustes, luego MCP, y añade un servidor con la dirección.\n` +
        `- Claude Code: escribe /plugin marketplace add ericruizmolero/inspo, luego /plugin install criterio@criterio y /criterio:setup.\n\n` +
        `Cada uno te pide permitir Criterio una vez. Los mismos pasos están en la app, en Conectores, en la barra de arriba:\n${url}`,
    },
  },

  paused: {
    subject: "Hemos parado los resúmenes de tus equipos",
    text: (url: string): string => `Llevas un mes sin abrir criterio.design, así que hemos dejado de mandarte el resumen diario de tus equipos. Vuelve a activarlo aquí:\n${url}`,
  },

  // ─── El ciclo del plan (lib/plan-change.ts) y borrar una cuenta (lib/account-delete.ts) ────────────────────
  planDown: {
    subject: (plan: string): string => `Tu plan ahora es ${plan}`,
    text: (plan: string, account: string, what: string, url: string): string =>
      `${account} está en el plan ${plan} desde hoy.\n\n${what}\n\nLos planes y lo que incluye cada uno:\n${url}`,
    what: (plan: string, vaultLocks: boolean): string =>
      `No se borra nada: tus referencias, proyectos, archivos y personas siguen donde están. Lo que pasa de los límites del plan ${plan} se queda, pero no se puede añadir más hasta que haya sitio o subas de plan.` +
      (vaultLocks ? " Las piezas del Vault de los planes de pago vuelven a cerrarse." : ""),
  },

  giftEnds: {
    subject: (date: string): string => `Tu regalo termina el ${date}`,
    text: (plan: string, account: string, date: string, what: string, url: string): string =>
      `El plan ${plan} que regalamos a ${account} termina el ${date}. Después la cuenta vuelve a Gratis.\n\n${what}\n\nPara seguir en ${plan}, pídelo aquí y lo activamos antes de que acabe el regalo:\n${url}`,
  },

  giftEnded: {
    subject: "De vuelta en Gratis",
    text: (plan: string, account: string, what: string, url: string): string =>
      `El plan ${plan} que regalamos a ${account} ha terminado, y la cuenta vuelve a estar en Gratis.\n\n${what}\n\nPara volver a ${plan}, pídelo aquí:\n${url}`,
  },

  accountDeleted: {
    subject: "Tu cuenta está borrada",
    text: (email: string): string =>
      `Hemos borrado tu cuenta de criterio.design (${email}): tu espacio personal, los equipos en los que solo estabas tú y tu sitio en los demás.\n\nSi no has sido tú quien lo ha pedido, responde a este correo cuanto antes.`,
  },
};
