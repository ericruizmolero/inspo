// The email text. Same keys as lib/i18n/es/mail.ts.
//
// The rule: an email goes out in the language of WHO RECEIVES IT, not who triggers it.
// Who decides in each case is in localeForEmail (lib/mail.ts).
export const mail = {
  signature: "criterio.design, your team's inspiration library",
  fallbackNote: (href: string): string => `If the button does not work, <a href="${href}" style="color:#a3a3a3;text-decoration:underline">open this link</a>.`,
  questions: (email: string): string => `If you have questions, write to <a href="mailto:${email}" style="color:#a3a3a3;text-decoration:underline">${email}</a>.`,

  magicLink: {
    subject: "Your link to sign in to criterio.design",
    title: "Sign in to criterio.design",
    body: (who: string): string => `You asked to sign in to criterio.design${who}. Press the button to sign in: the link expires in 10 minutes and works once.`,
    withAddress: (email: string): string => ` with the address ${email}`,
    cta: "Sign in",
    note: "If you did not ask for this email, you can ignore it: nobody can get in without this link.",
    text: (who: string, url: string): string => `You asked to sign in to criterio.design${who}. Use this link (it expires in 10 minutes and works once):\n${url}\n\nIf you did not ask for it, ignore this email.`,
  },

  invitation: {
    subject: (inviter: string, team: string): string => `${inviter} invites you to the team ${team} on criterio.design`,
    title: (team: string): string => `You are invited to ${team}`,
    body: (who: string, team: string, invitee: string): string =>
      `${who} wants you to join <strong style="color:#f2f2f2;font-weight:500">${team}</strong> on criterio.design: sites, videos and ideas kept in one place, each with its DESIGN.md. You will share the same library.<br><br>Sign in with this same address: <strong style="color:#f2f2f2;font-weight:500">${invitee}</strong>.`,
    cta: "Accept the invitation",
    note: "The link expires in 7 days. If you were not expecting this invitation, you can ignore this email.",
    text: (inviter: string, inviterEmail: string, team: string, invitee: string, url: string): string =>
      `${inviter} (${inviterEmail}) invites you to the team ${team} on criterio.design. You will share the same inspiration library.\n\nSign in with this same address (${invitee}) and accept here:\n${url}\n\nThe link expires in 7 days.`,
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
    subject: (granter: string): string => `${granter} has given you access to the criterio.design activity panel`,
    title: "You can see the criterio.design activity now",
    body: (granter: string): string => `${granter} has given you access to the activity panel: who is online, how long each person spends in the app, and in which area.`,
    cta: "Open the panel",
    note: "Sign in with this same address. If you were not expecting this access, you can ignore the message.",
    text: (granter: string, url: string): string => `${granter} has given you access to the criterio.design activity panel. Sign in with this address and open it here:\n${url}`,
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

  // ─── Team emails (lib/notify.ts) ───────────────────────────────────────────
  // Every one of these ends with a line that says why it came and how to stop it: one click, no sign-in.
  team: {
    why: (team: string): string => `You get this because you are in ${team} on criterio.design.`,
    stop: "Stop these emails",
    stopNote: (href: string, settings: string): string =>
      `<a href="${href}" style="color:#a3a3a3;text-decoration:underline">Stop these emails</a> with one click, or choose which ones you get in <a href="${settings}" style="color:#a3a3a3;text-decoration:underline">Account</a>.`,
    stopText: (href: string): string => `Stop these emails (one click, no sign-in):\n${href}`,
  },

  digest: {
    subject: (team: string, summary: string): string => `${team}: ${summary}`,
    title: (team: string): string => `What is new in ${team}`,
    body: "What the others did since you last looked. One email a day at most, and none when nothing happened or you were already there.",
    count: {
      refs: (n: number): string => (n === 1 ? "1 new reference" : `${n} new references`),
      comments: (n: number): string => (n === 1 ? "1 comment" : `${n} comments`),
      decisions: (n: number): string => (n === 1 ? "1 decision" : `${n} decisions`),
      proposals: (n: number): string => (n === 1 ? "1 proposal" : `${n} proposals`),
      votes: (n: number): string => (n === 1 ? "1 vote" : `${n} votes`),
      projects: (n: number): string => (n === 1 ? "1 new project" : `${n} new projects`),
    },
    more: (n: number): string => `and ${n} more`,
    cta: "Open the team",
    note: "",
  },

  reply: {
    subject: (who: string): string => `${who} replied to your comment`,
    title: (who: string): string => `${who} replied to you`,
    body: (who: string, mine: string, theirs: string): string =>
      `You wrote:<br><span style="color:#6b6b6b">${mine}</span><br><br>${who} replied:<br><strong style="color:#f2f2f2;font-weight:500">${theirs}</strong>`,
    cta: "See the reply",
    note: "Reply to this email to answer directly.",
    text: (who: string, mine: string, theirs: string, url: string): string => `You wrote: ${mine}\n\n${who} replied: ${theirs}\n\nSee it here:\n${url}`,
  },

  proposal: {
    subject: (who: string, accepted: boolean, area: string): string => `${who} ${accepted ? "accepted" : "turned down"} your proposal on ${area}`,
    title: (accepted: boolean): string => (accepted ? "Your proposal is in" : "Your proposal was turned down"),
    body: (who: string, accepted: boolean, area: string, project: string, decision: string): string =>
      `${who} ${accepted ? "accepted" : "turned down"} what you proposed for <strong style="color:#f2f2f2;font-weight:500">${area}</strong> in ${project}:<br><span style="color:#6b6b6b">${decision}</span>`,
    cta: "Open the system",
    note: "",
    text: (who: string, accepted: boolean, area: string, project: string, decision: string, url: string): string =>
      `${who} ${accepted ? "accepted" : "turned down"} what you proposed for ${area} in ${project}: ${decision}\n\nOpen it here:\n${url}`,
  },

  paused: {
    subject: "We have paused your team summaries",
    title: "Summaries paused",
    body: "You have not opened criterio.design in a month, so we have stopped sending the daily summary of your teams. Nothing else changes: your references and teams are where you left them.",
    cta: "Turn it back on",
    note: "If you prefer the quiet, do nothing.",
    text: (url: string): string => `You have not opened criterio.design in a month, so we have stopped sending the daily summary of your teams. Turn it back on here:\n${url}`,
  },
};
