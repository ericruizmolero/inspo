// The legal pages: /privacy and /terms (components/LegalDoc.tsx). A section is a heading and its blocks:
// a string is a paragraph, a list of strings is a list. The company's details come from lib/legal.ts.
// A draft until a lawyer has read it: change LEGAL_UPDATED (lib/legal.ts) with every change here.
import type { LegalFacts } from "../../legal";

export type LegalBlock = string | string[];
export interface LegalSection { heading: string; body: LegalBlock[] }

export const legal = {
  updated: (date: string): string => `Last updated ${date}`,
  draft: "Draft, not reviewed by a lawyer yet. Shown only in development.",
  pending: { entity: "[company name pending]", taxId: "[tax number pending]", address: "[registered address pending]" },
  links: { privacy: "Privacy", terms: "Terms", extension: "Extension privacy" },
  /** Under the sign-in form: before, the terms link, between, the privacy link, after */
  accept: ["By signing in you accept the ", "Terms", " and the ", "Privacy policy", "."] as [string, string, string, string, string],

  privacy: {
    title: "Privacy policy",
    lead: "What criterio.design knows about you, why, and what you can do about it.",
    sections: (c: LegalFacts): LegalSection[] => [
      { heading: "Who is responsible", body: [
        `${c.entity}, tax number ${c.taxId}, ${c.address}, runs criterio.design and is responsible for the data described here. Write to ${c.contact} about anything to do with your data.`,
        "What your team stores in a workspace (references, notes, comments, files) is the workspace's: it decides what goes in, and we process it on its behalf.",
      ] },
      { heading: "What we collect", body: [[
        "Your account: your name, email address and picture, as you give them or as Google, Apple or X hand them over when you sign in with them, and the language you use.",
        "Sign-in and security: the sessions you have open, with the IP address and browser of each, and the counters that stop abuse.",
        "What you save: the addresses, titles, screenshots, images, videos and texts of your references, your notes and comments, your projects and what they decide, and the brand files you upload.",
        "How you use the app: when you were last in and how much time you spent in each part of it.",
        "AI use: which AI actions ran in your workspace and what they cost, to apply your plan's limits.",
        "Feedback: what you send with the feedback tool, with the page it was about.",
        "The browser extension has its own page: criterio.design/extension/privacy.",
      ]] },
      { heading: "What your references contain", body: [
        "A reference is often someone else's work: a site, a post, an image. A post saved from X carries its author's name, handle, picture and words, as X shows them in public. We keep that only so the workspaces that saved the post can see it.",
        "If you are the author of something saved here and want it removed, the Terms say how to ask (criterio.design/terms).",
      ] },
      { heading: "Why we use it", body: [[
        "To give you the service you signed up for: your account, your library, your team. The basis is our contract with you.",
        "To write to you about your account: sign-in links, invitations and notices about the service. Also the contract.",
        "To keep the service secure and see how it is used, so we can improve it. The basis is our legitimate interest.",
        "To comply with the law when it obliges us.",
      ], "We do not sell your data, show ads or build advertising profiles."] },
      { heading: "AI", body: [
        "Some features send content to language models: the screenshot and text of a site to tag it, your references and notes to draft a project's criteria, your words to search by meaning. The models are reached through OpenRouter and Typesafe, and run by providers such as Anthropic, Google, Mistral and DeepSeek.",
        "We do not use your content to train models. Each provider processes it to return its answer, under its own terms.",
      ] },
      { heading: "Who we share it with", body: [
        "Only with the companies that run the service for us, each under a contract that limits what it can do with the data:",
        [
          "Vercel: hosting, in Frankfurt.",
          "Neon: the database, in Frankfurt.",
          "Cloudflare: file storage.",
          "Resend: the emails we send you.",
          "Better Stack: error reports and uptime checks. A report holds the error and the page, never your email or what you wrote.",
          "OpenRouter, Typesafe and the model providers behind them: the AI features.",
          "Google, Apple and X: only if you sign in with them.",
        ],
        "Some of them are outside the European Economic Area. Those transfers rely on the European Commission's standard contractual clauses or on the EU-US Data Privacy Framework.",
        "A few things load straight from others: a site's icon comes from Google's favicon service, and a video from X, YouTube or Vimeo plays from their servers. They see your IP address when that happens, as on any page that embeds them.",
      ] },
      { heading: "Cookies", body: [
        "Only the ones the app needs to work: your session, your language and whether the sidebar is open. Your theme is kept in the browser's own storage. There are no analytics or advertising cookies, so there is no banner to accept.",
      ] },
      { heading: "How long we keep it", body: [
        "For as long as your account is open. When a reference is deleted, the files that were only its own go with it. When you ask us to close your account we delete it, and what only you owned, within 30 days; what belongs to a team's workspace stays with the team. Copies in backups expire on their own some days later.",
      ] },
      { heading: "Your rights", body: [
        `You can ask to see your data, correct it, delete it, take it with you, or limit or object to how we use it. Write to ${c.contact} from your account's address and we answer within a month.`,
        "If you think we have handled your data badly, you can complain to the Spanish Data Protection Agency (aepd.es).",
      ] },
      { heading: "Who it is for", body: [
        "criterio.design is a tool for professionals. It is not meant for anyone under 16.",
      ] },
      { heading: "Changes", body: [
        "If this policy changes in a way that matters, we tell you by email or in the app before the change applies. The date at the top says when it last changed.",
      ] },
    ],
  },

  terms: {
    title: "Terms of use",
    lead: "The rules for using criterio.design, in plain words.",
    sections: (c: LegalFacts): LegalSection[] => [
      { heading: "Who we are", body: [
        `criterio.design is run by ${c.entity}, tax number ${c.taxId}, ${c.address}. Contact: ${c.contact}.`,
        "By creating an account or using the service you accept these terms. If you use it for a company, you accept them for that company.",
      ] },
      { heading: "What the service is", body: [
        "A library where a team gathers design references, talks about them and turns them into written criteria for a project (criterio.md). It is young and changes often: features can appear, change or go away.",
      ] },
      { heading: "Your account and your team", body: [
        "Keep your email safe: whoever opens the sign-in link gets in. Whoever creates a workspace, or is its admin, decides who joins and answers for what its members do in it.",
      ] },
      { heading: "What is yours", body: [
        "What you write and upload is yours. You give us only the permission we need to run the service: to store it, copy it, process it (with the AI providers named in the Privacy policy too) and show it to your workspace and to whoever you share a link with.",
        "The criteria the app drafts for you are yours to use. They are written with AI: read them before you rely on them.",
      ] },
      { heading: "What belongs to others", body: [
        "References are mostly other people's work. criterio.design is for studying it inside your team: looking at it, commenting on it and drawing criteria from it. Saving something here gives you no rights over it.",
        [
          "You save only what you are allowed to save, and you answer for what you save.",
          "You do not use criterio.design to republish, sell or pass off other people's work.",
          "The copies we keep so a reference outlives its page (a screenshot, an image, a post's media) are for your workspace's eyes.",
          "What came from X or Pinterest is never handed out through a share link: the link names it and points to the original.",
        ],
      ] },
      { heading: "Importing from other services", body: [
        "The extension can bring in what you have saved elsewhere: your browser's bookmarks, your bookmarks on X, your boards on Pinterest. It does it from your browser, with your own session, when you ask.",
        "Those services have terms of their own, and following them is up to you. Import what you saved yourself, not other people's collections.",
        "criterio.design is not affiliated with, endorsed by or sponsored by X or Pinterest. Their names appear only to say where an import comes from.",
      ] },
      { heading: "What is not allowed", body: [[
        "Saving or sharing anything illegal, or that infringes someone's rights.",
        "Using the service to collect content from other sites automatically or at scale, beyond importing what you saved yourself.",
        "Getting around a plan's limits, or reselling access.",
        "Trying to break in, overload the service or reach another workspace's data.",
      ]] },
      { heading: "Asking us to take something down", body: [
        `If something stored in criterio.design is yours and you want it gone, or you believe it is illegal, write to ${c.contact} with:`,
        [
          "Who you are and how to reach you.",
          "What it is: the address of the original (the post, the pin, the page) or of the share link where you saw it.",
          "Why it should come down: that it is your work, or what makes it illegal.",
          "A statement that what you say is true, to the best of your knowledge.",
        ],
        "We look at every notice promptly, remove or block what should not be here, and tell you what we did and why. We also tell the workspace that saved it, which can answer if it believes the notice is wrong. Accounts that infringe again and again are closed.",
      ] },
      { heading: "Plans and payment", body: [
        "Each plan has limits, shown in Settings. Paid plans are not being charged yet. When they are, you will see the price and the conditions before you pay anything.",
      ] },
      { heading: "Availability", body: [
        "We work to keep the service up and your data safe, but we offer it as it is, without promising it will never fail or lose anything. Keep your own copy of what matters: criterio.md can be copied or downloaded at any time.",
      ] },
      { heading: "Closing an account", body: [
        `You can stop using the service whenever you like, and ask us to delete your account at ${c.contact}. We can suspend or close an account that breaks these terms, and we tell you why unless the law stops us.`,
      ] },
      { heading: "Liability", body: [
        "As far as the law allows, we are not liable for indirect losses or for what users save or do with the service, and our total liability is limited to what you paid us in the twelve months before the claim. Nothing here takes away the rights the law gives you as a consumer.",
      ] },
      { heading: "Law and courts", body: [
        "Spanish law applies. Disputes go to the courts of the place where we are registered, unless consumer law gives you the right to your own.",
      ] },
      { heading: "Changes", body: [
        "If these terms change in a way that matters, we tell you by email or in the app before the change applies. Using the service after that means you accept them.",
      ] },
    ],
  },
};
