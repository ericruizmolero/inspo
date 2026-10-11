import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { once } from "../capture-claim";
import { HttpError } from "../workspace-core";
import { getErrors } from "../i18n";
import type { OutputLanguage } from "../output-language";
import { llm, LlmError, type LlmInput } from "../llm";
import { prompt, PROMPTS } from "../prompts";
import { SIGNAL_AREA } from "../taxonomy";
import { autoSystemPass, billOf, recordUsage, systemPassRef, type UsageCtx } from "../usage";
import { autoSystemToday, hadSystemPass } from "../quota";
import { DECISION_MAX, IMPROVE_NOTE_MAX, SYSTEM_AREAS, cleanDecision, emptySystem, type ImproveAim, type SystemFocus, type ProjectSystem, type SystemArea, type SystemEvidence, type SystemRun } from "@/types/system";
import { briefPrompt } from "../brief";
import { guideCutLine } from "../brand-guides";
import { log } from "../log";
import { ensureHead, getSystem, writeArea, type AreaWrite } from "./areas";
import { loadSnapshot, supportOf, type SignalTally, type SystemSnapshot } from "./board";
import { SYSTEM } from "./prompts";

const S = schema.projectSystem;
const A = schema.systemArea;

// ─── The run ─────────────────────────────────────────────────────────────────

export const SystemOutSchema = z.object({
  summary: z.string(),
  areas: z.array(z.object({
    area: z.enum(SYSTEM_AREAS),
    decision: z.string(),
    why: z.string(),
    confidence: z.number().int().min(0).max(100),
    evidence: z.array(z.object({ ref: z.string(), take: z.string() })),
    signals: z.array(z.enum(Object.keys(SIGNAL_AREA) as [string, ...string[]])),
  })),
});

/** What each aim of a pass asked for by hand tells the model */
const AIMS: Record<ImproveAim, string> = {
  order: "Put order in the system: each idea in the area it belongs to, nothing said twice across areas, no area contradicting another or the summary.",
  copy: "Sharpen the writing of decisions, whys and takes: tighter, more concrete, the same meaning. For this pass this overrides \"do not rephrase\".",
  refs: "Read the references again from scratch: evidence and takes re-derived from what each reference actually shows and what the team said about it, not carried over from the previous pass.",
};
/** The team's scope for this pass, as the last block of the prompt; nothing when the pass is the plain one */
function focusForModel(focus: SystemFocus | undefined, teamAreas: SystemArea[] = []): string | null {
  if (!focus) return null;
  // Areas the team decided and now asks to improve: its decision stands, how it is told is what gets better
  const own = focus.areas.filter((a) => teamAreas.includes(a));
  const note = (focus.note ?? "").trim().replace(/\s+/g, " ").slice(0, IMPROVE_NOTE_MAX);
  const lines = [
    focus.areas.length < SYSTEM_AREAS.length ? `Work ONLY on these areas: ${focus.areas.join(", ")}. Return every other area exactly as it stands.` : "",
    own.length ? `The team asks you to improve areas it decided itself: ${own.join(", ")}. For this pass they are NOT returned unchanged. Keep what each one decides: its direction and every concrete value (families, weights, colours, sizes, numbers, verbatim quotes), and keep its length (they may run well over 60 words, with their own line breaks: do not shorten or summarise them). Improve how it is written, its why and the evidence behind it. Never empty one of them.` : "",
    // Asked for by hand, the pass may go past what the team said: everything on the board is context to decide from
    "In this pass you may fill the areas asked for from the whole context, past the rule of being faithful to what the team brought: the measured briefs, what each reference shows and the project brief. An area decided only from that context gets a low confidence (25 to 45).",
    ...focus.aims.map((a) => AIMS[a]),
    note ? `In the team's own words, to follow as an instruction for this pass only: ${JSON.stringify(note)}` : "",
  ].filter(Boolean);
  return lines.length ? `THIS PASS was asked for by the team, who said what they want from it:\n${lines.map((l) => `- ${l}`).join("\n")}` : null;
}

/** The tally as the model reads it: per area, each signal and in how many of the board's references it shows */
function tallyForModel(t: SignalTally | undefined): string | null {
  const rows = SYSTEM_AREAS.flatMap((area) => t?.areas[area]?.length ? [`- ${area}: ${t.areas[area]!.map((x) => `${x.signal} in ${x.refs.length} of ${t.of}`).join(", ")}`] : []);
  return rows.length ? `SIGNALS ACROSS THE BOARD: per area, how many of the ${t!.of} references show each signal\n${rows.join("\n")}` : null;
}

/** The system pass as one model call */
export function systemRequest(s: SystemSnapshot, o: { language?: OutputLanguage; focus?: SystemFocus } = {}): LlmInput & { schema: typeof SystemOutSchema } {
  const text = [
    `Project: ${s.name}`,
    briefPrompt(s.brief),
    `System as it stands (JSON): ${JSON.stringify(s.standing)}`,
    `References on the board (JSON): ${JSON.stringify(s.refs)}`,
    s.omitted ? `${s.omitted} references on the board were left out of this reading; what you see is not everything the team saved.` : null,
    tallyForModel(s.signals),
    s.guides.length ? `GUIDE: brand guidelines the team brought in, verbatim. They are the brand's own word, as strong as the client's site: decisions follow their explicit rules and values unless the team's own words on the board say otherwise. Cite no reference for what only the guide says.\n${s.guides.map((g) => `<<<\n${g}\n>>>`).join("\n")}` : null,
    s.guides.length ? guideCutLine(s.guidesCut) : null,
    focusForModel(o.focus, s.standing.filter((a) => a.status === "team").map((a) => a.area)),
  ].filter(Boolean).join("\n\n");
  return { ...prompt("system", { system: SYSTEM, text, language: o.language }), schema: SystemOutSchema };
}

// One pass per project at a time, across instances (lib/capture-claim.ts): two tabs must not pay twice for the
// same board. The others wait for the claim to go and answer with what that pass wrote. A claim left by a function
// cut off goes stale at the routes' maxDuration (90 s); a request waits a margin short of it.
export const PASS_CLAIM = { staleMs: 90_000, waitMs: 70_000 };

/** A pass that `once` did not run because another one outlasted the wait */
export async function passBusy(): Promise<never> {
  throw new HttpError(503, (await getErrors()).unexpected);
}

/**
 * Reads the board and writes the system: the model's proposal for every area the team has not
 * decided, the summary and the run. Always costs (little): the client asks when the run is stale.
 */
export async function runSystem(input: { organizationId: string; projectId: string; usage: UsageCtx; language?: OutputLanguage; focus?: SystemFocus; /** The client calls this pass automatic; autoSystemPass decides whether it counts */ auto?: boolean }): Promise<ProjectSystem> {
  const key = `system:${input.organizationId}|${input.projectId}`;
  return (await once(key, PASS_CLAIM, async () => {
    const { snapshot, refs, stamp, current } = await loadSnapshot(input.organizationId, input.projectId);
    if (!refs.length && !snapshot.guides.length) throw new HttpError(400, (await getErrors()).systemEmptyBoard);
    const asked = !!input.auto && !input.focus;
    const auto = autoSystemPass(asked, { lastStamp: current.run?.stamp ?? null, stamp, autoToday: asked ? await autoSystemToday(input.organizationId, input.projectId) : 0 });

    const codes = new Map(refs.map((r) => [r.code, r.itemId]));
    const codeOf = new Map(refs.map((r) => [r.itemId, r.code]));
    const textIds = new Set(refs.filter((r) => r.ref.kind === "text").map((r) => r.itemId));
    let res: Awaited<ReturnType<typeof llm>>;
    try {
      res = await llm(systemRequest(snapshot, input));
    } catch (err) {
      if (!(err instanceof LlmError) || !err.finishReason) throw err;
      throw new HttpError(502, `${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
    }
    // Awaited: a brand pass asked for right after this one looks for this row (autoBrandPass)
    // Two first passes of one account at once, on two projects, may both go free: accepted, it is one pass
    const countedBefore = auto || await hadSystemPass(input.organizationId);
    await recordUsage(input.usage, { action: "system", ...billOf(res), ref: systemPassRef(input.projectId, { auto, countedBefore }) });
    const out = SystemOutSchema.parse(JSON.parse(res.text));
    log.info("system.built", { ref: input.projectId, refs: refs.length, omitted: snapshot.omitted, areasFilled: out.areas.filter((a) => a.decision.trim()).length, tokensIn: res.usage.input, tokensOut: res.usage.output, ms: res.ms, costUsd: res.costUsd });

    const now = new Date();
    await ensureHead(input.organizationId, input.projectId, now);
    const run: SystemRun = { itemIds: refs.map((r) => r.itemId), stamp, model: res.model, version: PROMPTS.system.version, at: now.toISOString(), ...(snapshot.omitted ? { omitted: snapshot.omitted } : {}) };
    await db.update(S).set({ summary: out.summary.trim().slice(0, 1200), runJson: run, updatedAt: now })
      .where(and(eq(S.organizationId, input.organizationId), eq(S.projectId, input.projectId)));

    const byArea = new Map(out.areas.map((a) => [a.area, a]));
    for (const cur of current.areas) {
      if (input.focus && !input.focus.areas.includes(cur.area)) continue;  // out of this pass's scope: as it was
      // The team's word stands, unless the team itself asked for this area to be improved ("Improve with AI")
      const own = cur.source === "team";
      const got = byArea.get(cur.area);
      if (own && !input.focus) {
        // Its words stand; how many references back it is the app's count, so the run keeps it current
        const support = supportOf(cur.area, got?.signals ?? [], snapshot.signals, codes);
        if (cur.decision && JSON.stringify(support) !== JSON.stringify(cur.support)) {
          await db.update(A).set({ support }).where(and(eq(A.organizationId, input.organizationId), eq(A.projectId, input.projectId), eq(A.area, cur.area)));
        }
        continue;
      }
      // A decision of the team keeps its paragraphs; a proposal is one run of text
      const decision = own ? cleanDecision(got?.decision) : (got?.decision ?? "").trim().replace(/\s+/g, " ").slice(0, DECISION_MAX);
      if (own && !decision) continue;  // never emptied by a pass
      // Back to item ids; an invented code or a repeated reference is dropped
      // What a person filed under the area stays, whatever the model made of it
      const pinned = cur.evidence.filter((e) => e.pinned && codes.has(codeOf.get(e.itemId) ?? ""));
      const seen = new Set<string>(pinned.map((e) => e.itemId));
      const evidence: SystemEvidence[] = [...pinned];
      for (const e of got?.evidence ?? []) {
        const itemId = codes.get(e.ref);
        if (!itemId) continue;
        // The project's content backs no area but voice, whatever the model made of it
        if (cur.area !== "voice" && textIds.has(itemId)) continue;
        if (seen.has(itemId)) { const p = evidence.find((x) => x.itemId === itemId); if (p && !p.take) p.take = e.take.trim().slice(0, 200); continue; }
        seen.add(itemId);
        evidence.push({ itemId, take: e.take.trim().slice(0, 200) });
      }
      // An improved decision of the team is still the team's: same author, same standing, better told
      // A proposal is backed by what this run counted
      const next: AreaWrite = own
        ? { area: cur.area, decision, confidence: cur.confidence, evidence, source: "team", decidedBy: cur.decidedBy, why: got?.why || cur.why }
        : decision
        ? { area: cur.area, decision, confidence: Math.max(1, got?.confidence ?? 0), evidence, source: "model", decidedBy: null, why: got?.why ?? "", support: supportOf(cur.area, got?.signals ?? [], snapshot.signals, codes) }
        : { area: cur.area, decision: "", confidence: 0, evidence: pinned, source: null, decidedBy: null, why: "" };
      const same = next.decision === cur.decision && next.confidence === cur.confidence && JSON.stringify(next.evidence) === JSON.stringify(cur.evidence) && (next.why ?? "") === cur.why
        && (next.support === undefined || JSON.stringify(next.support) === JSON.stringify(cur.support));
      if (same && (cur.decision || cur.updatedAt !== emptySystem(input.projectId).areas[0].updatedAt)) continue;
      await writeArea(input.organizationId, input.projectId, next, { id: null, name: res.model }, now);
    }
    return getSystem(input.organizationId, input.projectId);
  }, () => getSystem(input.organizationId, input.projectId))) ?? passBusy();
}
