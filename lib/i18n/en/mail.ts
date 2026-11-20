// The email text. Same keys as lib/i18n/es/mail.ts.
//
// The rule: an email goes out in the language of WHO RECEIVES IT, not who triggers it.
// Who decides in each case is in localeForEmail (lib/mail.ts).
export const mail = {
  signature: "Eric, Andoni and Alberto",

  magicLink: {
    subject: "Your link to sign in to criterio.design",
    text: (url: string): string => `Your link to sign in:\n${url}\n\nIt expires in 10 minutes and works once. If you did not ask for it, ignore this email.`,
  },

  invitation: {
    subject: (inviter: string, team: string): string => `${inviter} invites you to the team ${team} on criterio.design`,
    text: (who: string, team: string, invitee: string, url: string): string =>
      `${who} invites you to ${team} on criterio.design:\n${url}\n\nSign in with this same address (${invitee}). The link expires in 7 days.`,
  },

  /** Who is in a team and with what role, told to the person it changes (lib/team-mail.ts) */
  membership: {
    joinedSubject: (who: string, team: string): string => `${who} joined ${team}`,
    joinedText: (who: string, team: string, url: string): string => `${who} accepted the invitation and is in ${team} now:\n${url}`,
    endingSubject: (team: string): string => `Your invitation to ${team} ends tomorrow`,
    endingText: (inviter: string, team: string, invitee: string, url: string): string =>
      `${inviter} invited you to ${team} on criterio.design, and the link stops working tomorrow:\n${url}\n\nSign in with this same address (${invitee}). If it ends, ask ${inviter} for a new one.`,
    roleSubject: (team: string, role: string): string => `Your role in ${team} is now ${role}`,
    roleText: (who: string, team: string, role: string, admin: boolean, url: string): string =>
      `${who} made you ${role} in ${team}. ${admin ? "You can invite people, change their roles and remove them." : "You keep working in the team as before; inviting and managing people is for the owner and the admins."}\n${url}`,
    removedSubject: (team: string): string => `You're no longer in ${team}`,
    removedText: (who: string, team: string): string =>
      `${who} removed you from ${team}. Its projects and references stay with the team; your own space and your other teams are as they were.\n\nIf it was a mistake, ask ${who} to invite you again.`,
    ownerSubject: (team: string): string => `You now own ${team}`,
    ownerText: (who: string, team: string, url: string): string =>
      `${who} handed ${team} over to you. You are its owner now: you can delete the team, and nobody can remove you. ${who} stays on as an admin.\n\nThe plan and its invoices stay with whoever paid them until now.\n${url}`,
    deletedSubject: (team: string): string => `${team} was deleted`,
    deletedText: (who: string, team: string): string =>
      `${who} deleted ${team}, with its projects, references and comments. Your own space and your other teams are as they were.`,
  },

  /** A personal invite from Settings → Invite: access to the product, not a seat in a team */
  personalInvite: {
    subject: (inviter: string): string => `${inviter} invites you to criterio.design`,
    text: (who: string, plan: string, invitee: string, url: string): string =>
      `${who} has an invite to criterio.design for you:\n${url}\n\nYou get your own space on the ${plan} plan. Sign in with this same address (${invitee}).`,
  },

  overCapacity: {
    people: (n: number): string => `${n} ${n === 1 ? "person" : "people"}`,
    subject: (team: string, members: string, plan: string, limit: number): string => `${team} has ${members} and the ${plan} plan allows ${limit}`,
    text: (team: string, plan: string, limit: string, members: string, url: string): string =>
      `${team} has moved to the ${plan} plan, which allows ${limit}, and now there are ${members}.\n\nWe have not removed anyone, and the AI keeps working. While there are more people than the plan allows, the team cannot send new invitations. Remove someone, or go back to a bigger plan:\n${url}`,
  },

  fairUse: {
    subject: (account: string, ceiling: string): string => `${account} has passed ${ceiling} searches this month`,
    text: (account: string, plan: string, used: string, ceiling: string): string =>
      `${account} has made ${used} searches this month. On the ${plan} plan searches are fair use, and ${ceiling} a month is far more than a team usually makes.\n\nWe haven't cut anything off, and you can keep searching. If you don't know where so many come from, reply to this email and we'll look at it together.`,
  },

  /** A plan asked for from Settings, Plan, and switched on from /admin/plans (lib/plan-requests.ts) */
  plans: {
    period: { month: "monthly", year: "yearly" },
    newSubject: (account: string, plan: string, period: string): string => `New plan request: ${account} asks for ${plan}, ${period}`,
    newText: (account: string, owner: string, now: string, plan: string, period: string, price: string, workspaces: string, url: string): string =>
      `${account} (${owner}) asks to move from ${now} to ${plan}, paid ${period}: ${price}, without VAT.\nWorkspaces: ${workspaces}\n\nCharge them, then set the plan here:\n${url}`,
    gotSubject: "We got your request",
    gotText: (plan: string, period: string, account: string): string =>
      `We got your request for the ${plan} plan, paid ${period}, for ${account}.\n\nWe will write to you today to sort out the payment, and switch it on the same day. If you have a question, reply to this email.`,
    onSubject: (plan: string): string => `Your plan is on: ${plan}`,
    onText: (plan: string, account: string, url: string, until?: string): string =>
      `${account} is on the ${plan} plan from now on${until ? `, until ${until}` : ""}, and everything it includes works already:\n${url}\n\n${until ? "A week before it ends we will remind you; after that it goes back to Free and nothing is deleted.\n\n" : ""}Thank you for trusting us with it.`,
  },

  adminAccess: {
    subject: (granter: string): string => `${granter} has given you access to the criterio.design activity panel`,
    text: (granter: string, url: string): string => `${granter} gave you access to the criterio.design activity panel:\n${url}\n\nSign in with this same address.`,
  },

  onTheList: {
    subject: "You're on the list",
    text: (email: string): string => `You're on the criterio.design waitlist with this address (${email}). We let people in by waves; when your turn comes, we'll email you a link to come in.\n\nIf it wasn't you, reply to this email and we'll take you off the list.`,
  },

  accessInvite: {
    subject: "You can come in now",
    text: (url: string, email: string): string => `You can come in to criterio.design now:\n${url}\n\nSign in with this same address (${email}).`,
  },

  feedback: {
    notes: (n: number): string => (n === 1 ? "1 note" : `${n} notes`),
    subject: (who: string, notes: string, path: string): string => `Feedback from ${who}: ${notes} on ${path}`,
    text: (who: string, email: string, notes: string, path: string, when: string, url: string, markdown: string): string =>
      `${who} (${email}) left ${notes} on ${path} on ${when}.\nPage: ${url}\n\n${markdown}`,
  },

  // ─── New in the Vault (lib/vault-release.ts) ───────────────────────────────
  // Only to whoever reads the whole Vault; it ends, like the team emails, with why it came and how to stop it.
  vaultRelease: {
    subject: (n: number): string => (n === 1 ? "New in the Vault: 1 piece" : `New in the Vault: ${n} pieces`),
    intro: (n: number): string => `${n === 1 ? "There is a new piece" : `There are ${n} new pieces`} in the Vault. Their code is yours: your agent reads it through the connector when it builds.`,
    why: "You get this because you read the whole Vault on criterio.design.",
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

  shareInvite: {
    subject: (who: string, project: string): string => `${who} wants your take on ${project}`,
    text: (who: string, project: string, url: string): string => `${who} shared the board of ${project} with you on criterio.design. Open each reference, comment on it and pick the ones you like:\n${url}\n\nThe link is yours alone: what you write goes with your name. No account needed.`,
  },

  clientAnswers: {
    subject: (project: string): string => `Your client answered about ${project}`,
    text: (project: string, n: number, url: string): string => `Your client answered ${n === 1 ? "1 question" : `${n} questions`} about ${project}. The file has not changed: run a new pass when you want it to read them.\n\nOpen it here:\n${url}`,
  },

  // ─── A client's comments, and two weeks away (lib/client-comments.ts, lib/win-back.ts) ───────────────────
  clientComments: {
    subject: (project: string): string => `Your client commented on ${project}`,
    intro: (project: string, link: string): string => `Your client commented on ${project}${link ? ` through the link "${link}"` : ""}:`,
    line: (who: string, reference: string, body: string): string => `${who} on ${reference}: ${body}`,
    open: (url: string): string => `Answer them in the project:\n${url}`,
  },

  winBack: {
    subject: "Your criterio is where you left it",
    text: (project: string, url: string): string => `You have not opened criterio.design in two weeks. ${project} is where you left it:\n${url}\n\nIf something got in the way, reply and tell us.`,
    why: "You get this because you have an account on criterio.design.",
  },

  // ─── First use (lib/first-use-mail.ts) ─────────────────────────────────────
  // One line per first step (lib/first-steps-core.ts STEPS): the welcome lists them in the app's order, and a nudge
  // names the first one not done
  welcome: {
    subject: "Where to start on Criterio",
    intro: (url: string): string =>
      `Your workspace is ready:\n${url}\n\n` +
      `These are the first steps, in the order we would take them. The app keeps the same list beside your plan and ticks each one off as you go.`,
    steps: {
      project: (): string => "Create a project. One for each brand or product you work on.",
      refs: (goal: number): string => `Save ${goal} references to it. Use the browser extension, paste a link, or import a board you keep on Are.na, Pinterest or Cosmos.`,
      polish: (): string => "Polish the board. Tino asks about each reference and you choose. What you let go goes back to the Inbox.",
      out: (): string => "Connect your AI. Claude, ChatGPT, Cursor or Claude Code read your references before they build. It is in Connectors, on the top bar.",
    },
    example: "Would you rather see a finished one first? Open one of the Examples in Discover. An example does not use up the free plan's project.",
    outro: "If something gets in the way, reply to this email.",
  },

  nudge: {
    steps: {
      project: {
        subject: (): string => "Your Criterio account has no project yet",
        text: ({ url }: { url: string }): string =>
          `Your account on Criterio has no project yet. Start one here, one for each brand or product you work on:\n${url}\n\n` +
          `Or open one of the Examples in Discover to see a finished one first. An example does not use up the free plan's project.`,
      },
      refs: {
        subject: ({ refs, goal }: { refs: number; goal: number }): string => refs ? `Your project has ${refs} of its first ${goal} references` : "Your project is still empty",
        text: ({ url, refs, goal }: { url: string; refs: number; goal: number }): string =>
          `${refs ? `Your project on Criterio has ${refs} of the ${goal} references it takes to get going. Save the rest here` : `Your project on Criterio has no references yet. Save the first ${goal} here`}:\n${url}\n\n` +
          `The quickest way is a board you already keep. Paste the link of an Are.na, Pinterest or Cosmos board where Criterio asks for a link, and everything on it comes in.`,
      },
      polish: {
        subject: (): string => "Your board is ready to polish",
        text: ({ url }: { url: string }): string =>
          `Your project on Criterio has its references. The next step is to polish the board. Tino asks about each reference and you choose what stays:\n${url}`,
      },
      out: {
        subject: (): string => "Connect your AI to your references",
        text: ({ url }: { url: string }): string =>
          `Your board on Criterio is polished. The last step is to connect your AI, so Claude, ChatGPT, Cursor or Claude Code read your references before they build. Open your project and pick Connectors on the top bar:\n${url}`,
      },
    },
    stuck: "If you got stuck somewhere, reply and tell us where.",
    why: "You get this because you opened an account on criterio.design.",
  },

  afterWelcome: {
    extensionLink: {
      subject: "The Criterio extension, for your computer",
      text: (url: string): string =>
        `You asked for this link while setting up Criterio. Open it on a computer with Chrome, Edge, Arc or another Chromium browser, and install the extension from there:\n${url}\n\n` +
        `With it, a click saves the page you are on, and your bookmarks on X and in the browser come in.`,
    },
    connect: {
      subject: "Connect your agent to Criterio",
      text: ({ address, url }: { address: string; url: string }): string =>
        `You set up Criterio a few days ago without connecting your agent. Once it is connected, Claude, ChatGPT, Cursor or Claude Code read your references and your criterio.md before they build.\n\n` +
        `It takes a minute. The connector's address is:\n${address}\n\n` +
        `- Claude: open Settings, then Connectors, add a custom connector, paste the address and press Connect.\n` +
        `- ChatGPT: open Settings, then Connectors, and create one (it asks for developer mode). Paste the address and leave the sign-in as OAuth.\n` +
        `- Cursor: open Settings, then MCP, and add a server with the address.\n` +
        `- Claude Code: type /plugin marketplace add ericruizmolero/inspo, then /plugin install criterio@criterio and /criterio:setup.\n\n` +
        `Each one asks you to allow Criterio once. The same steps are in the app, under Connectors on the top bar:\n${url}`,
    },
  },

  paused: {
    subject: "We have paused your team summaries",
    text: (url: string): string => `You have not opened criterio.design in a month, so we have stopped sending the daily summary of your teams. Turn it back on here:\n${url}`,
  },

  // ─── The plan's lifecycle (lib/plan-change.ts) and deleting an account (lib/account-delete.ts) ─────────────
  planDown: {
    subject: (plan: string): string => `Your plan is now ${plan}`,
    text: (plan: string, account: string, what: string, url: string): string =>
      `${account} is on the ${plan} plan from today.\n\n${what}\n\nThe plans, and what each one includes:\n${url}`,
    /** What a smaller plan means, the same in every email that announces one */
    what: (plan: string, vaultLocks: boolean): string =>
      `Nothing is deleted: your references, projects, files and people stay where they are. What goes past the ${plan} plan's limits stays, but adding more is refused until there is room or you move up a plan.` +
      (vaultLocks ? " The Vault pieces of the paid plans lock again." : ""),
  },

  giftEnds: {
    subject: (date: string): string => `Your gift ends on ${date}`,
    text: (plan: string, account: string, date: string, what: string, url: string): string =>
      `The ${plan} plan we gave ${account} ends on ${date}. Then the account goes back to Free.\n\n${what}\n\nTo stay on ${plan}, ask for it here and we will switch it on before the gift ends:\n${url}`,
  },

  giftEnded: {
    subject: "Back on Free",
    text: (plan: string, account: string, what: string, url: string): string =>
      `The ${plan} plan we gave ${account} has ended, and the account is back on Free.\n\n${what}\n\nTo go back to ${plan}, ask for it here:\n${url}`,
  },

  accountDeleted: {
    subject: "Your account is deleted",
    text: (email: string): string =>
      `We have deleted your criterio.design account (${email}): your personal space, the teams only you were in, and your place in the others.\n\nIf it was not you who asked for this, reply to this email at once.`,
  },

  // ─── A client's workspace let go from an agency's plan (lib/account-workspaces.ts) ────────────────────────
  letGo: {
    subject: (workspace: string): string => `${workspace} is on a plan of its own`,
    text: (workspace: string, account: string, what: string, url: string): string =>
      `${account} no longer pays for ${workspace}. It is on Free now, on an account of its own, and you are the one who can move it up a plan.\n\n${what}\n\nThe plans, and what each one includes:\n${url}`,
  },
};
