// Shared bits of the loop prototype (#42): env, local DB, output folders and a cost ledger.
// Everything runs against the LOCAL database copy and writes to .data/loop/ (git-ignored).
// Never touches Turso, Blob or ai_usage: this is a lab bench, not the product.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
process.env.DATABASE_URL = "file:.data/inspo.db";
delete process.env.BLOB_READ_WRITE_TOKEN;

import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../../lib/db";
import { llm, type LlmInput, type LlmResult } from "../../lib/llm";
import type { InspoTags } from "../../types/inspo";

export const OUT = path.join(process.cwd(), ".data", "loop");
export const dir = (...p: string[]) => path.join(OUT, ...p);
export const AXES = ["typography", "colour", "layout", "motion", "content", "tone"] as const;
export type Axis = (typeof AXES)[number];

export const SKIP_HOSTS = ["youtube.com", "youtu.be", "vimeo.com", "x.com", "twitter.com", "instagram.com", "linkedin.com", "tiktok.com", "primevideo.com", "netflix.com"];

export interface Ref { id: string; key: string; name: string; web: string; note: string; tags: InspoTags | null }

export function keyOf(web: string): string {
  return createHash("sha1").update(web.trim().toLowerCase()).digest("hex").slice(0, 12);
}

/** Savvia's websites from the local DB copy, minus video and social hosts. */
export async function savviaRefs(): Promise<Ref[]> {
  const org = await db.query.organization.findFirst({ where: eq(schema.organization.name, "Savvia") });
  if (!org) throw new Error("No Savvia organization in the local DB");
  const rows = await db.select().from(schema.inspoItem)
    .where(and(eq(schema.inspoItem.organizationId, org.id), eq(schema.inspoItem.type, "inspiration")));
  return rows
    .filter((r) => { try { const h = new URL(r.web).hostname.replace(/^www\./, ""); return !SKIP_HOSTS.some((s) => h === s || h.endsWith(`.${s}`)); } catch { return false; } })
    .map((r) => ({ id: r.id, key: keyOf(r.web), name: r.name, web: r.web, note: r.note, tags: r.tagsJson ? JSON.parse(r.tagsJson) as InspoTags : null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function readJson<T>(file: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(file, "utf8")) as T; } catch { return null; }
}
export async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}
export async function writeText(file: string, text: string | Buffer): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, text);
}

// ─── Cost ledger: one JSONL line per model call ─────────────────────────────

export interface LedgerRow { at: string; step: string; ref: string | null; model: string; provider: string | null; input: number; output: number; reasoning: number; costUsd: number | null; ms: number }

export async function record(step: string, ref: string | null, res: LlmResult): Promise<void> {
  const row: LedgerRow = { at: new Date().toISOString(), step, ref, model: res.model, provider: res.provider, input: res.usage.input, output: res.usage.output, reasoning: res.usage.reasoning, costUsd: res.costUsd, ms: res.ms };
  await fs.mkdir(OUT, { recursive: true });
  await fs.appendFile(dir("ledger.jsonl"), JSON.stringify(row) + "\n");
}

export async function ledger(): Promise<LedgerRow[]> {
  try { return (await fs.readFile(dir("ledger.jsonl"), "utf8")).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as LedgerRow); } catch { return []; }
}

export function fmtUsd(n: number): string { return `${n.toFixed(n < 0.1 ? 4 : 2)} $`; }

/** llm() with a zod schema, parsed and validated, and the call written to the ledger. */
export async function llmJson<T extends z.ZodType>(step: string, ref: string | null, i: Omit<LlmInput, "schema"> & { schema: T }): Promise<{ data: z.infer<T>; res: LlmResult }> {
  const res = await llm(i);
  await record(step, ref, res);
  const data = i.schema.parse(JSON.parse(res.text.replace(/−/g, "-")));
  return { data, res };
}

/** Run `fn` over `items` with at most `n` in flight; errors are collected, not thrown. */
export async function pool<T>(items: T[], n: number, fn: (item: T, idx: number) => Promise<void>): Promise<{ ok: number; failed: { item: T; error: string }[] }> {
  let next = 0, ok = 0; const failed: { item: T; error: string }[] = [];
  const worker = async () => {
    while (next < items.length) {
      const idx = next++;
      try { await fn(items[idx], idx); ok++; } catch (e) { failed.push({ item: items[idx], error: e instanceof Error ? e.message : String(e) }); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return { ok, failed };
}

export const MODELS = {
  cheap: process.env.LOOP_CHEAP_MODEL || "deepseek/deepseek-v4.1-flash",
  smart: process.env.LOOP_SMART_MODEL || "anthropic/claude-sonnet-5",
};
