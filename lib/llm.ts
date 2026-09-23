// The one place that talks to language models, through OpenRouter.
// Call sites keep their prompt and format; the connection, the token count
// and the real cost come from here (#5, #28).
import { z } from "zod";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export const llmEnabled = () => !!process.env.OPENROUTER_API_KEY;

export interface LlmInput {
  model: string;
  system: string;
  text: string;
  image?: Buffer | null;
  /** Structured output. Only providers that honour it strictly are used. */
  schema?: z.ZodType;
  maxTokens: number;
  effort?: "low" | "medium" | "high";
  signal?: AbortSignal;
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
}

export class LlmError extends Error {
  constructor(message: string, readonly finishReason: string | null = null, readonly raw = "") { super(message); }
}

export async function llm(i: LlmInput): Promise<LlmResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");

  const user: unknown[] = [];
  if (i.image) user.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${i.image.toString("base64")}` } });
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
    throw new LlmError(`OpenRouter ${res.status}: ${e?.message ?? res.statusText}${e?.metadata?.raw ? ` (${String(e.metadata.raw).slice(0, 300)})` : ""}`);
  }

  const choice = json.choices?.[0];
  const text = choice?.message?.content ?? "";
  const finish = choice?.finish_reason ?? null;
  // Trap 2 (#5): long answers can run out of budget and come back cut in half
  if (finish !== "stop") {
    const u = json.usage;
    console.error(`llm: ${i.model} via ${json.provider} finish_reason=${finish}, ${text.length} chars, out ${u?.completion_tokens} (reasoning ${u?.completion_tokens_details?.reasoning_tokens}). Tail: …${text.slice(-120)}`);
    throw new LlmError(`${i.model} did not finish (finish_reason=${finish ?? "unknown"})`, finish, text);
  }

  const u = json.usage ?? {};
  const costUsd = typeof u.cost === "number" ? u.cost : null;
  if (costUsd === null) console.warn(`llm: no cost returned for ${json.id} (${json.model})`);

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
