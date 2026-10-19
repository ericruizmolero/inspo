import "server-only";
import { z } from "zod";
import { HttpError } from "../workspace-core";
import { getErrors } from "../i18n";
import { toOutputLanguage, type OutputLanguage } from "../output-language";
import { llm, LlmError } from "../llm";
import { prompt } from "../prompts";
import { billOf, recordUsage, type UsageCtx } from "../usage";
import { NEVER_MAX, type SystemArea } from "@/types/system";
import { briefPrompt } from "../brief";
import { areaMemory } from "../area-comments";
import { cleanArea, getSystem, projectRow } from "./areas";
import { loadBoard, markClient } from "./board";
import { memoryLine, RULES_SYSTEM } from "./prompts";

// ─── Sharpen an area's rules ─────────────────────────────────────────────────────────────────────
// The never list as the team wrote it is a line each. Written as a rule (an id, how strong it is, why, and a right
// and a wrong example) an agent can cite the one it keeps or breaks. The model only proposes: the lines come back
// for the team to take, never written into the area by themselves (the same road as any proposal).

const RulesSchema = z.object({
  rules: z.array(z.object({
    slug: z.string(),
    strength: z.enum(["NEVER", "MUST", "SHOULD"]),
    rule: z.string(),
    because: z.string(),
    correct: z.string(),
    wrong: z.string(),
  })),
});

/** The id's prefix: short, so `color-no-gradients` reads at a glance */
const PREFIX: Record<SystemArea, string> = { typography: "type", color: "color", layout: "layout", motion: "motion", iconography: "icon", logo: "logo", imagery: "image", voice: "voice" };

/** The words a rule's line is made of, in the language it is written in; a language not listed here reads them in English */
const WORDS: Partial<Record<OutputLanguage, { because: string; correct: string; wrong: string }>> = {
  en: { because: "Because", correct: "Correct", wrong: "Wrong" },
  es: { because: "Porque", correct: "Bien", wrong: "Mal" },
};

const slugOf = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").slice(0, 5).join("-");
const end = (s: string) => { const t = s.replace(/\s+/g, " ").trim().replace(/[.\s]+$/, ""); return t; };

/** One rule as the line the never list keeps: "`color-no-gradients` NEVER: … Because … Correct: … Wrong: …" */
export function ruleLine(area: SystemArea, r: { slug: string; strength: string; rule: string; because: string; correct: string; wrong: string }, lang: OutputLanguage, taken: Set<string>): string {
  const w = WORDS[lang] ?? WORDS.en!;
  let id = `${PREFIX[area]}-${slugOf(r.slug) || "rule"}`;
  for (let n = 2; taken.has(id); n++) id = `${PREFIX[area]}-${slugOf(r.slug) || "rule"}-${n}`;
  taken.add(id);
  const part = (label: string, text: string, colon: boolean) => (end(text) ? ` ${label}${colon ? ":" : ""} ${end(text)}.` : "");
  return `\`${id}\` ${r.strength}: ${end(r.rule)}.${part(w.because, r.because, false)}${part(w.correct, r.correct, true)}${part(w.wrong, r.wrong, true)}`;
}

/** The area's never list written as rules. Nothing is written: the lines are for the team to take as a proposal. */
export async function sharpenRules(input: { organizationId: string; projectId: string; area: string; usage: UsageCtx; language?: OutputLanguage }): Promise<{ never: string }> {
  const area = await cleanArea(input.area);
  const lang = toOutputLanguage(input.language);
  const project = await projectRow(input.organizationId, input.projectId);
  const [{ refs }, current, memory] = await Promise.all([loadBoard(input.organizationId, input.projectId), getSystem(input.organizationId, input.projectId), areaMemory(input.organizationId, input.projectId)]);
  const standing = current.areas.find((a) => a.area === area)!;
  if (!standing.decision) throw new HttpError(400, (await getErrors()).badBody);
  const codeOf = new Map(refs.map((r) => [r.itemId, r.code]));
  const text = [
    `Project: ${project.name}`,
    `Area: ${area}`,
    `The decision (JSON): ${JSON.stringify({ decision: standing.decision, why: standing.why, evidence: standing.evidence.map((e) => ({ ref: codeOf.get(e.itemId) ?? "gone", take: e.take })) })}`,
    `never_now, the team's lines for this area (one per line):\n${standing.never || "(none)"}`,
    memoryLine(memory[area]),
    briefPrompt(project.brief),
    refs.length ? `References on the board (JSON): ${JSON.stringify(markClient(refs, project.brief))}` : "",
  ].filter(Boolean).join("\n\n");
  let res: Awaited<ReturnType<typeof llm>>;
  try {
    res = await llm(prompt("rules", { system: RULES_SYSTEM, text, schema: RulesSchema, language: lang }));
  } catch (err) {
    if (!(err instanceof LlmError) || !err.finishReason) throw err;
    throw new HttpError(502, `${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
  }
  void recordUsage(input.usage, { action: "system", ...billOf(res), ref: `project:${input.projectId} ${area} rules` });
  const out = RulesSchema.parse(JSON.parse(res.text));
  const taken = new Set<string>();
  const lines = out.rules.filter((r) => end(r.rule)).slice(0, 8).map((r) => ruleLine(area, r, lang, taken));
  if (!lines.length) throw new HttpError(502, (await getErrors()).unexpected);
  return { never: lines.join("\n").slice(0, NEVER_MAX) };
}
