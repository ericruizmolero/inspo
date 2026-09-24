// Step 2b of the loop prototype: structured signals per website, extracted from the
// DESIGN.md spec plus the existing tags. Text only, cheap model. Mirrors issue #43.
//   npx tsx --conditions=react-server scripts/loop/02-signals.ts
import { z } from "zod";
import { savviaRefs, dir, readJson, writeJson, pool, llmJson, MODELS, fmtUsd, AXES } from "./shared";
import type { DesignFile } from "./01-design";

export const SignalSchema = z.object({
  axis: z.enum(AXES),
  value: z.string().describe("A LABEL of 2-5 words, never a sentence: lowercase English, generic design vocabulary, so the same trait on another site gets the same words. Examples: 'large editorial typography', 'single family two weights', 'monochrome with one accent', 'asymmetric grid', 'hover-only motion', 'terse technical copy'"),
  evidence: z.string().describe("One sentence with the concrete values behind it: font, hex, px, words used"),
  confidence: z.number().min(0).max(1),
});
export const SignalsSchema = z.object({ signals: z.array(SignalSchema).min(4).max(9) });
export type Signal = z.infer<typeof SignalSchema>;
export interface SignalsFile { ref: string; model: string; signals: Signal[] }

const SYSTEM = `You turn one website's design spec into a short list of SIGNALS: observations a design team could recognise across many references.

Axes: typography, colour, layout, motion, content, tone. Aim for one or two signals per axis where the spec supports it; skip an axis rather than invent.

Rules:
- A signal VALUE is a label of 2-5 words, the reusable part: generic, lowercase English, no brand names, no hex, no font names, no clauses. Two sites with the same trait must get the same words, so prefer the most common design vocabulary over precise or poetic phrasing. The nuance goes in the evidence.
- EVIDENCE holds the specifics (font names, hex values, sizes, copy examples).
- Content signals describe what the site chooses to show (dense product grid, single case study per screen, long-form essays). Tone signals describe the voice of the copy (terse, technical, playful, manifesto-like).
- Confidence reflects how clearly the spec supports the signal.`;

async function main() {
  const refs = await savviaRefs();
  let spent = 0;
  const { ok, failed } = await pool(refs, 6, async (r, i) => {
    const out = dir("signals", `${r.key}.json`);
    if (await readJson(out)) return;
    const design = await readJson<DesignFile>(dir("design", `${r.key}.json`));
    if (!design) { console.log(`  · ${r.name}: no DESIGN.md, skipped`); return; }
    const { spec } = design;
    const tags = r.tags ? `Sector: ${r.tags.sector}. Style: ${r.tags.style}. Summary: ${r.tags.summary}${r.tags.visual ? `\nVisual description: ${r.tags.visual}` : ""}` : "";
    const text = [
      `Site: ${r.name} (${design.finalUrl})`,
      tags,
      `Tagline: ${spec.tagline}\nTheme: ${spec.theme}\n\n${spec.description}`,
      `Colors: ${spec.colors.map((c) => `${c.name} ${c.hex} (${c.group}: ${c.role})`).join("; ")}`,
      `Fonts: ${spec.fonts.map((f) => `${f.family} [${f.role}] weights ${f.weights.join("/")} sizes ${f.sizes}. ${f.usage}`).join(" | ")}`,
      `Type scale: ${spec.typeScale.map((t) => `${t.role} ${t.size}px/${t.lineHeight} w${t.weight}`).join(", ")}`,
      `Spacing: ${JSON.stringify(spec.spacing)}\nRadii: ${spec.radii.map((x) => `${x.element} ${x.value}`).join(", ")}\nElevation: ${spec.elevation}`,
      `Layout: ${spec.layout}\nMotion: ${spec.motion}\nImagery: ${spec.imagery}`,
      `Components: ${spec.components.map((c) => `${c.name}: ${c.spec}`).join(" | ")}`,
      `Dos: ${spec.dos.join(" · ")}\nDon'ts: ${spec.donts.join(" · ")}`,
    ].filter(Boolean).join("\n\n");
    const { data, res } = await llmJson("signals", r.key, { model: MODELS.cheap, system: SYSTEM, text, schema: SignalsSchema, maxTokens: 6000, effort: "low" });
    await writeJson(out, { ref: r.key, model: res.model, signals: data.signals } satisfies SignalsFile);
    spent += res.costUsd ?? 0;
    console.log(`  ✓ ${i + 1}/${refs.length} ${r.name} · ${data.signals.length} signals · ${fmtUsd(res.costUsd ?? 0)}`);
  });
  for (const f of failed) console.error(`  ✗ ${f.item.name}: ${f.error}`);
  console.log(`done: ${ok} ok, ${failed.length} failed, spent ${fmtUsd(spent)} this run`);
}
main().catch((e) => { console.error(e); process.exit(1); });
