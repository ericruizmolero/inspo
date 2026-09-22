// El texto de los correos. Mismas claves que lib/mail/es.ts.
//
// La regla: un correo sale en el idioma de QUIEN LO RECIBE, no de quien lo provoca.
// Quién lo decide en cada caso está en localeForEmail (lib/mail.ts).
export const mail = {
  signature: "Inspo is the inspiration library of Savvia \u00b7 savvia.studio",
  fallbackNote: (href: string): string => `If the button does not work, <a href="${href}" style="color:#a3a3a3;text-decoration:underline">open this link</a>.`,
  questions: (email: string): string => `If you have questions, write to <a href="mailto:${email}" style="color:#a3a3a3;text-decoration:underline">${email}</a>.`,

  magicLink: {
    subject: "Your link to sign in to Inspo",
    title: "Sign in to Inspo",
    body: (who: string): string => `You asked to sign in to Inspo${who}. Press the button to sign in: the link expires in 10 minutes and works once.`,
    withAddress: (email: string): string => ` with the address ${email}`,
    cta: "Sign in",
    note: "If you did not ask for this email, you can ignore it: nobody can get in without this link.",
    text: (who: string, url: string): string => `You asked to sign in to Inspo${who}. Use this link (it expires in 10 minutes and works once):\n${url}\n\nIf you did not ask for it, ignore this email.`,
  },

  invitation: {
    subject: (inviter: string, team: string): string => `${inviter} invites you to the team ${team} on Inspo`,
    title: (team: string): string => `You are invited to ${team}`,
    body: (who: string, team: string, invitee: string): string =>
      `${who} wants you to join <strong style="color:#f2f2f2;font-weight:500">${team}</strong> on Inspo: sites, videos and ideas kept in one place, each with its DESIGN.md. You will share the same library.<br><br>Sign in with this same address: <strong style="color:#f2f2f2;font-weight:500">${invitee}</strong>.`,
    cta: "Accept the invitation",
    note: "The link expires in 7 days. If you were not expecting this invitation, you can ignore this email.",
    text: (inviter: string, inviterEmail: string, team: string, invitee: string, url: string): string =>
      `${inviter} (${inviterEmail}) invites you to the team ${team} on Inspo. You will share the same inspiration library.\n\nSign in with this same address (${invitee}) and accept here:\n${url}\n\nThe link expires in 7 days.`,
  },

  overCapacity: {
    people: (n: number): string => `${n} ${n === 1 ? "person" : "people"}`,
    subject: (team: string, members: string, plan: string, limit: number): string => `${team} has ${members} and the ${plan} plan allows ${limit}`,
    title: "Too many people for the new plan",
    body: (team: string, plan: string, limit: string, members: string): string =>
      `<strong style="color:#f2f2f2;font-weight:500">${team}</strong> has moved to the ${plan} plan, which allows ${limit}, and right now there are ${members}.<br><br>We have not removed anyone. While there are more people than the plan allows, the team cannot send new invitations or use the AI (DESIGN.md, tags and searches). It is your call: remove someone from the team, or go back to a bigger plan.`,
    cta: "Open the team",
    note: "Nobody has lost their place or their inspos.",
    text: (team: string, plan: string, limit: string, members: string, url: string): string =>
      `${team} has moved to the ${plan} plan, which allows ${limit}, and now there are ${members}.\n\nWe have not removed anyone. While there are more people than the plan allows, the team cannot send new invitations or use the AI. Remove someone, or go back to a bigger plan:\n${url}`,
  },

  adminAccess: {
    subject: (granter: string): string => `${granter} has given you access to the Inspo activity panel`,
    title: "You can see the Inspo activity now",
    body: (granter: string): string => `${granter} has given you access to the activity panel: who is online, how long each person spends in the app, and in which area.`,
    cta: "Open the panel",
    note: "Sign in with this same address. If you were not expecting this access, you can ignore the message.",
    text: (granter: string, url: string): string => `${granter} has given you access to the Inspo activity panel. Sign in with this address and open it here:\n${url}`,
  },

  feedback: {
    notes: (n: number): string => (n === 1 ? "1 note" : `${n} notes`),
    title: (notes: string, who: string): string => `${notes} from ${who}`,
    subject: (who: string, notes: string, path: string): string => `Feedback from ${who}: ${notes} on ${path}`,
    intro: (who: string, email: string, notes: string, path: string, when: string): string =>
      `${who} (<a href="mailto:${email}" style="color:#a3a3a3;text-decoration:underline">${email}</a>) left ${notes} on <strong style="color:#f2f2f2;font-weight:500">${path}</strong> on ${when}. The feedback below is exactly as the bar copies it: paste it to the agent.`,
    cta: "Open the page",
    note: "Reply to this email to talk to whoever left the feedback.",
    text: (who: string, email: string, notes: string, path: string, when: string, url: string, markdown: string): string =>
      `${who} (${email}) left ${notes} on ${path} on ${when}.\nPage: ${url}\n\n${markdown}`,
  },
};
