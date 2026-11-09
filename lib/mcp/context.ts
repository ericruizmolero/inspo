// bring_context: an agent that arrives with work already done (research, a brief, references, answers, a plan) leaves
// all of it on the project in one call. Nothing of it is a decision: references wait on the board, answers wait in
// the brief as the agent's, the plan waits as a draft, area proposals wait under their area. The team accepts or
// dismisses each in the app (lib/suggestions.ts). The same call again updates instead of adding twice.
import "server-only";
import { z } from "zod";
import { HttpError } from "../workspace-core";
import { SYSTEM_AREAS } from "@/types/system";
import { OUTLINE_SECTIONS_MAX, OUTLINE_TEXT_MAX, SECTION_KINDS, DIRECTIONS_MAX, type LandingSection, type HeroDirection } from "@/types/landing";
import { BRIEF_LIMITS, readBrief } from "@/types/brief";
import { REF_ROLES, ORIGIN_MAX, type RefRole } from "@/types/suggestions";
import { QUESTION_IDS, newProject, projectUrl, proposeDecision, resolveProject, setupStep, suggestPiece, versionAfterWrite } from "./pieces";
import { answerKey, cleanOrigin, dismissedKeys, outlineKey } from "../suggestions";
import { saveAnswers, saveBrief, type AnswerInput } from "../brief";
import { getSystem, saveOutline } from "../system/areas";
import { questionById } from "../playbook-questions";
import { normalizeWebUrl } from "../url";
import { db, schema } from "../db";
import { and, eq } from "drizzle-orm";
import type { McpCtx } from "./auth";

const Areas = z.array(z.enum(SYSTEM_AREAS)).max(SYSTEM_AREAS.length).optional();
/** A reference named in a plan: an id from list_references, or the address of one brought in this same call */
const RefName = z.string().max(2000);

export const ContextInput = z.object({
  project: z.string().min(1).max(120).describe("The project: its id or its name. With create, the name of a project to make if none matches."),
  create: z.boolean().optional().describe("Make the project when none matches `project`."),
  workspace: z.string().max(80).optional().describe("Where to make it, by name, when the person is in several."),
  origin: z.string().max(ORIGIN_MAX).optional().describe("Where this context comes from, in a line the team will read next to each piece: \"Prospecting chat in Claude, 9 Nov 2026\"."),
  about: z.string().max(600).optional().describe("What the project is, in a sentence or two. Kept only when the project has none."),
  brief: z.string().max(40_000).optional().describe("The brief, whole, in Markdown: the company, the angle, why now, what fails on their site. Kept as a text first on the board."),
  brief_title: z.string().max(80).optional().describe("The brief's title. Default: Brief."),
  research: z.array(z.object({
    title: z.string().min(1).max(80).describe("A short name for the note."),
    text: z.string().min(1).max(40_000).describe("What was found, in Markdown, with figures as they were read."),
    sources: z.array(z.object({ url: z.string().min(1).max(2000), took: z.string().max(300).optional().describe("What was taken from there.") })).max(20).optional(),
    key: z.string().max(120).optional().describe("Your own stable name for it, so a later call updates it. Default: the title."),
  })).max(12).optional().describe("Research notes, each kept as a text on the board with its sources."),
  references: z.array(z.object({
    url: z.string().min(1).max(2000),
    role: z.enum(REF_ROLES).optional().describe("What it is to the project: current-site (their site now), competitor, inspiration, press, material. A competitor is read as what the project stands apart from, never as taste."),
    note: z.string().max(500).optional().describe("Why it is there and what to take from it, in a sentence or two."),
    title: z.string().max(80).optional(),
    areas: Areas.describe("The areas it backs, if clear."),
  })).max(24).optional(),
  answers: z.array(z.object({
    question: z.enum(QUESTION_IDS).describe("The starting question's id."),
    answer: z.string().min(1).max(BRIEF_LIMITS.answer),
    source: z.enum(["person", "read", "agent"]).optional().describe('"agent" (default): you worked it out. "read": you read it on their site or a document (give from). "person": the person said it in so many words.'),
    from: z.string().max(500).optional().describe("The address or document it came from."),
  })).max(QUESTION_IDS.length).optional(),
  outline: z.object({
    name: z.string().min(1).max(80),
    goal: z.string().min(1).max(OUTLINE_TEXT_MAX),
    sections: z.array(z.object({
      kind: z.enum(SECTION_KINDS),
      job: z.string().min(1).max(OUTLINE_TEXT_MAX),
      proof: z.string().max(OUTLINE_TEXT_MAX).optional(),
      cta: z.string().max(OUTLINE_TEXT_MAX).optional(),
      refs: z.array(RefName).max(12).default([]).describe("References it draws from: ids, or the addresses of references in this call."),
    })).min(1).max(OUTLINE_SECTIONS_MAX),
  }).optional().describe("A draft of the landing's plan, as set_outline takes it. It waits as a draft for the team."),
  directions: z.array(z.object({
    name: z.string().min(1).max(80),
    change: z.string().min(1).max(OUTLINE_TEXT_MAX).describe("What this hero does differently: type, layout, density or tone, never colour alone."),
    refs: z.array(RefName).max(12).default([]).describe("The references that back it: ids, or addresses of references in this call."),
  })).max(DIRECTIONS_MAX).optional().describe("2 or 3 directions for the hero, kept with the outline (the one in this call, or the project's first)."),
  proposals: z.array(z.object({
    area: z.enum(SYSTEM_AREAS),
    decision: z.string().min(1).max(2000),
    why: z.string().max(400).optional(),
    never: z.array(z.string().max(200)).max(8).optional(),
  })).max(SYSTEM_AREAS.length).optional().describe("What areas could say, one per area. Each waits under its area for the team."),
});
export type ContextIn = z.infer<typeof ContextInput>;

type Tally = Record<"suggested" | "updated" | "on_board" | "dismissed" | "failed", number>;
const tally = (): Tally => ({ suggested: 0, updated: 0, on_board: 0, dismissed: 0, failed: 0 });

export async function bringContext(ctx: McpCtx, origin: string, input: ContextIn) {
  const project = await resolveProject(ctx, input.project).catch(async (e) => {
    if (!(e instanceof HttpError && e.status === 404 && input.create)) throw e;
    const made = await newProject(ctx, origin, { name: input.project, workspace: input.workspace });
    return resolveProject(ctx, made.id);
  });
  const org = project.workspace.id;
  const from = cleanOrigin(input.origin);
  const dismissed = await dismissedKeys(org, project.id);
  const refs = tally();
  const failed: { what: string; why: string }[] = [];
  /** The item each address of this call became, so a plan can name a reference by its address */
  const byUrl = new Map<string, string>();

  const bring = async (what: string, piece: Parameters<typeof suggestPiece>[2]) => {
    try {
      const out = await suggestPiece(ctx, project, { ...piece, origin: from });
      refs[out.status]++;
      if (out.itemId && piece.url) byUrl.set(normalizeWebUrl(piece.url) ?? piece.url, out.itemId);
    } catch (e) {
      refs.failed++;
      failed.push({ what, why: e instanceof HttpError ? e.message : "It could not be saved." });
      // The plan is full: what is left would fail the same way
      if (e instanceof HttpError && e.status === 402) throw e;
    }
  };

  // The brief first, so it opens the board; then the research, then the addresses
  try {
    if (input.brief?.trim()) await bring("brief", { text: input.brief, title: input.brief_title || "Brief", role: "brief", key: "brief" });
    for (const r of input.research ?? []) {
      const sources = (r.sources ?? []).map((s) => `- [${s.url}](${s.url})${s.took?.trim() ? `: ${s.took.trim()}` : ""}`);
      await bring(r.title, { text: sources.length ? `${r.text.trim()}\n\n## Sources\n\n${sources.join("\n")}` : r.text, title: r.title, role: "research", key: `research:${r.key || r.title}` });
    }
    for (const r of input.references ?? []) await bring(r.url, { url: r.url, title: r.title, note: r.note, areas: r.areas, role: (r.role ?? "inspiration") as RefRole });
  } catch { /* the plan is full: the rest is reported as not saved */ }

  // What the project is, when it says nothing yet
  if (input.about?.trim()) {
    const [row] = await db.select({ brief: schema.project.brief }).from(schema.project).where(and(eq(schema.project.organizationId, org), eq(schema.project.id, project.id))).limit(1);
    if (!readBrief(row?.brief)?.about) await saveBrief(org, project.id, { about: input.about.trim() }, ctx.user.id);
  }

  // Answers: an agent's answer waits for the team; one the team dismissed is not brought back
  const answers: Record<string, AnswerInput> = {};
  let answersSkipped = 0;
  for (const a of input.answers ?? []) {
    if (!questionById(a.question)) continue;
    if (dismissed.has(answerKey(a.question, a.answer))) { answersSkipped++; continue; }
    answers[a.question] = { text: a.answer, by: ctx.user.name || ctx.user.email, via: ctx.via, source: a.source ?? "agent", from: a.from, origin: from };
  }
  if (Object.keys(answers).length) await saveAnswers(org, project.id, answers, ctx.user.id);

  // The plan and its directions, with each reference named by its id
  const idOf = (r: string) => byUrl.get(normalizeWebUrl(r) ?? r) ?? (byUrl.get(r) || r);
  const directions: HeroDirection[] | undefined = input.directions?.map((d) => ({ name: d.name, change: d.change, refs: d.refs.map(idOf) }));
  let outline: string | null = null, outlineSkipped = false;
  if (input.outline) {
    if (dismissed.has(outlineKey(input.outline.name))) outlineSkipped = true;
    else {
      const sections: LandingSection[] = input.outline.sections.map((s) => ({ ...s, refs: s.refs.map(idOf) }));
      outline = (await saveOutline(org, project.id, { name: input.outline.name, goal: input.outline.goal, sections, directions, draft: { via: ctx.via ?? undefined, origin: from || undefined } })).name;
    }
  } else if (directions?.length) {
    const first = (await getSystem(org, project.id)).outlines?.[0];
    if (!first) throw new HttpError(400, "Directions go with a landing's plan: pass outline too.");
    await saveOutline(org, project.id, { name: first.name, goal: first.goal, sections: first.sections, directions, ...(first.draft ? { draft: first.draft } : {}) });
    outline = first.name;
  }

  // Area proposals, through the same door as propose_decision
  let proposed = 0;
  for (const p of input.proposals ?? []) {
    const out = await proposeDecision(ctx, origin, { project: project.id, area: p.area, decision: p.decision, why: p.why, never: p.never, reason: from || undefined });
    if (out.proposed) proposed++;
  }

  versionAfterWrite(ctx, origin, project);
  const waiting = refs.suggested + refs.updated + Object.values(answers).filter((a) => a.source !== "person").length + (outline && input.outline ? 1 : 0);
  return {
    project: project.name, id: project.id, url: projectUrl(origin, project.id),
    brought: {
      references: refs,
      answers: { saved: Object.keys(answers).length, dismissed_before: answersSkipped },
      ...(input.outline || directions ? { outline: outline ? { name: outline, directions: directions?.length ?? 0, state: "draft" } : { dismissed_before: outlineSkipped } } : {}),
      ...(input.proposals?.length ? { proposals: proposed } : {}),
    },
    ...(failed.length ? { not_saved: failed } : {}),
    waiting_for_the_team: waiting + proposed,
    do: `Tell the person in one or two short lines what you left (${waiting + proposed} things to review in the app, with the link) and what is still missing, from setup.ask. Do not list every piece. Things the team dismissed before were not brought back.`,
    setup: await setupStep(org, project.id),
  };
}
