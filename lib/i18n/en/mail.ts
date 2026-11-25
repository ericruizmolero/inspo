// The words of the emails that are built in code. Same keys as lib/i18n/es/mail.ts.
//
// Most emails are Resend templates, and their wording is edited in Resend, not here (lib/mail-templates.ts). What
// stays here: the layout every email shares (lib/mail-layout.ts), and the emails made from lists, whose body
// lib/mail.ts builds: the digest, a client's comments, a Vault release, a plan request and feedback to the partners.
//
// The rule: an email goes out in the language of WHO RECEIVES IT, not who triggers it.
// Who decides in each case is in localeForEmail (lib/mail.ts).
export const mail = {
  /** What every email says around its body (lib/mail-layout.ts): the greeting, the signature and the foot */
  layout: {
    greeting: (name?: string): string => (name ? `Hi ${name},` : "Hi there,"),
    signature: "Eric, Andoni and Alberto",
    why: {
      team: (team: string): string => `You get this because you are in ${team} on criterio.design.`,
      account: "You get this because you have an account on criterio.design.",
      vault: "You get this because you read the whole Vault on criterio.design.",
    },
    stop: "Stop these emails",
    stopNote: "(one click, no sign-in)",
    privacy: "Privacy",
    terms: "Terms",
    taxId: "tax number",
  },

  /** A plan asked for from Settings, Plan (lib/plan-requests.ts): `period` also fills the template that acknowledges it */
  plans: {
    period: { month: "monthly", year: "yearly" },
    newSubject: (account: string, plan: string, period: string): string => `New plan request: ${account} asks for ${plan}, ${period}`,
    newText: (account: string, owner: string, now: string, plan: string, period: string, price: string, workspaces: string): string =>
      `${account} (${owner}) asks to move from ${now} to ${plan}, paid ${period}: ${price}, without VAT.\nWorkspaces: ${workspaces}\n\nCharge them, then set the plan.`,
    setPlan: "Set the plan",
  },

  /** To the partners: someone new joined the waitlist (lib/access.ts enlist) */
  waitlist: {
    subject: (email: string): string => `New on the waitlist: ${email}`,
    text: (email: string, source: string, pending: number): string =>
      `${email} joined the waitlist from ${source}. ${pending === 1 ? "1 person is" : `${pending} people are`} waiting now.`,
    sources: { landing: "the website", login: "the login page", other: "a link" },
    open: "Open the waitlist",
  },

  /** What each plan limit is called in the emails that say it is near or reached (lib/limit-mail.ts): RESOURCE */
  limits: { ai: "AI actions", searches: "AI searches", checks: "landing checks", items: "references", storage: "storage" },

  feedback: {
    notes: (n: number): string => (n === 1 ? "1 note" : `${n} notes`),
    subject: (who: string, notes: string, path: string): string => `Feedback from ${who}: ${notes} on ${path}`,
    intro: (who: string, email: string, notes: string, path: string, when: string): string => `${who} (${email}) left ${notes} on ${path} on ${when}.`,
    page: "Page: ",
  },

  // ─── New in the Vault (lib/vault-release.ts) ───────────────────────────────
  // Only to whoever reads the whole Vault; its foot says why it came and how to stop it.
  vaultRelease: {
    subject: (n: number): string => (n === 1 ? "New in the Vault: 1 piece" : `New in the Vault: ${n} pieces`),
    intro: (n: number): string => `${n === 1 ? "There is a new piece" : `There are ${n} new pieces`} in the Vault. Their code is yours: your agent reads it through the connector when it builds.`,
  },

  // ─── Team emails (lib/notify.ts) ───────────────────────────────────────────
  digest: {
    subject: (team: string, summary: string): string => `${team}: ${summary}`,
    title: (team: string): string => `What is new in ${team}`,
    open: "Open Criterio",
    count: {
      refs: (n: number): string => (n === 1 ? "1 new reference" : `${n} new references`),
      comments: (n: number): string => (n === 1 ? "1 comment" : `${n} comments`),
      decisions: (n: number): string => (n === 1 ? "1 decision" : `${n} decisions`),
      proposals: (n: number): string => (n === 1 ? "1 proposal" : `${n} proposals`),
      votes: (n: number): string => (n === 1 ? "1 vote" : `${n} votes`),
      projects: (n: number): string => (n === 1 ? "1 new project" : `${n} new projects`),
    },
    more: (n: number): string => `and ${n} more`,
  },

  // ─── A client's comments (lib/client-comments.ts) ──────────────────────────
  clientComments: {
    subject: (project: string): string => `Your client commented on ${project}`,
    intro: (project: string, link: string): string => `Your client commented on ${project}${link ? ` through the link "${link}"` : ""}:`,
    on: (who: string, reference: string): string => `${who} on ${reference}`,
    answer: "Answer in the project",
  },
};
