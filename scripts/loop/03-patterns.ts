// Step 3 of the loop prototype: patterns = the same signal repeated across websites.
// One text pass with the smart model over every signal in the workspace. Issue #44.
//   npx tsx --conditions=react-server scripts/loop/03-patterns.ts
import { z } from "zod";
import { savviaRefs, dir, readJson, writeJson, llmJson, MODELS, fmtUsd, AXES } from "./shared";
import type { SignalsFile } from "./02-signals";

const MIN_MEMBERS = 3;

export const PatternSchema = z.object({
  axis: z.enum(AXES),
  name: z.string().describe("Canonical name of the recurring trait, 2-6 words, lowercase"),
  description: z.string().describe("One or two sentences: what the trait is and how it shows up across the members"),
  members: z.array(z.object({ ref: z.string().describe("The ref id exactly as given"), value: z.string().describe("The member's original signal value") })),
});
export const PatternsSchema = z.object({ patterns: z.array(PatternSchema) });
export type Pattern = z.infer<typeof PatternSchema> & { count: number };

const SYSTEM = `You group SIGNALS from many websites into PATTERNS: the same design trait showing up in several references.

Input: one line per signal, "ref | axis | value | evidence". Refs are short ids.

Rules:
- A pattern groups signals of the SAME axis that describe the same trait, even when worded differently ("oversized display type" and "large editorial typography" are one pattern).
- Only patterns with at least ${MIN_MEMBERS} distinct refs. Leave singletons out.
- A ref appears at most once per pattern. Never invent refs: copy the ids exactly.
- Be strict about sameness: "dark theme" and "monochrome palette" are different patterns. "Generous whitespace" and "airy spacing" are the same one.
- Name each pattern with the most common wording in the group, generic and lowercase.
- Order patterns by number of members, largest first. Cover every axis that has repeats.`;

async function main() {
  const refs = await savviaRefs();
  const known = new Set(refs.map((r) => r.key));
  const lines: string[] = [];
  let n = 0;
  for (const r of refs) {
    const s = await readJson<SignalsFile>(dir("signals", `${r.key}.json`));
    if (!s) continue;
    n++;
    for (const sig of s.signals) lines.push(`${r.key} | ${sig.axis} | ${sig.value} | ${sig.evidence.replace(/\s+/g, " ").slice(0, 140)}`);
  }
  console.log(`${lines.length} signals from ${n} websites → ${MODELS.smart}`);
  const { data, res } = await llmJson("patterns", null, { model: MODELS.smart, system: SYSTEM, text: lines.join("\n"), schema: PatternsSchema, maxTokens: 60000, effort: "low" });

  const patterns: Pattern[] = data.patterns
    .map((p) => {
      const seen = new Set<string>();
      const members = p.members.filter((m) => known.has(m.ref) && !seen.has(m.ref) && seen.add(m.ref));
      return { ...p, members, count: members.length };
    })
    .filter((p) => p.count >= MIN_MEMBERS)
    .sort((a, b) => b.count - a.count);
  await writeJson(dir("patterns.json"), { model: res.model, websites: n, signals: lines.length, patterns });
  for (const p of patterns.slice(0, 15)) console.log(`  ${String(p.count).padStart(3)}  ${p.axis.padEnd(10)} ${p.name}`);
  console.log(`done: ${patterns.length} patterns (${data.patterns.length} proposed), ${fmtUsd(res.costUsd ?? 0)}, ${Math.round(res.ms / 1000)}s`);
}
main().catch((e) => { console.error(e); process.exit(1); });
