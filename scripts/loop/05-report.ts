// Renders what the partners will read: signals per website, patterns with their
// references, and the bill. Copies everything into docs/loop-proto/ to commit.
//   npx tsx --conditions=react-server scripts/loop/05-report.ts
import { promises as fs } from "fs";
import path from "path";
import { savviaRefs, dir, readJson, writeText, ledger, fmtUsd, AXES } from "./shared";
import type { DesignFile } from "./01-design";
import type { SignalsFile } from "./02-signals";
import type { Pattern } from "./03-patterns";

const DOCS = path.join(process.cwd(), "docs", "loop-proto");

async function main() {
  const refs = await savviaRefs();
  const byKey = new Map(refs.map((r) => [r.key, r]));
  const link = (id: string) => { const r = byKey.get(id); return r ? `[${r.name}](${r.web})` : `\`${id}\``; };

  // signals.md
  const S: string[] = ["# Signals per website", "", "One block per reference: tagline from its DESIGN.md, then the signals by axis (value · evidence · confidence).", ""];
  let sites = 0, total = 0;
  for (const r of refs) {
    const d = await readJson<DesignFile>(dir("design", `${r.key}.json`));
    const s = await readJson<SignalsFile>(dir("signals", `${r.key}.json`));
    if (!d || !s) continue;
    sites++; total += s.signals.length;
    S.push(`## ${r.name}`, "", `${r.web} · *${d.spec.tagline}* · ${d.spec.theme}`, "");
    for (const axis of AXES) for (const sig of s.signals.filter((x) => x.axis === axis)) S.push(`- **${axis}** · ${sig.value} · ${sig.evidence} · ${Math.round(sig.confidence * 100)}%`);
    S.push("");
  }
  S.splice(3, 0, `${sites} websites · ${total} signals`);
  await writeText(dir("signals.md"), S.join("\n"));

  // patterns.md
  const pj = await readJson<{ patterns: Pattern[]; signals: number; websites: number }>(dir("patterns.json"));
  const P: string[] = ["# Patterns", ""];
  if (pj) {
    P.push(`${pj.patterns.length} patterns from ${pj.signals} signals across ${pj.websites} websites. A pattern needs at least 3 references.`, "");
    P.push("| # | Axis | Pattern | Refs |", "|---|---|---|---|");
    pj.patterns.forEach((x, i) => P.push(`| ${i + 1} | ${x.axis} | ${x.name} | ${x.count} |`));
    P.push("");
    pj.patterns.forEach((x, i) => {
      P.push(`## ${i + 1}. ${x.name}`, "", `**${x.axis}** · found in ${x.count} references`, "", x.description, "");
      for (const m of x.members) P.push(`- ${link(m.ref)} · *${m.value}*`);
      P.push("");
    });
  } else P.push("Run 03-patterns first.");
  await writeText(dir("patterns.md"), P.join("\n"));

  // costs.md
  const rows = await ledger();
  const agg = new Map<string, { n: number; usd: number; input: number; output: number }>();
  for (const r of rows) {
    const k = `${r.step} · ${r.model}`;
    const a = agg.get(k) ?? { n: 0, usd: 0, input: 0, output: 0 };
    a.n++; a.usd += r.costUsd ?? 0; a.input += r.input; a.output += r.output; agg.set(k, a);
  }
  const C: string[] = ["# Cost of the run", "", "| Step · model | Calls | Avg | Total | Tokens in / out |", "|---|---|---|---|---|"];
  let sum = 0;
  for (const [k, a] of agg) { sum += a.usd; C.push(`| ${k} | ${a.n} | ${fmtUsd(a.usd / a.n)} | ${fmtUsd(a.usd)} | ${a.input} / ${a.output} |`); }
  C.push("", `**Total: ${fmtUsd(sum)}** (what OpenRouter billed, not an estimate).`);
  await writeText(dir("costs.md"), C.join("\n"));

  // docs/loop-proto
  await fs.mkdir(DOCS, { recursive: true });
  for (const f of ["signals.md", "patterns.md", "costs.md"]) await fs.copyFile(dir(f), path.join(DOCS, f));
  for (const f of await fs.readdir(dir())) if (/^context\..*\.md$/.test(f)) await fs.copyFile(dir(f), path.join(DOCS, f));
  console.log(`signals: ${sites} sites / ${total} signals · patterns: ${pj?.patterns.length ?? 0} · spent ${fmtUsd(sum)} → docs/loop-proto/`);
}
main().catch((e) => { console.error(e); process.exit(1); });
