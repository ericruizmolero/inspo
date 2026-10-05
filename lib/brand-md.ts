// The brand's values as lines of criterio.md: under each area, the values that implement its decision (a palette
// table, the faces and their scale, the curves, the logo files, the voice's principles and pairs, the imagery's traits), and
// at the end the CSS variables. Pure, so the file reads the same in the app, on a share and in an agent's hands.
import { colorCodes, bezierCss } from "./brand-values";
import { tokensCss } from "./brand-export";
import { accentOf, type BrandSpec } from "@/types/brand";
import type { SystemArea } from "@/types/system";

export interface BrandMdStrings {
  values: string; intro: string; tokens: string; tokensIntro: string;
  name: string; role: string; accent: string;
  faces: string; scale: string; step: string; size: string; face: string; weight: string; lineHeight: string; tracking: string; sample: string;
  curves: string; durations: string; stagger: string; use: string;
  files: string; primary: string; mark: string; light: string; dark: string; clearSpace: (x: number) => string; minSize: string;
  principles: string; pairs: string; context: string; do: string; dont: string;
  imagery: string; traits: string; examples: string; avoid: string; sources: Record<"google" | "fontshare" | "site" | "upload" | "system", string>;
}

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

/** The statement and what the brand is, as the presentation opens */
export function brandIntroLines(b: BrandSpec): string[] {
  const L: string[] = [];
  if (b.intro.headline) L.push(`> ${b.intro.headline}`, "");
  for (const p of b.intro.paragraphs.filter(Boolean)) L.push(p, "");
  while (L[L.length - 1] === "") L.pop();
  return L;
}

/** The values under one area; nothing when the brand has none for it */
export function brandTokenLines(area: SystemArea, b: BrandSpec, s: BrandMdStrings, opts: { href: (key: string) => string; cite: (itemId: string) => string }): string[] {
  const L: string[] = [];
  const head = (title: string) => { L.push(`**${title}**`, ""); };
  switch (area) {
    case "color": {
      if (!b.color.items.length) break;
      const accent = accentOf(b);
      head(s.values);
      L.push(`| ${s.name} | HEX | RGB | HSL | ${s.role} |`, "|---|---|---|---|---|");
      for (const c of b.color.items) { const k = colorCodes(c.hex); L.push(`| ${cell(c.name)}${c.id === accent?.id ? ` (${s.accent})` : ""} | \`${k.hex}\` | ${k.rgb} | ${k.hsl} | ${cell(c.role)} |`); }
      break;
    }
    case "typography": {
      const t = b.typography;
      if (!t.faces.length) break;
      head(s.faces);
      for (const f of t.faces) L.push(`- **${f.family}** (${f.role}, ${s.sources[f.source]}, ${f.weights.join(" ")})${f.note ? `: ${f.note}` : ""}`);
      if (t.scale.length) {
        L.push("", `**${s.scale}**`, "", `| ${s.step} | ${s.size} | ${s.face} | ${s.weight} | ${s.lineHeight} | ${s.tracking} |`, "|---|---|---|---|---|---|");
        for (const x of t.scale) L.push(`| ${cell(x.label)} | ${x.px}px | ${t.faces.find((f) => f.id === x.faceId)?.family ?? ""} | ${x.weight} | ${x.lineHeight} | ${x.tracking}em |`);
      }
      if (t.trackingRule) L.push("", t.trackingRule);
      break;
    }
    case "motion": {
      const m = b.motion;
      if (!m.curves.length && !m.durations.length) break;
      if (m.curves.length) { head(s.curves); for (const c of m.curves) L.push(`- **${c.name}:** \`${bezierCss(c.bezier)}\`${c.use ? `. ${c.use}` : ""}`); }
      if (m.durations.length) { L.push("", `**${s.durations}**`, ""); for (const d of m.durations) L.push(`- **${d.name}:** ${d.ms}ms${d.use ? `. ${d.use}` : ""}`); L.push(`- **${s.stagger}:** ${m.staggerMs}ms`); }
      if (m.rule) L.push("", m.rule);
      break;
    }
    case "logo": {
      const files: [string, { key: string } | null][] = [[`${s.primary}, ${s.light}`, b.logo.primary.light], [`${s.primary}, ${s.dark}`, b.logo.primary.dark], [`${s.mark}, ${s.light}`, b.logo.mark.light], [`${s.mark}, ${s.dark}`, b.logo.mark.dark]];
      const have = files.filter(([, f]) => f);
      if (!have.length) break;
      head(s.files);
      for (const [label, f] of have) L.push(`- [${label}](${opts.href(f!.key)})`);
      L.push(`- ${s.clearSpace(b.logo.clearSpace)}`);
      if (b.logo.minPx) L.push(`- **${s.minSize}:** ${b.logo.minPx}px`);
      break;
    }
    case "voice": {
      const v = b.voice;
      if (!v.principles.length && !v.pairs.length) break;
      if (v.principles.length) { head(s.principles); for (const p of v.principles) L.push(`- **${p.title}.** ${p.body}${p.sample ? ` «${p.sample}»` : ""}`); }
      if (v.pairs.length) {
        L.push("", `**${s.pairs}**`, "", `| ${s.context} | ${s.do} | ${s.dont} |`, "|---|---|---|");
        for (const p of v.pairs) L.push(`| ${cell(p.context)} | ${cell(p.do)} | ~~${cell(p.dont)}~~ |`);
      }
      break;
    }
    case "imagery": {
      const m = b.imagery;
      if (!m.traits.length && !m.avoid.length && !m.itemIds.length && !m.files.length) break;
      if (m.traits.length) { head(s.traits); for (const x of m.traits) L.push(`- **${x.label}:** ${x.value}`); }
      if (m.avoid.length) { L.push("", `**${s.avoid}**`, ""); for (const x of m.avoid) L.push(`- ${x}`); }
      if (m.itemIds.length || m.files.length) {
        L.push("", `**${s.examples}**`, "");
        for (const id of m.itemIds) L.push(`- ${opts.cite(id)}`);
        for (const f of m.files) L.push(`- [${f.name ?? f.key.split("/").pop()}](${opts.href(f.key)})`);
      }
      break;
    }
  }
  return L;
}

/** The tokens as CSS, fenced, for the end of the file */
export function brandCssLines(b: BrandSpec, name: string): string[] {
  if (!b.color.items.length && !b.typography.faces.length && !b.motion.curves.length) return [];
  return ["```css", ...tokensCss(b, name).trimEnd().split("\n"), "```"];
}
