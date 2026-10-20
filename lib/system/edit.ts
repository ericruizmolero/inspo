import "server-only";
import { z } from "zod";
import { HttpError } from "../workspace-core";
import { getErrors } from "../i18n";
import { toOutputLanguage, type OutputLanguage } from "../output-language";
import { llm, LlmError } from "../llm";
import { prompt } from "../prompts";
import { billOf, recordUsage, type UsageCtx } from "../usage";
import { NEVER_MAX, SYSTEM_AREAS, cleanDecision, type SystemArea } from "@/types/system";
import { briefPrompt } from "../brief";
import { loadShareView } from "../share-view";
import type { Locale } from "../i18n/locale";
import { getSystem, projectRow } from "./areas";
import { EDIT_SYSTEM } from "./prompts";

// ─── Tell Tino what to change ────────────────────────────────────────────────────────────────────
// A person says in words what to change in criterio.md ("no bold in running text"). The model reads the file and
// writes again the areas the change touches, each with a sentence, as Tino, of what changes and why. Nothing is
// written: the client leaves each one under its area as Tino's proposal, for the team to accept or leave (the same
// road as any proposal). An instruction the file already follows touches no area.

const EditSchema = z.object({
  edits: z.array(z.object({ area: z.enum(SYSTEM_AREAS), decision: z.string(), why: z.string(), never: z.array(z.string()), reason: z.string() })),
});

export type AreaEdit = { area: SystemArea; decision: string; why: string; never: string; reason: string };

const INSTRUCTION_MAX = 400;
/** A change in words touches a few areas at most; more would be a new pass, which "Improve with AI" is */
const EDITS_MAX = 3;
const WHY_MAX = 400;
const REASON_MAX = 240;
/** The file the model reads: the areas lead it, the references' appendix at its end can be cut */
const FILE_MAX = 60_000;

const line = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);

/** The areas the instruction touches, written again with the change. Nothing is written: they are for the team to
 *  take as proposals. An empty list when the file needs no change for it */
export async function editFile(input: {
  organizationId: string; projectId: string; instruction: string; usage: UsageCtx; language?: OutputLanguage;
  /** The file is read as a share link hands it out, as an agent gets it */
  locale: Locale; origin: string;
}): Promise<AreaEdit[]> {
  const instruction = line(input.instruction, INSTRUCTION_MAX);
  if (!instruction) throw new HttpError(400, (await getErrors()).badBody);
  const project = await projectRow(input.organizationId, input.projectId);
  const [system, view] = await Promise.all([getSystem(input.organizationId, input.projectId), loadShareView(input.organizationId, input.projectId, "full", input.locale, null, input.origin)]);
  const text = [
    `Project: ${project.name}`,
    `What to change: ${JSON.stringify(instruction)}`,
    `The areas now, as written (JSON): ${JSON.stringify(Object.fromEntries(system.areas.map((a) => [a.area, { decision: a.decision, why: a.why, never: a.never.split("\n").filter(Boolean) }])))}`,
    briefPrompt(project.brief),
    `The file, criterio.md:\n${(view?.markdown ?? "").slice(0, FILE_MAX)}`,
  ].filter(Boolean).join("\n\n");
  let res: Awaited<ReturnType<typeof llm>>;
  try {
    res = await llm(prompt("edit", { system: EDIT_SYSTEM, text, schema: EditSchema, language: toOutputLanguage(input.language) }));
  } catch (err) {
    if (!(err instanceof LlmError) || !err.finishReason) throw err;
    throw new HttpError(502, `${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
  }
  void recordUsage(input.usage, { action: "system", ...billOf(res), ref: `project:${input.projectId} edit` });
  const out = EditSchema.parse(JSON.parse(res.text));
  const seen = new Set<SystemArea>();
  return out.edits.flatMap((e) => {
    const decision = cleanDecision(e.decision);
    const reason = line(e.reason, REASON_MAX);
    const now = system.areas.find((a) => a.area === e.area)!;
    const never = e.never.map((l) => line(l, 400).replace(/^[-*·]\s*/, "")).filter(Boolean).join("\n").slice(0, NEVER_MAX);
    const why = line(e.why, WHY_MAX);
    // One proposal per area, and only one that changes something
    if (!decision || !reason || seen.has(e.area) || (decision === now.decision && why === now.why && never === now.never)) return [];
    seen.add(e.area);
    return [{ area: e.area, decision, why, never, reason }];
  }).slice(0, EDITS_MAX);
}
