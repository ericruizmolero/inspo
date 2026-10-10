// The email text. Same keys as lib/i18n/es/mail.ts.
//
// The rule: an email goes out in the language of WHO RECEIVES IT, not who triggers it.
// Who decides in each case is in localeForEmail (lib/mail.ts).
export const mail = {

  magicLink: {
    subject: "Your link to sign in to criterio.design",
    text: (url: string): string => `Your link to sign in:\n${url}\n\nIt expires in 10 minutes and works once. If you did not ask for it, ignore this email.`,
  },

  invitation: {
    subject: (inviter: string, team: string): string => `${inviter} invites you to the team ${team} on criterio.design`,
    text: (who: string, team: string, invitee: string, url: string): string =>
      `${who} invites you to ${team} on criterio.design:\n${url}\n\nSign in with this same address (${invitee}). The link expires in 7 days.`,
  },

  overCapacity: {
    people: (n: number): string => `${n} ${n === 1 ? "person" : "people"}`,
    subject: (team: string, members: string, plan: string, limit: number): string => `${team} has ${members} and the ${plan} plan allows ${limit}`,
    text: (team: string, plan: string, limit: string, members: string, url: string): string =>
      `${team} has moved to the ${plan} plan, which allows ${limit}, and now there are ${members}.\n\nWe have not removed anyone. While there are more people than the plan allows, the team cannot send new invitations or use the AI. Remove someone, or go back to a bigger plan:\n${url}`,
  },

  adminAccess: {
    subject: (granter: string): string => `${granter} has given you access to the criterio.design activity panel`,
    text: (granter: string, url: string): string => `${granter} gave you access to the criterio.design activity panel:\n${url}\n\nSign in with this same address.`,
  },

  feedback: {
    notes: (n: number): string => (n === 1 ? "1 note" : `${n} notes`),
    subject: (who: string, notes: string, path: string): string => `Feedback from ${who}: ${notes} on ${path}`,
    text: (who: string, email: string, notes: string, path: string, when: string, url: string, markdown: string): string =>
      `${who} (${email}) left ${notes} on ${path} on ${when}.\nPage: ${url}\n\n${markdown}`,
  },

  // ─── Team emails (lib/notify.ts) ───────────────────────────────────────────
  // Every one of these ends with a line that says why it came and how to stop it: one click, no sign-in.
  team: {
    why: (team: string): string => `You get this because you are in ${team} on criterio.design.`,
    stopText: (href: string): string => `Stop these emails (one click, no sign-in):\n${href}`,
  },

  digest: {
    subject: (team: string, summary: string): string => `${team}: ${summary}`,
    title: (team: string): string => `What is new in ${team}`,
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

  reply: {
    subject: (who: string): string => `${who} replied to your comment`,
    text: (who: string, mine: string, theirs: string, url: string): string => `You wrote: ${mine}\n\n${who} replied: ${theirs}\n\nSee it here:\n${url}`,
  },

  proposal: {
    subject: (who: string, accepted: boolean, area: string): string => `${who} ${accepted ? "accepted" : "turned down"} your proposal on ${area}`,
    text: (who: string, accepted: boolean, area: string, project: string, decision: string, url: string): string =>
      `${who} ${accepted ? "accepted" : "turned down"} what you proposed for ${area} in ${project}: ${decision}\n\nOpen it here:\n${url}`,
  },

  paused: {
    subject: "We have paused your team summaries",
    text: (url: string): string => `You have not opened criterio.design in a month, so we have stopped sending the daily summary of your teams. Turn it back on here:\n${url}`,
  },
};
