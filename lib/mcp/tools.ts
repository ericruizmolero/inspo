// The connector's tools: the few things an AI client can do in criterio (lib/mcp/pieces.ts does them). The
// flows that use them (import what a team already has, review a design against the criterio) are prompts
// (lib/mcp/prompts.ts), not more tools. The descriptions are written for the model on the other end, in English
// whatever the person's language: what comes back (criterio.md, names, notes) is in theirs.
import "server-only";
import { z } from "zod";
import { SYSTEM_AREAS } from "@/types/system";
import type { McpCtx } from "./auth";
import { CRITERIO_SECTIONS, addPiece, listProjects, listReferences, newProject, proposeDecision, readCriterio, readReference } from "./pieces";

const Project = z.string().min(1).max(120).describe("The project: its id or its name, as list_projects gives them.");
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
  run: (input: z.infer<S>, ctx: McpCtx, origin: string) => Promise<unknown>;
}
const tool = <S extends z.ZodType>(t: Tool<S>) => t as unknown as Tool;

export const TOOLS: Tool[] = [
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
      "A project's criterio.md: the design criteria its team decided, as Markdown. Eight areas (typography, color, layout, motion, iconography, logo, imagery, voice), each with its decision, why, what it must never do, and the references (R1, R2…) behind it; then the project's texts and every reference.",
      "Read it before designing, writing or reviewing anything for the project, and follow it: a decided area is a rule. Where an area is open, ask the person instead of inventing.",
      'section: "all" (default) is the whole file and can be long; "decisions" is the same without the long lists at the end (enough to design with); an area\'s name gives that area alone.',
    ].join("\n"),
    input: z.object({ project: Project, section: z.enum(CRITERIO_SECTIONS).optional().describe('"all" (default), "decisions", or one area.') }),
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
    description: "One reference, whole: what it is, its tags, what the team said about it, the projects it is in and, for a text, its words. Takes the reference's id (from list_references).",
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
    name: "create_project", title: "Create a project",
    description: "Creates an empty project in criterio: a place for the references and the criterio of one piece of work (a brand, a site, an app). Only when the person asks for a new one; check list_projects first so it does not duplicate one that exists.",
    input: z.object({
      name: z.string().min(1).max(60).describe("The project's name."),
      about: z.string().max(600).optional().describe("What the project is, in a sentence or two: who it is for and what is being made."),
      workspace: z.string().max(80).optional().describe("The workspace to create it in, by name. Only needed when the person is in several."),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    run: (i, ctx, origin) => newProject(ctx, origin, i),
  }),
];

/** The tools as tools/list hands them out */
export const toolList = () => TOOLS.map((t) => {
  const { $schema: _s, ...inputSchema } = z.toJSONSchema(t.input) as Record<string, unknown>;
  return { name: t.name, title: t.title, description: t.description, inputSchema, annotations: { title: t.title, ...t.annotations } };
});

/** What the client is told once, on connecting: how to work with criterio */
export const INSTRUCTIONS = [
  "criterio holds the design criteria of each of the person's projects as one file, criterio.md: what the team decided about typography, color, layout, motion, iconography, logo, imagery and voice, with the references behind each decision.",
  "Before designing, writing or reviewing anything for a project, call read_criterio and follow it. A decided area is a rule. Where an area is open, ask the person; do not invent.",
  "You never rewrite criterio.md. You add pieces: references (add_reference) and proposals for what an area should say (propose_decision), which wait for the team's yes or no in the app.",
  "Write only what the person asked for or agreed to.",
].join("\n");
