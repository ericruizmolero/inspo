import type { mail as EnMail } from "../en/mail";

export const mail: typeof EnMail = {
  layout: {
    greeting: (name?: string): string => (name ? `Hola, ${name},` : "Hola,"),
    signature: "Eric, Andoni y Alberto",
    why: {
      team: (team: string): string => `Te llega porque estás en ${team} en criterio.design.`,
      account: "Te llega porque tienes una cuenta en criterio.design.",
      vault: "Te llega porque lees el Vault entero en criterio.design.",
    },
    stop: "Dejar de recibir estos correos",
    stopNote: "(un clic, sin entrar)",
    privacy: "Privacidad",
    terms: "Términos",
    taxId: "NIF",
  },

  plans: {
    period: { month: "mensual", year: "anual" },
    newSubject: (account: string, plan: string, period: string): string => `Nueva petición de plan: ${account} pide ${plan}, ${period}`,
    newText: (account: string, owner: string, now: string, plan: string, period: string, price: string, workspaces: string): string =>
      `${account} (${owner}) pide pasar de ${now} a ${plan}, con pago ${period}: ${price}, sin IVA.\nEspacios: ${workspaces}\n\nCóbralo y activa el plan.`,
    setPlan: "Activar el plan",
  },

  waitlist: {
    subject: (email: string): string => `Nuevo en la lista de espera: ${email}`,
    text: (email: string, source: string, pending: number): string =>
      `${email} se ha apuntado a la lista de espera desde ${source}. Ahora ${pending === 1 ? "espera 1 persona" : `esperan ${pending} personas`}.`,
    sources: { landing: "la web", login: "la página de entrada", other: "un enlace" },
    open: "Abrir la lista de espera",
  },

  limits: { ai: "acciones de IA", searches: "búsquedas IA", checks: "revisiones de landing", items: "referencias", storage: "almacenamiento" },

  feedback: {
    notes: (n: number): string => (n === 1 ? "1 nota" : `${n} notas`),
    subject: (who: string, notes: string, path: string): string => `Feedback de ${who}: ${notes} en ${path}`,
    intro: (who: string, email: string, notes: string, path: string, when: string): string => `${who} (${email}) ha dejado ${notes} sobre ${path} el ${when}.`,
    page: "Página: ",
  },

  // ─── Nuevo en el Vault (lib/vault-release.ts) ──────────────────────────────
  vaultRelease: {
    subject: (n: number): string => (n === 1 ? "Nuevo en el Vault: 1 pieza" : `Nuevo en el Vault: ${n} piezas`),
    intro: (n: number): string => `${n === 1 ? "Hay una pieza nueva" : `Hay ${n} piezas nuevas`} en el Vault. Su código es tuyo y tu agente lo lee por el conector cuando construye.`,
  },

  // ─── Correos de equipo (lib/notify.ts) ─────────────────────────────────────
  digest: {
    subject: (team: string, summary: string): string => `${team}: ${summary}`,
    title: (team: string): string => `Lo nuevo en ${team}`,
    open: "Abrir Criterio",
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

  // ─── Los comentarios de un cliente (lib/client-comments.ts) ────────────────
  clientComments: {
    subject: (project: string): string => `Tu cliente ha comentado en ${project}`,
    intro: (project: string, link: string): string => `Tu cliente ha comentado en ${project}${link ? ` desde el enlace "${link}"` : ""}:`,
    on: (who: string, reference: string): string => `${who} en ${reference}`,
    answer: "Responder en el proyecto",
  },
};
