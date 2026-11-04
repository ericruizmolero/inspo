// The connector's tools: the few things an AI client can do in criterio (lib/mcp/pieces.ts does them). The
// flows that use them (import what a team already has, review a design against the criterio) are prompts
// (lib/mcp/prompts.ts), not more tools. The descriptions are written for the model on the other end, in English
// whatever the person's language: what comes back (criterio.md, names, notes) is in theirs.
import "server-only";
import { z } from "zod";
import { SYSTEM_AREAS } from "@/types/system";
import type { McpCtx } from "./auth";
import { CRITERIO_SECTIONS, ProjectArg as Project, QUESTION_IDS, addPiece, answerQuestion, listProjects, listReferences, newProject, proposeDecision, readCriterio, readReference, measureSite, recordLearning, runPass, setOutline, startSetup, checkLandingPage, listComments, resolveComment } from "./pieces";
import { OUTLINE_SECTIONS_MAX, OUTLINE_TEXT_MAX, SECTION_KINDS } from "@/types/landing";
import { SKIPPABLE } from "../setup-core";
import { LEARNING_NOTE_MAX } from "@/types/system";
import { BRIEF_LIMITS } from "@/types/brief";
import { BringInput, bringBrand } from "./brand";
import { TINO_APP_URI } from "./tino-app";
import { TINO_VOICE } from "./tools-voice";

const Areas = z.array(z.enum(SYSTEM_AREAS)).max(SYSTEM_AREAS.length).optional();

const piece = {
  project: Project,
  url: z.string().max(2000).optional().describe("A public address: a site, a page, a video, a post on X, or an image file. Pass this or text, not both."),
  text: z.string().max(40_000).optional().describe("Words to keep whole, in Markdown: copy, a brief, guidelines, notes. Pass this or url, not both."),
  title: z.string().max(80).optional().describe("A short name for it. Optional for a url (its site's name is used) and for a text (its first line is)."),
  note: z.string().max(500).optional().describe("One or two sentences in the person's own words on why it is there and what to take from it. The team reads this first."),
};

interface Tool<S extends z.ZodType = z.ZodType> {
  name: string; title: string; description: string; input: S;
  annotations: { readOnlyHint: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
  /** Sent as the tool's _meta: an MCP App's address, which a client without MCP Apps ignores */
  meta?: Record<string, unknown>;
  run: (input: z.infer<S>, ctx: McpCtx, origin: string) => Promise<unknown>;
}
const tool = <S extends z.ZodType>(t: Tool<S>) => t as unknown as Tool;

export const TOOLS: Tool[] = [
  tool({
    name: "start_setup", title: "Start or continue the setup",
    description: "The way in when the person says \"set up criterio\", starts a project, or comes back to one. It says where the project stands and what to do next, in `do`. First print the drawing in `tino` for the person, once, as it says. Follow it one step at a time, and call it again after each step. Never ask the person two things in one message: one question, wait, then the next. Talk as `tino.voice` says. The same setup can start in the app or in any other client: nothing is repeated. Every step is optional except the project, the goal and the file. When `next` is direction or landing the setup is complete, and building is an offer, not a duty.",
    input: z.object({ project: Project.optional(), skip: z.enum(SKIPPABLE as [string, ...string[]]).optional().describe("A step the person declined."), ask_client: z.boolean().optional().describe("True when the person does not know an answer and wants to ask their client: the answer has a link to send, which needs no account. When the client answers, the person gets one email.") }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    meta: { ui: { resourceUri: TINO_APP_URI, visibility: ["model"] } },
    run: (i, ctx, origin) => startSetup(ctx, origin, i),
  }),
  tool({
    name: "measure_site", title: "Measure a site",
    description: "Measures a public site on the server and returns its colours, type, spacing, fonts, logo, copy and the addresses of its own pictures, as values. Use those pictures on the brand's landing. Use it for the person's own site, on any client: it needs no local browser. It writes nothing: show the person the values, then call bring_brand after their yes. Can take a minute. It cannot reach localhost or a page behind a login: ask for a screenshot and mark what you read from it as inferred. Do not bring another company's brand into a project.",
    input: z.object({ url: z.string().min(1).max(2000).describe("The site's public address.") }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    run: (i, ctx) => measureSite(ctx, i),
  }),
  tool({
    name: "run_pass", title: "Write criterio.md",
    description: "Writes the project's criterio.md from its references, brand and answers, with the same pass the app uses, so every client gets the same file. Call it when the setup reaches the criterio step or the person asks. Takes up to a few minutes. It replaces no decision the team made by hand. After it, change the file only through propose_decision.",
    input: z.object({ project: Project }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    run: (i, ctx, origin) => runPass(ctx, origin, i),
  }),
  tool({
    name: "list_projects", title: "List projects",
    description: "The person's projects in criterio, across their workspaces: each with its id, what it is about, how many of its eight areas are decided, and how many references it has. Start here when you do not know which project the person means.",
    input: z.object({}),
    annotations: { readOnlyHint: true },
    run: (_i, ctx, origin) => listProjects(ctx, origin),
  }),
  tool({
    name: "read_criterio", title: "Read criterio.md",
    description: [
      "A project's criterio.md: the design criteria its team decided, as Markdown. Eight areas (typography, color, layout, motion, iconography, logo, imagery, voice), each with its decision, why, what it must never do, and the references (R1, R2…) behind it; then the project's texts and every reference. Its file links may not open where you run: to see a reference's picture, call read_reference.",
      "Read it before designing, writing or reviewing anything for the project, and follow it: a decided area is a rule. Where an area is open, ask the person instead of inventing.",
      "The file opens with \"Start here\": the session loop to follow with the person, in phases that each end in a checkpoint (connect, understand, plan, build in parts, review with evidence, learn), written from the project as it stands. Then the starting questions still open (each with its id), what was learned in earlier sessions, and \"How to use this file\": what is required (the brand's values and every Never line), what is direction (each area's decision) and what is only guidance (the references, which are never copied). Follow them.",
      'section: "guide" is Start here, the starting questions, what was learned, those rules and every Never line: the first read; "all" (default) is the whole file and can be long; "decisions" is the same without the long lists at the end (enough to design with); an area\'s name gives that area under the file\'s head and its "How to use this file" rules, the cheapest read when a task touches few areas.',
    ].join("\n"),
    input: z.object({ project: Project, section: z.enum(CRITERIO_SECTIONS).optional().describe('"guide" (read it first), "all" (default), "decisions", or one area.') }),
    annotations: { readOnlyHint: true },
    run: (i, ctx, origin) => readCriterio(ctx, origin, i.project, i.section),
  }),
  tool({
    name: "list_references", title: "List references",
    description: "A project's board: every reference saved in it, oldest first, with its id, the code criterio.md cites it by (R1, R2…), what kind it is (web, image, video, post, text), who saved it, the areas it backs and whether it is a result. Use it to see what is already there before adding anything.",
    input: z.object({ project: Project }),
    annotations: { readOnlyHint: true },
    run: (i, ctx) => listReferences(ctx, i.project),
  }),
  tool({
    name: "read_reference", title: "Read a reference",
    description: "One reference, whole: what it is, its tags, what the team said about it, the projects it is in, for a text its words, and its picture attached as an image (the picture itself, the one the team chose, or the top of the page). Use it to see a reference: the file links in criterio.md may not open from where you run. Takes the reference's id (from list_references).",
    input: z.object({ id: z.string().min(1).max(60).describe("The reference's id, from list_references.") }),
    annotations: { readOnlyHint: true },
    run: (i, ctx) => readReference(ctx, i.id),
  }),
  tool({
    name: "add_reference", title: "Add a reference",
    description: [
      "Saves a reference on a project's board: something that inspires or informs the project. A url (a site, a video, a post, an image file) or a text kept whole. It is saved under the person's name, marked as coming from this app, and shows on the board at once.",
      "Only add what the person asked to save or agreed to. When adding several, show the list first and add them after a yes. Give each a note saying why it is there.",
      "areas: the areas of the system it brings something to, when that is clear. A reference changes no decision by itself; to change what an area says, use propose_decision.",
    ].join("\n"),
    input: z.object({ ...piece, areas: Areas.describe("The areas it backs, if clear: typography, color, layout, motion, iconography, logo, imagery, voice.") }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    run: (i, ctx, origin) => addPiece(ctx, origin, i),
  }),
  tool({
    name: "propose_decision", title: "Propose a decision",
    description: [
      "Proposes what one area of a project's criterio should say. It does NOT change the criterio: the proposal waits under its area in the app, signed by the person and this app, until someone on the team accepts or rejects it. Tell the person it is waiting for them there.",
      "Write the decision as the team would: concrete and usable (names, values, rules), in the language of the project's criterio.md, with no reference to this conversation. One proposal per area at a time; read the area first (read_criterio) so the proposal builds on what is decided instead of ignoring it.",
    ].join("\n"),
    input: z.object({
      project: Project,
      area: z.enum(SYSTEM_AREAS).describe("The area it is about."),
      decision: z.string().min(1).max(2000).describe("The whole text the area would have, not a diff."),
      why: z.string().max(400).optional().describe("The reason behind the decision, in a sentence or two: it stays with the decision."),
      never: z.array(z.string().max(200)).max(8).optional().describe("What the area must never do, one short rule each."),
      reason: z.string().max(600).optional().describe("A line to the team on where this proposal comes from (what was looked at, what the person asked for)."),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    run: (i, ctx, origin) => proposeDecision(ctx, origin, i),
  }),
  tool({
    name: "answer_question", title: "Answer a starting question",
    description: [
      "Keeps the person's answer to one of the starting questions criterio.md lists (under its starting questions, each with its id). It is written straight in, with no approval: it is what the person said, and it changes no decision. criterio.md then lists the question as answered, so no agent asks it again.",
      "Call it right after the person answers, with their answer in their words, condensed if long but never invented or completed by you. What you read on the site or in the repo goes with source \"read\" and from: it stays unconfirmed until the person says so, and you then save it again with source \"person\". A second answer to the same question replaces the first. It returns the questions still open: ask the next one, one at a time.",
    ].join("\n"),
    input: z.object({
      project: Project,
      question: z.enum(QUESTION_IDS).describe("The question's id, as criterio.md writes it before the question (offer, goal, audience…)."),
      answer: z.string().min(1).max(BRIEF_LIMITS.answer).describe("The person's answer, in their words and language."),
      source: z.enum(["person", "read"]).optional().describe('"person" (default) when they said it, "read" when you read it.'),
      from: z.string().max(500).optional().describe("The address or path a read answer came from."),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    run: (i, ctx, origin) => answerQuestion(ctx, origin, i),
  }),
  tool({
    name: "record_learning", title: "Record what was learned",
    description: [
      "Keeps one thing learned working with the person: something they corrected, chose or made clear (\"no gradients on the hero\", \"prices always with VAT\"), so the next session starts from it. Written straight in, with no approval; criterio.md shows it under what was learned, newest first.",
      "One short sentence each, concrete and in the language of the project's criterio.md, with no reference to this conversation. It does not change what an area decides: when the person settles an area, use propose_decision for that.",
    ].join("\n"),
    input: z.object({
      project: Project,
      note: z.string().min(1).max(LEARNING_NOTE_MAX).describe("What was learned, in one short sentence."),
      area: z.enum(SYSTEM_AREAS).optional().describe("The area it is about, when it is about one."),
      section: z.enum(SECTION_KINDS).optional().describe("The kind of section it is about, when it is about one. It holds for every landing of the project."),
      pick: z.boolean().optional().describe("True when the person chose between two versions: the note says which, what was rejected, and why."),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    run: (i, ctx, origin) => recordLearning(ctx, origin, i),
  }),
  tool({
    name: "check_landing", title: "Check a landing",
    description: "Opens a built landing at desktop and phone width, on the server, and reports what it does for its goal: the primary actions, whether one shows on a phone's first screen, the headline, overflow, broken pictures and placeholder marks left, with pictures of both. It returns the project's rules too: judge the page against them and the goal, naming each breach. Use it after building, and after a fix. Public addresses and previews only: it cannot reach localhost.",
    input: z.object({ project: Project, url: z.string().min(1).max(2000).describe("The landing's public address or preview.") }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    run: (i, ctx, origin) => checkLandingPage(ctx, origin, i),
  }),
  tool({
    name: "list_comments", title: "Read the comments on the page",
    description: "What people said about a running landing, left with the browser extension: the comment, the page, the element's selector, the text and the section it sits in. Open ones only, unless all. Comments never go into criterio.md: read them here. A selector can go stale after a build: find the element by its text and section then.",
    input: z.object({ project: Project, all: z.boolean().optional().describe("Also the ones already resolved.") }),
    annotations: { readOnlyHint: true },
    run: (i, ctx) => listComments(ctx, i),
  }),
  tool({
    name: "resolve_comment", title: "Resolve a comment",
    description: "Marks a page comment dealt with, after you fixed it, with one line on what changed. A comment changes no decision, so this needs no approval. If it taught something that holds for the next landing, also call record_learning.",
    input: z.object({ project: Project, id: z.string().min(1).max(60).describe("The comment's id, from list_comments."), change: z.string().min(1).max(200).describe("What changed, in one line.") }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    run: (i, ctx) => resolveComment(ctx, i),
  }),
  tool({
    name: "set_outline", title: "Plan a landing",
    description: [
      "Saves a landing's plan: its goal and its sections in order. The same name replaces that plan, whole; a project can hold several landings. It is a plan, not a decision, so it goes straight in, and criterio.md shows it under the landing.",
      "A landing exists to move a visitor to one action, so start from the goal. Each section's job says what it does for that action, in a sentence: explains the problem, removes a doubt, proves the claim, asks for the action. A section with no job towards the goal is cut, however good it looks. Taste comes from the project's decisions, not from this plan.",
      "When the landing is built, call it again with built, and its address if it has one.",
    ].join("\n"),
    input: z.object({
      project: Project,
      name: z.string().min(1).max(80).describe("The landing's name: home, demo, a campaign."),
      goal: z.string().min(1).max(OUTLINE_TEXT_MAX).describe("The one thing someone should do after seeing the page."),
      sections: z.array(z.object({
        kind: z.enum(SECTION_KINDS).describe("The kind of section."),
        job: z.string().min(1).max(OUTLINE_TEXT_MAX).describe("What this section does for the goal."),
        proof: z.string().max(OUTLINE_TEXT_MAX).optional().describe("What backs it, from the project's answers. Never invented."),
        cta: z.string().max(OUTLINE_TEXT_MAX).optional().describe("The action it asks for."),
        refs: z.array(z.string().max(60)).max(12).default([]).describe("The ids of the references it draws from (list_references)."),
      })).min(1).max(OUTLINE_SECTIONS_MAX),
      built: z.object({ url: z.string().max(2000).optional() }).optional().describe("Set when the landing exists."),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    run: (i, ctx, origin) => setOutline(ctx, origin, i),
  }),
  tool({
    name: "bring_brand", title: "Bring in a brand",
    description: [
      "Brings a brand that already exists into a project's brand: the palette, the faces and the type scale, the logo, the motion, the voice, the imagery and the handles it shows up with, as values the team then edits in the app. Read the values from the real thing (the theme file, the CSS variables, the component code, the logo's SVG, the site measured), never from how it looks to you.",
      "Each section you pass replaces that section whole; pass only the sections you have values for. A section the team set by hand is left alone and named in the answer. Give each item a short id of your own; a scale step names its face by that id. A logo comes as SVG markup, a public address or the file's bytes as base64 (a capture, a file on your disk), per light and dark ground, and is kept with the project; the imagery's own pictures (images) come the same way and become its examples. guide is the DESIGN.md you wrote, kept for the app's next passes.",
      "It changes no decision of the criterio: what belongs to an area (spacing, radius, elevation, a rule) goes through propose_decision. Show the person what you are about to bring before calling it.",
    ].join("\n"),
    input: BringInput,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    run: (i, ctx, origin) => bringBrand(ctx, origin, i),
  }),
  tool({
    name: "create_project", title: "Create a project",
    description: "Creates an empty project in criterio: a place for the references and the criterio of one brand or client. When the person asks for one, or the setup needs one; check list_projects first so it does not duplicate one that exists.",
    input: z.object({
      name: z.string().min(1).max(60).describe("The project's name."),
      about: z.string().max(600).optional().describe("What the project is, in a sentence or two: who it is for and what is being made."),
      workspace: z.string().max(80).optional().describe("The workspace to create it in, by name. Only needed when the person is in several."),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    run: (i, ctx, origin) => newProject(ctx, origin, i),
  }),
];

/** The tools as tools/list hands them out. io "input": the brand's schemas trim and uppercase on the way in, and a
 *  JSON Schema says what the model sends, not what comes out. */
export const toolList = () => TOOLS.map((t) => {
  const { $schema: _s, ...inputSchema } = z.toJSONSchema(t.input, { io: "input" }) as Record<string, unknown>;
  return { name: t.name, title: t.title, description: t.description, inputSchema, annotations: { title: t.title, ...t.annotations }, ...(t.meta ? { _meta: t.meta } : {}) };
});

/** What the client is told once, on connecting: how to work with criterio */
export const INSTRUCTIONS = [
  "When the person says \"set up criterio\", starts a project or comes back to an unfinished one, call start_setup and follow what it says.",
  TINO_VOICE,
  "criterio holds the design criteria of each of the person's projects as one file, criterio.md: what the team decided about typography, color, layout, motion, iconography, logo, imagery and voice, with the references behind each decision.",
  "Before designing, writing or reviewing anything for a project, call read_criterio and follow it. A decided area is a rule. Where an area is open, ask the person; do not invent.",
  "Work with the person as criterio.md's \"Start here\" says: read it first (read_criterio, section \"guide\") and follow its phases and checkpoints.",
  "You never rewrite criterio.md. You add pieces: references (add_reference), proposals for what an area should say (propose_decision), which wait for the team's yes or no in the app, a brand's values (bring_brand), which the team edits or hands back in the app, the person's answers to the starting questions (answer_question) and what you learned with them (record_learning), which go straight in.",
  "To see a reference's picture, call read_reference with its id (list_references maps R1, R2… to ids): the picture comes inside the answer. Do not fetch the file links in criterio.md to look at a picture; they may be blocked where you run.",
  "Write only what the person asked for or agreed to.",
].join("\n");
