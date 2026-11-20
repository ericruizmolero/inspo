// The copy the templates start from: today's wording of lib/i18n/<locale>/mail.ts, called with each template's
// variables as {{{NAME}}}, laid out with the blocks of lib/mail-layout.ts. Read once by `npm run mail:templates seed
// scripts/mail-seed.ts`; after that the wording lives in Resend and this file and that copy leave the repo.
import en from "../lib/i18n/en";
import es from "../lib/i18n/es";
import type { Locale } from "../lib/i18n/locale";
import { button, code, heading, join, para, type Body } from "../lib/mail-layout";
import type { TemplateKey } from "../lib/mail-templates";
import { STEPS } from "../lib/first-steps-core";
import { DEFAULT_PLAN } from "../lib/plans";

const DICTS = { en, es } as const;
const v = (name: string) => `{{{${name}}}}`;
// The copy's functions take numbers for counts; the template takes the variable in their place
const n = (name: string) => v(name) as unknown as number;

const LABELS: Record<Locale, Record<string, string>> = {
  en: {
    signIn: "Sign in", accept: "Accept the invitation", panel: "Open the panel", comeIn: "Come in", team: "Open the team", members: "Manage the team",
    board: "Open the board", project: "Open the project", reply: "See the reply", resume: "Turn it back on", app: "Open Criterio", start: "Start a project",
    refs: "Save references", polish: "Polish the board", extension: "Get the extension", connectors: "Open Connectors", plans: "See the plans", ask: "Ask for the plan",
  },
  es: {
    signIn: "Entrar", accept: "Aceptar la invitación", panel: "Abrir el panel", comeIn: "Entrar", team: "Abrir el equipo", members: "Gestionar el equipo",
    board: "Abrir el tablón", project: "Abrir el proyecto", reply: "Ver la respuesta", resume: "Volver a activarlo", app: "Abrir Criterio", start: "Empezar un proyecto",
    refs: "Guardar referencias", polish: "Pulir el tablón", extension: "Instalar la extensión", connectors: "Abrir Conectores", plans: "Ver los planes", ask: "Pedir el plan",
  },
};

/**
 * Plain email text as blocks: a blank line starts a paragraph, a line that is only {{{URL}}} is the button, a line
 * that is only {{{ADDRESS}}} is literal data, and "- Name: what to do" is a step with its name as the heading.
 */
function fromText(text: string, label: string): Body {
  const out: Body[] = [];
  for (const block of text.split(/\n{2,}/)) {
    let lines: string[] = [];
    const flush = () => { if (lines.length) out.push(para(lines.join("\n"))); lines = []; };
    for (const line of block.split("\n")) {
      const step = line.match(/^- ([^:]+): (.+)$/);
      // "See it here:" alone before the link says what the button already says
      if (line === v("URL")) { if (lines.length === 1 && /^.{0,20}(here|aquí):$/i.test(lines[0])) lines = []; flush(); out.push(button(label, v("URL"))); }
      else if (line === v("ADDRESS")) { flush(); out.push(code(line)); }
      else if (step) { flush(); out.push(heading(step[1]), para(step[2][0].toUpperCase() + step[2].slice(1))); }
      else lines.push(line);
    }
    flush();
  }
  return join(...out);
}

/** Each template's subject and body in one language */
function copy(locale: Locale): Record<TemplateKey, { subject: string; body: Body }> {
  const t = DICTS[locale].mail, l = LABELS[locale];
  const plan = (k: typeof DEFAULT_PLAN) => DICTS[locale].plans.items[k].name;
  const role = (r: "admin" | "member") => DICTS[locale].team.roles[r].toLowerCase();
  const m = t.membership;
  const one = (subject: string, text: string, label = "") => ({ subject, body: fromText(text, label) });
  const withStuck = (subject: string, text: string, label: string) => ({ subject, body: fromText(`${text}\n\n${t.nudge.stuck}`, label) });

  const welcomeSteps = STEPS.flatMap((s, i) => {
    const line = (t.welcome.steps as Record<string, (goal: number) => string>)[s.key](n("GOAL"));
    const cut = line.indexOf(". ");
    return [heading(`${i + 1}. ${line.slice(0, cut)}`), para(line.slice(cut + 2))];
  });
  const nudge = t.nudge.steps;
  const at = { url: v("URL"), refs: n("REFS"), goal: n("GOAL") };
  const empty = { ...at, refs: 0 };
  const letter = { subject: v("SUBJECT"), body: { html: v("BODY"), text: v("BODY_TEXT") } as Body };

  return {
    "magic-link": one(t.magicLink.subject, t.magicLink.text(v("URL")), l.signIn),
    invitation: one(t.invitation.subject(v("INVITER"), v("TEAM")), t.invitation.text(v("WHO"), v("TEAM"), v("INVITEE"), v("URL")), l.accept),
    "personal-invite": one(t.personalInvite.subject(v("INVITER")), t.personalInvite.text(v("WHO"), plan(DEFAULT_PLAN), v("INVITEE"), v("URL")), l.accept),
    "admin-access": one(t.adminAccess.subject(v("GRANTER")), t.adminAccess.text(v("GRANTER"), v("URL")), l.panel),
    "on-the-list": one(t.onTheList.subject, t.onTheList.text(v("YOUR_EMAIL"))),
    "access-invite": one(t.accessInvite.subject, t.accessInvite.text(v("URL"), v("YOUR_EMAIL")), l.comeIn),

    "member-joined": one(m.joinedSubject(v("WHO"), v("TEAM")), m.joinedText(v("WHO"), v("TEAM"), v("URL")), l.team),
    "member-invite-ending": one(m.endingSubject(v("TEAM")), m.endingText(v("INVITER"), v("TEAM"), v("INVITEE"), v("URL")), l.accept),
    "member-now-admin": one(m.roleSubject(v("TEAM"), role("admin")), m.roleText(v("WHO"), v("TEAM"), role("admin"), true, v("URL")), l.team),
    "member-now-member": one(m.roleSubject(v("TEAM"), role("member")), m.roleText(v("WHO"), v("TEAM"), role("member"), false, v("URL")), l.team),
    "member-removed": one(m.removedSubject(v("TEAM")), m.removedText(v("WHO"), v("TEAM"))),
    "member-now-owner": one(m.ownerSubject(v("TEAM")), m.ownerText(v("WHO"), v("TEAM"), v("URL")), l.team),
    "team-deleted": one(m.deletedSubject(v("TEAM")), m.deletedText(v("WHO"), v("TEAM"))),
    "over-capacity": one(
      t.overCapacity.subject(v("TEAM"), t.overCapacity.people(n("MEMBERS")), v("PLAN"), n("LIMIT")),
      t.overCapacity.text(v("TEAM"), v("PLAN"), t.overCapacity.people(n("LIMIT")), t.overCapacity.people(n("MEMBERS")), v("URL")), l.members),

    "share-invite": one(t.shareInvite.subject(v("WHO"), v("PROJECT")), t.shareInvite.text(v("WHO"), v("PROJECT"), v("URL")), l.board),
    "client-answers-one": one(t.clientAnswers.subject(v("PROJECT")), t.clientAnswers.text(v("PROJECT"), 1, v("URL")), l.project),
    "client-answers": one(t.clientAnswers.subject(v("PROJECT")), t.clientAnswers.text(v("PROJECT"), n("COUNT"), v("URL")), l.project),
    reply: one(t.reply.subject(v("WHO")), t.reply.text(v("WHO"), v("MINE"), v("THEIRS"), v("URL")), l.reply),
    "proposal-accepted": one(t.proposal.subject(v("WHO"), true, v("AREA")), t.proposal.text(v("WHO"), true, v("AREA"), v("PROJECT"), v("DECISION"), v("URL")), l.project),
    "proposal-declined": one(t.proposal.subject(v("WHO"), false, v("AREA")), t.proposal.text(v("WHO"), false, v("AREA"), v("PROJECT"), v("DECISION"), v("URL")), l.project),
    paused: one(t.paused.subject, t.paused.text(v("URL")), l.resume),

    welcome: {
      subject: t.welcome.subject,
      body: join(fromText(t.welcome.intro(v("URL")), l.app), ...welcomeSteps, para(t.welcome.example), para(t.welcome.outro)),
    },
    "nudge-project": withStuck(nudge.project.subject(), nudge.project.text(at), l.start),
    "nudge-refs-empty": withStuck(nudge.refs.subject(empty), nudge.refs.text(empty), l.refs),
    "nudge-refs": withStuck(nudge.refs.subject(at), nudge.refs.text(at), l.refs),
    "nudge-polish": withStuck(nudge.polish.subject(), nudge.polish.text(at), l.polish),
    "nudge-out": withStuck(nudge.out.subject(), nudge.out.text(at), l.project),
    "extension-link": one(t.afterWelcome.extensionLink.subject, t.afterWelcome.extensionLink.text(v("URL")), l.extension),
    "connect-agent": withStuck(t.afterWelcome.connect.subject, t.afterWelcome.connect.text({ address: v("ADDRESS"), url: v("URL") }), l.connectors),
    "win-back": one(t.winBack.subject, t.winBack.text(v("PROJECT"), v("URL")), l.project),

    "fair-use": one(t.fairUse.subject(v("ACCOUNT"), v("CEILING")), t.fairUse.text(v("ACCOUNT"), v("PLAN"), v("USED"), v("CEILING"))),
    "plan-requested": one(t.plans.gotSubject, t.plans.gotText(v("PLAN"), v("PERIOD"), v("ACCOUNT"))),
    "plan-on": one(t.plans.onSubject(v("PLAN")), t.plans.onText(v("PLAN"), v("ACCOUNT"), v("URL")), l.app),
    "plan-on-until": one(t.plans.onSubject(v("PLAN")), t.plans.onText(v("PLAN"), v("ACCOUNT"), v("URL"), v("UNTIL")), l.app),
    "plan-down": one(t.planDown.subject(v("PLAN")), t.planDown.text(v("PLAN"), v("ACCOUNT"), t.planDown.what(v("PLAN"), false), v("URL")), l.plans),
    "plan-down-vault": one(t.planDown.subject(v("PLAN")), t.planDown.text(v("PLAN"), v("ACCOUNT"), t.planDown.what(v("PLAN"), true), v("URL")), l.plans),
    "gift-ends": one(t.giftEnds.subject(v("UNTIL")), t.giftEnds.text(v("PLAN"), v("ACCOUNT"), v("UNTIL"), t.planDown.what(plan(DEFAULT_PLAN), true), v("URL")), l.ask),
    "gift-ended": one(t.giftEnded.subject, t.giftEnded.text(v("PLAN"), v("ACCOUNT"), t.planDown.what(plan(DEFAULT_PLAN), false), v("URL")), l.ask),
    "gift-ended-vault": one(t.giftEnded.subject, t.giftEnded.text(v("PLAN"), v("ACCOUNT"), t.planDown.what(plan(DEFAULT_PLAN), true), v("URL")), l.ask),
    "let-go": one(t.letGo.subject(v("WORKSPACE")), t.letGo.text(v("WORKSPACE"), v("ACCOUNT"), t.planDown.what(plan(DEFAULT_PLAN), false), v("URL")), l.plans),
    "let-go-vault": one(t.letGo.subject(v("WORKSPACE")), t.letGo.text(v("WORKSPACE"), v("ACCOUNT"), t.planDown.what(plan(DEFAULT_PLAN), true), v("URL")), l.plans),
    "account-deleted": one(t.accountDeleted.subject, t.accountDeleted.text(v("YOUR_EMAIL"))),

    letter, "letter-team": letter, "letter-vault": letter,
  };
}

export const seed = { en: copy("en"), es: copy("es") };
