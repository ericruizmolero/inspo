// The brand's values as files a developer drops into a project: CSS variables, design tokens in the W3C format
// (DTCG), and a Tailwind v4 theme. Pure: the presentation makes them in the browser, the share and the zip on the
// server, from the same spec.
import { bezierCss, tokenName } from "./brand-values";
import { accentOf, type BrandSpec } from "@/types/brand";
import { genericOf } from "./font-names";

const uniq = (names: string[]) => { const seen = new Map<string, number>(); return names.map((n) => { const k = tokenName(n); const c = seen.get(k) ?? 0; seen.set(k, c + 1); return c ? `${k}-${c + 1}` : k; }); };

function parts(spec: BrandSpec) {
  const colors = spec.color.items;
  const colorNames = uniq(colors.map((c) => c.name));
  const faces = spec.typography.faces;
  const faceVar = (id: string) => { const f = faces.find((x) => x.id === id); return f ? `--font-${f.role === "display" ? "display" : f.role === "mono" ? "mono" : "text"}` : "--font-text"; };
  const steps = spec.typography.scale;
  const stepNames = uniq(steps.map((s) => s.label));
  const curves = spec.motion.curves;
  const curveNames = uniq(curves.map((c) => c.name));
  const durations = spec.motion.durations;
  const durationNames = uniq(durations.map((d) => d.name));
  return { colors, colorNames, faces, faceVar, steps, stepNames, curves, curveNames, durations, durationNames };
}

const stackOf = (family: string) => `"${family}", ${genericOf(family)}`;

/** :root { --color-…, --font-…, --text-…, --ease-…, --duration-… } */
export function tokensCss(spec: BrandSpec, name: string): string {
  const p = parts(spec);
  const L = [`/* ${name}: brand tokens, from criterio.design */`, ":root {"];
  p.colors.forEach((c, i) => L.push(`  --color-${p.colorNames[i]}: ${c.hex};${c.role ? ` /* ${c.role.replace(/\*\//g, "")} */` : ""}`));
  const accent = accentOf(spec);
  if (accent) L.push(`  --color-accent: var(--color-${p.colorNames[p.colors.indexOf(accent)]});`);
  const roles = new Set<string>();
  for (const f of p.faces) { const v = p.faceVar(f.id); if (roles.has(v)) continue; roles.add(v); L.push(`  ${v}: ${stackOf(f.family)};`); }
  p.steps.forEach((s, i) => {
    const n = p.stepNames[i];
    L.push(`  --text-${n}: ${s.px}px;`, `  --text-${n}--line-height: ${s.lineHeight};`, `  --text-${n}--letter-spacing: ${s.tracking}em;`, `  --text-${n}--font-weight: ${s.weight};`);
  });
  p.curves.forEach((c, i) => L.push(`  --ease-${p.curveNames[i]}: ${bezierCss(c.bezier)};`));
  p.durations.forEach((d, i) => L.push(`  --duration-${p.durationNames[i]}: ${d.ms}ms;`));
  if (p.curves.length || p.durations.length) L.push(`  --stagger: ${spec.motion.staggerMs}ms;`);
  L.push("}");
  return L.join("\n") + "\n";
}

/** Design tokens, W3C Design Tokens Community Group format */
export function tokensJson(spec: BrandSpec): string {
  const p = parts(spec);
  const out: Record<string, unknown> = {};
  if (p.colors.length) out.color = Object.fromEntries(p.colors.map((c, i) => [p.colorNames[i], { $type: "color", $value: c.hex, ...(c.role ? { $description: c.role } : {}) }]));
  if (p.faces.length) out.font = Object.fromEntries(p.faces.map((f) => [p.faceVar(f.id).replace("--font-", ""), { $type: "fontFamily", $value: [f.family, ...genericOf(f.family).split(",").map((x) => x.trim().replace(/^'|'$/g, ""))], $description: f.note || undefined }]));
  if (p.steps.length) out.typography = Object.fromEntries(p.steps.map((s, i) => [p.stepNames[i], {
    $type: "typography",
    $value: { fontFamily: `{font.${p.faceVar(s.faceId).replace("--font-", "")}}`, fontSize: { value: s.px, unit: "px" }, fontWeight: s.weight, lineHeight: s.lineHeight, letterSpacing: { value: s.tracking, unit: "em" } },
  }]));
  if (p.curves.length) out.easing = Object.fromEntries(p.curves.map((c, i) => [p.curveNames[i], { $type: "cubicBezier", $value: c.bezier, ...(c.use ? { $description: c.use } : {}) }]));
  if (p.durations.length) out.duration = Object.fromEntries(p.durations.map((d, i) => [p.durationNames[i], { $type: "duration", $value: { value: d.ms, unit: "ms" }, ...(d.use ? { $description: d.use } : {}) }]));
  return JSON.stringify(out, null, 2) + "\n";
}

/** A Tailwind v4 theme: paste it in the main CSS file, after @import "tailwindcss" */
export function tailwindTheme(spec: BrandSpec, name: string): string {
  const p = parts(spec);
  const L = [`/* ${name}: brand theme for Tailwind CSS v4, from criterio.design */`, "@theme {"];
  p.colors.forEach((c, i) => L.push(`  --color-${p.colorNames[i]}: ${c.hex};`));
  const roles = new Set<string>();
  for (const f of p.faces) { const v = p.faceVar(f.id); if (roles.has(v)) continue; roles.add(v); L.push(`  ${v}: ${stackOf(f.family)};`); }
  p.steps.forEach((s, i) => {
    const n = p.stepNames[i];
    L.push(`  --text-${n}: ${s.px / 16}rem;`, `  --text-${n}--line-height: ${s.lineHeight};`, `  --text-${n}--letter-spacing: ${s.tracking}em;`, `  --text-${n}--font-weight: ${s.weight};`);
  });
  p.curves.forEach((c, i) => L.push(`  --ease-${p.curveNames[i]}: ${bezierCss(c.bezier)};`));
  L.push("}");
  return L.join("\n") + "\n";
}

/** Where the brand's faces are loaded from, as links: they are not ours to hand out */
export function fontLinks(spec: BrandSpec): { family: string; href: string | null; note: string }[] {
  return spec.typography.faces.map((f) => ({
    family: f.family,
    href: f.source === "google" ? `https://fonts.google.com/specimen/${encodeURIComponent(f.family).replace(/%20/g, "+")}` : f.source === "fontshare" && f.slug ? `https://www.fontshare.com/fonts/${f.slug}` : null,
    note: f.source,
  }));
}

/** A file name from the brand's name */
export const fileStem = (name: string) => tokenName(name) || "brand";
