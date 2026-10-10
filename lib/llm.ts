// The one place that talks to language models, through OpenRouter.
// Call sites keep their prompt and format; the connection, the token count
// and the real cost come from here (#5, #28).
import { z } from "zod";
import { log, recordFailure } from "./log";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export const llmEnabled = () => !!process.env.OPENROUTER_API_KEY;

/** Answers a call when its own model fails twice: another provider, so one outage does not take both */
export const FALLBACK_MODEL = process.env.LLM_FALLBACK_MODEL || "anthropic/claude-haiku-5.5";

export interface LlmInput {
  model: string;
  system: string;
  text: string;
  image?: Buffer | null;
  /** Media type of `image` (a JPEG screenshot unless said otherwise) */
  imageType?: string;
  /** Structured output. Only providers that honour it strictly are used. */
  schema?: z.ZodType;
  maxTokens: number;
  effort?: "low" | "medium" | "high";
  signal?: AbortSignal;
  /** The model that answers when `model` fails. null: no fallback (an eval measures the model itself) */
  fallback?: string | null;
  /** The task and version that built this call (lib/prompts.ts), handed back on the result for ai_usage */
  prompt?: string;
}

export interface LlmResult {
  text: string;
  model: string;
  provider: string | null;
  id: string | null;
  usage: { input: number; output: number; cacheRead: number; reasoning: number };
  /** USD billed by OpenRouter. null means it did not come back: logged, never guessed. */
  costUsd: number | null;
  ms: number;
  /** The model asked for when another one answered (FALLBACK_MODEL); null when the first choice did */
  fallbackFrom: string | null;
  /** The input's `prompt`; null for a call no task built (a script's own) */
  prompt: string | null;
}

export class LlmError extends Error {
  /** `status`: the HTTP status when OpenRouter refused the call (429: rate limited). `costUsd`: what an unfinished answer was billed */
  constructor(message: string, readonly finishReason: string | null = null, readonly raw = "", readonly status: number | null = null, readonly costUsd = 0) { super(message); }
}

/** A provider hiccup (dropped connection, 429, 5xx) is worth the same model again; an unfinished answer is not */
const dropped = (e: unknown) => e instanceof LlmError ? !e.finishReason && (e.status === null || e.status === 408 || e.status === 429 || e.status >= 500) : true;
/** What another model may answer: anything but the account itself refused (bad key, no credit), which fails every model */
const recoverable = (e: unknown) => !(e instanceof LlmError) || (e.status !== 401 && e.status !== 402);

/**
 * One call: the model, once more if the call was dropped, then the fallback model. Every failure is stored
 * (lib/log.ts), recovered or not; a call the caller aborted is neither a failure nor stored. An unfinished
 * answer is billed, so its cost is added to the one that answers.
 */
export async function llm(i: LlmInput): Promise<LlmResult> {
  const fallback = i.fallback === undefined ? FALLBACK_MODEL : i.fallback;
  let wasted = 0;
  let last: unknown;
  for (const [n, model] of [i.model, i.model, fallback].entries()) {
    if (!model || (n === 1 && !dropped(last)) || (n === 2 && model === i.model)) continue;
    try {
      const r = await call({ ...i, model });
      return { ...r, costUsd: r.costUsd === null ? null : r.costUsd + wasted, fallbackFrom: n === 2 ? i.model : null, prompt: i.prompt ?? null };
    } catch (e) {
      if (i.signal?.aborted) throw e;
      void recordFailure("ai", model, e);
      if (!recoverable(e)) throw e;
      if (e instanceof LlmError) wasted += e.costUsd;
      log.warn("llm.attempt_failed", { model, attempt: n + 1, err: e });
      last = e;
      if (n === 0 && dropped(e)) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw last;
}

async function call(i: LlmInput): Promise<Omit<LlmResult, "fallbackFrom" | "prompt">> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");

  const user: unknown[] = [];
  if (i.image) user.push({ type: "image_url", image_url: { url: `data:${i.imageType ?? "image/jpeg"};base64,${i.image.toString("base64")}` } });
  user.push({ type: "text", text: i.text });

  const body = {
    model: i.model,
    max_tokens: i.maxTokens,
    messages: [
      // cache_control only matters on Anthropic; OpenRouter drops it elsewhere
      { role: "system", content: [{ type: "text", text: i.system, cache_control: { type: "ephemeral" } }] },
      { role: "user", content: user },
    ],
    ...(i.effort ? { reasoning: { effort: i.effort } } : {}),
    ...(i.schema ? {
      response_format: { type: "json_schema", json_schema: { name: "output", strict: true, schema: z.toJSONSchema(i.schema) } },
      // Trap 1 (#5): some providers accept the schema and then treat it as a hint
      provider: { require_parameters: true },
    } : {}),
    usage: { include: true },
  };

  const t0 = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "criterio.design" },
    body: JSON.stringify(body),
    signal: i.signal,
  });
  const json = await res.json().catch(() => null) as OpenRouterResponse | null;
  if (!res.ok || !json || json.error) {
    const e = json?.error;
    throw new LlmError(`OpenRouter ${res.status}: ${e?.message ?? res.statusText}${e?.metadata?.raw ? ` (${String(e.metadata.raw).slice(0, 300)})` : ""}`, null, "", res.status);
  }

  const choice = json.choices?.[0];
  const text = choice?.message?.content ?? "";
  const finish = choice?.finish_reason ?? null;
  // Trap 2 (#5): long answers can run out of budget and come back cut in half
  if (finish !== "stop") {
    const u = json.usage;
    // Never the text itself: a model answer can quote what a person wrote
    log.error("llm.unfinished", { model: i.model, provider: json.provider, finish, chars: text.length, output: u?.completion_tokens, reasoning: u?.completion_tokens_details?.reasoning_tokens });
    throw new LlmError(`${i.model} did not finish (finish_reason=${finish ?? "unknown"})`, finish ?? "unknown", text, res.status, typeof u?.cost === "number" ? u.cost : 0);
  }

  const u = json.usage ?? {};
  const costUsd = typeof u.cost === "number" ? u.cost : null;
  if (costUsd === null) log.warn("llm.no_cost", { id: json.id, model: json.model });

  return {
    text,
    model: json.model ?? i.model,
    provider: json.provider ?? null,
    id: json.id ?? null,
    usage: {
      input: u.prompt_tokens ?? 0,
      output: u.completion_tokens ?? 0,
      cacheRead: u.prompt_tokens_details?.cached_tokens ?? 0,
      reasoning: u.completion_tokens_details?.reasoning_tokens ?? 0,
    },
    costUsd,
    ms: Date.now() - t0,
  };
}

interface OpenRouterResponse {
  id?: string;
  model?: string;
  provider?: string;
  error?: { message?: string; metadata?: { raw?: unknown } };
  choices?: { finish_reason?: string; message?: { content?: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cost?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
}
