// Every task the app asks a model for, in one table: its model, the model that answers when that one fails, the
// effort, the token budget, the prompt's version and what it writes in the workspace's language. A call names its
// task through prompt() and never a model, so changing one task's model is one variable or one line here and
// touches no other task. Each model has its own variable, with no chain between them.
import { FALLBACK_MODEL, type LlmInput } from "./llm";
import { DEFAULT_OUTPUT_LANGUAGE, languageRule, type OutputLanguage } from "./output-language";

interface PromptSpec {
  model: string;
  /** null: no other model answers */
  fallback: string | null;
  effort?: "low" | "medium" | "high";
  maxTokens: number;
  /** Bumps when the prompt or the output shape changes: ai_usage and the evals keep it, and a stored output it made reads as stale */
  version: number;
  /** What is written in the workspace's language (languageRule); null: the output is always English */
  language: string | null;
}

const env = (name: string, model: string) => process.env[name] || model;
const DEEPSEEK = "deepseek/deepseek-v4.1-flash";
/** What the team reads on screen of the system and its passes */
const SYSTEM_FIELDS = "every decision, why, take, reason, question, option and summary";

export const PROMPTS = {
  /** Reads the board into the eight areas (lib/system.ts runSystem). Reasoning counts against the budget: room for it, the answer itself is short */
  system: { model: env("SYSTEM_MODEL", DEEPSEEK), fallback: FALLBACK_MODEL, effort: "medium", maxTokens: 16000, version: 2, language: SYSTEM_FIELDS },
  /** Other directions for one area */
  options: { model: env("OPTIONS_MODEL", DEEPSEEK), fallback: FALLBACK_MODEL, effort: "medium", maxTokens: 12000, version: 1, language: SYSTEM_FIELDS },
  /** The question that starts an empty area: a person is waiting, so a quick model that does not stop to reason */
  start: { model: env("START_MODEL", "anthropic/claude-haiku-4.5"), fallback: FALLBACK_MODEL, maxTokens: 3000, version: 1, language: SYSTEM_FIELDS },
  /** One area's evidence picked again */
  curate: { model: env("CURATE_MODEL", DEEPSEEK), fallback: FALLBACK_MODEL, effort: "medium", maxTokens: 12000, version: 1, language: SYSTEM_FIELDS },
  /** The inbox's references filed into projects */
  triage: { model: env("TRIAGE_MODEL", DEEPSEEK), fallback: FALLBACK_MODEL, effort: "low", maxTokens: 16000, version: 1, language: SYSTEM_FIELDS },
  /** The brand's values from the areas (lib/brand.ts) */
  brand: { model: env("BRAND_MODEL", DEEPSEEK), fallback: FALLBACK_MODEL, effort: "medium", maxTokens: 12000, version: 1, language: "every lede, paragraph, headline, role, note, rule, principle, sample, pair, tagline, bio and line" },
  /** The agent's plan for a request (lib/agent.ts) */
  agent: { model: env("AGENT_MODEL", DEEPSEEK), fallback: FALLBACK_MODEL, effort: "low", maxTokens: 6000, version: 1, language: '"say", every decision, why, "never" rule, brief, question, label and guide text' },
  /** A reference's tags: words the search matches, so always English. Picked with `npm run tags:bakeoff` (October 2026):
   *  ~$0.0004 an item, the fewest invented tags of four cheap models; any model that takes images and strict JSON will do.
   *  The fallback, second in the bake-off at ~$0.0002 an item, also takes a job's last try (lib/tag-jobs.ts): Gemini
   *  stops mid-answer on some pages, every time */
  tag: { model: env("TAG_MODEL", "google/gemini-2.5-flash-lite"), fallback: env("TAG_FALLBACK_MODEL", "mistralai/mistral-small-3.2-24b-instruct"), maxTokens: 1500, version: 1, language: null },
  /** A site's DESIGN.md: one per URL serves every workspace, so always English (its "es" lines are part of the shape).
   *  Trap 2 (#5): reasoning eats the budget on long answers, so plenty of room */
  design_md: { model: env("DESIGN_MD_MODEL", DEEPSEEK), fallback: FALLBACK_MODEL, effort: "medium", maxTokens: 32000, version: 1, language: null },
} satisfies Record<string, PromptSpec>;

export type PromptTask = keyof typeof PROMPTS;

/** The task and version as ai_usage and the eval rows keep them: "brand@1" */
export const promptId = (task: PromptTask) => `${task}@${PROMPTS[task].version}`;

/** One task's call as llm() takes it: the table's settings, and the language block when the task writes for people */
export function prompt(task: PromptTask, i: Omit<LlmInput, "model" | "maxTokens" | "effort" | "fallback" | "prompt"> & { language?: OutputLanguage }): LlmInput {
  const p: PromptSpec = PROMPTS[task];
  const { language, ...rest } = i;
  return {
    ...rest,
    system: p.language ? `${i.system}\n\n${languageRule(language ?? DEFAULT_OUTPUT_LANGUAGE, p.language)}` : i.system,
    model: p.model, fallback: p.fallback, effort: p.effort, maxTokens: p.maxTokens, prompt: promptId(task),
  };
}
