// The values the areas already decided, gathered where an agent looks for tokens. Nothing is parsed or rewritten: each
// line is a sentence of an area's own decision or why, word for word, kept because it carries a value. A regex cannot
// tell `clamp(20px, 4vw, 64px)` from `20px`, nor "two radii" from one, nor which red is for fills; the sentence can.
import { SYSTEM_AREAS, type ProjectSystem, type SystemArea } from "@/types/system";
import { motionFacts } from "./md-skills";

/** What makes a sentence carry a value: a colour, a length or time, a function, a weight, a curve */
const VALUE = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|clamp|min|max|calc|cubic-bezier)\(|\d\s?(?:px|rem|em|vw|vh|ch|ms|s|%)(?![a-z])|\b[1-9]00\b|\b(?:power[0-4]|sine|expo|circ|quad|cubic|quart|quint)\.(?:in|out|inOut)\b/i;

/** A text cut into sentences: at a full stop or a line, never inside a number ("3,2px") or a function */
const sentences = (text: string): string[] =>
  text.split("\n").flatMap((line) => line.split(/(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÑ¿¡`"“*_(\-])/)).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);

/** Per area, the sentences of its decision and why that carry a value; areas with none are left out */
export function areaTokenLines(system: ProjectSystem, labels: Record<SystemArea, string>): string[] {
  const out: string[] = [];
  for (const key of SYSTEM_AREAS) {
    const a = system.areas.find((x) => x.area === key);
    if (!a?.decision) continue;
    // Never the Never, Must or Should lists: a rule lifted out of its list loses its polarity ("flat faces with a 1px black
    // outline" reads as an order), and its strength. They stay where they are, and in "Never, at a glance"
    const found = [...new Set(sentences(`${a.decision}\n${a.why}`).filter((s) => VALUE.test(s)))];
    // The curves the team kept while curating are decided too, even when the words never name them
    if (key === "motion") {
      const { curves } = motionFacts(a);
      for (const c of curves) if (c.points && !found.some((s) => s.includes(c.points!))) found.push(`\`cubic-bezier(${c.points})\``);
    }
    if (found.length) out.push(`- **${labels[key]}:**`, ...found.map((s) => `  - ${s}`));
  }
  return out;
}
