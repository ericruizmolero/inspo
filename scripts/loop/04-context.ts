// Step 4 of the loop prototype: a first Creative Context proposed from the patterns,
// every principle with its provenance (patterns → refs). Smart model. Issue #45.
//   npx tsx --conditions=react-server scripts/loop/04-context.ts [model]
import { z } from "zod";
import { savviaRefs, dir, readJson, writeJson, writeText, llmJson, MODELS, fmtUsd } from "./shared";
import type { DesignFile } from "./01-design";
import type { Pattern } from "./03-patterns";

const Section = z.object({ topic: z.string(), text: z.string().describe("2-4 sentences, concrete, in the voice of a team's own guidelines") });
export const ContextSchema = z.object({
  name: z.string(),
  overview: z.string().describe("One paragraph, 120-180 words: what this team's taste is, said so a designer would recognise it"),
  visualLanguage: z.array(Section).describe("Topics: typography, colour, composition, motion, ui patterns, imagery. Only the ones the patterns support"),
  verbalLanguage: z.array(Section).describe("Topics: tone, vocabulary, messaging"),
  principles: z.array(z.object({
    title: z.string().describe("Imperative, 3-8 words"),
    statement: z.string().describe("The rule, one or two sentences, actionable"),
    rationale: z.string().describe("Why, grounded in what the references do"),
    patterns: z.array(z.string()).describe("Names of the supporting patterns, exactly as given"),
    refs: z.array(z.string()).describe("3-6 ref ids that best show it, exactly as given"),
    confidence: z.number().min(0).max(1),
  })).min(5).max(12),
  dos: z.array(z.string()).min(5).max(8),
  donts: z.array(z.string()).min(5).max(8),
  examples: z.array(z.object({ ref: z.string(), why: z.string().describe("One sentence: what this reference exemplifies") })).min(6).max(10),
});
export type Context = z.infer<typeof ContextSchema>;

const SYSTEM = `You write the first draft of a CREATIVE CONTEXT for a design studio, from the patterns found across the websites they collected as references.

Input: the patterns (name, axis, how many references share it, description, some member sites) and the list of references (id, name, tagline).

Rules:
- The context describes THEIR taste, not web design in general. Every sentence should be something a rival studio could disagree with.
- Principles must be traceable: cite pattern names and ref ids exactly as given. No pattern, no principle.
- Strong patterns (many members) become firm rules; weaker ones become tendencies, and the wording should say so.
- Do / don't must be specific enough for a designer or an AI agent to follow while making a website.
- Where references disagree (say, dark and light themes both common), state the tension instead of picking a side.
- English, direct, no marketing fluff.`;

export function renderContext(c: Context, patterns: Pattern[], refs: Map<string, { name: string; web: string }>): string {
  const L: string[] = [];
  const p = (s = "") => L.push(s);
  const refLink = (id: string) => { const r = refs.get(id); return r ? `[${r.name}](${r.web})` : `\`${id}\``; };
  const pat = new Map(patterns.map((x) => [x.name.toLowerCase(), x]));
  p(`# ${c.name} — Creative Context (draft)`); p();
  p(`> Proposed by the model from ${refs.size} references. Nothing here is approved yet: mark each principle ✅ / ✏️ / ❌.`); p();
  p("## Overview"); p(); p(c.overview); p();
  p("## Visual language"); p();
  for (const s of c.visualLanguage) { p(`### ${s.topic}`); p(); p(s.text); p(); }
  p("## Verbal language"); p();
  for (const s of c.verbalLanguage) { p(`### ${s.topic}`); p(); p(s.text); p(); }
  p("## Principles"); p();
  c.principles.forEach((pr, i) => {
    p(`### ${i + 1}. ${pr.title}`); p();
    p(`**Decision:** ⬜ approve · ⬜ edit · ⬜ reject`); p();
    p(pr.statement); p(); p(`*Why:* ${pr.rationale}`); p();
    p(`*Confidence:* ${Math.round(pr.confidence * 100)}%`); p();
    const supports = pr.patterns.map((n) => { const x = pat.get(n.toLowerCase()); return x ? `${x.name} (${x.count} refs)` : n; });
    p(`*Patterns:* ${supports.join(" · ")}`); p();
    p(`*References:* ${pr.refs.map(refLink).join(" · ")}`); p();
  });
  p("## Do"); p(); for (const d of c.dos) p(`- ${d}`); p();
  p("## Don't"); p(); for (const d of c.donts) p(`- ${d}`); p();
  p("## Examples"); p(); for (const e of c.examples) p(`- ${refLink(e.ref)}: ${e.why}`); p();
  return L.join("\n");
}

async function main() {
  const model = process.argv[2] || MODELS.smart;
  const refs = await savviaRefs();
  const pj = await readJson<{ patterns: Pattern[] }>(dir("patterns.json"));
  if (!pj) throw new Error("run 03-patterns first");
  const names = new Map(refs.map((r) => [r.key, r.name]));
  const refLines: string[] = [];
  for (const r of refs) {
    const d = await readJson<DesignFile>(dir("design", `${r.key}.json`));
    if (d) refLines.push(`${r.key} | ${r.name} | ${d.spec.theme} | ${d.spec.tagline}`);
  }
  const patLines = pj.patterns.map((x) => `${x.name} [${x.axis}, ${x.count} refs]: ${x.description} Members: ${x.members.slice(0, 6).map((m) => names.get(m.ref) ?? m.ref).join(", ")}${x.count > 6 ? "…" : ""}`);
  const text = `Studio: Savvia (savvia.studio), a small design studio in Spain.\n\nPATTERNS (${pj.patterns.length}):\n${patLines.join("\n")}\n\nREFERENCES (${refLines.length}):\n${refLines.join("\n")}`;
  console.log(`${pj.patterns.length} patterns, ${refLines.length} refs → ${model}`);
  const { data, res } = await llmJson("context", null, { model, system: SYSTEM, text, schema: ContextSchema, maxTokens: 40000, effort: "low" });
  const slug = model.replace(/[^a-z0-9]+/gi, "-");
  await writeJson(dir(`context.${slug}.json`), { model: res.model, costUsd: res.costUsd, context: data });
  await writeText(dir(`context.${slug}.md`), renderContext(data, pj.patterns, new Map(refs.map((r) => [r.key, { name: r.name, web: r.web }]))));
  console.log(`done: ${data.principles.length} principles, ${fmtUsd(res.costUsd ?? 0)}, ${Math.round(res.ms / 1000)}s → .data/loop/context.${slug}.md`);
}
main().catch((e) => { console.error(e); process.exit(1); });
