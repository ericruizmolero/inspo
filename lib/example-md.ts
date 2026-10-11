// The criterio.md a signed-out visitor reads on the home page: a built-in template's file, written by the same
// generator a project's export uses, from the template's folder and not from the database. Only its links are
// references here: the board's pictures live in a workspace's storage, which a visitor has none of.
import "server-only";
import { join } from "path";
import { renderCriterioMd, type RefInfo } from "./criterio-md";
import { readTemplateSpec } from "./template-seed";
import { dictOf, type Locale } from "./i18n";
import { emptySystem, type SystemArea, type SystemEvidence } from "@/types/system";

const EXAMPLE = join(process.cwd(), "docs", "templates", "multiverse");

export interface ExampleMd { name: string; md: string }

export function exampleCriterioMd(locale: Locale): ExampleMd {
  const spec = readTemplateSpec(EXAMPLE);
  const t = dictOf(locale);
  const items: Record<string, RefInfo> = {};
  const evidence: Partial<Record<SystemArea, SystemEvidence[]>> = {};
  for (const ref of spec.board ?? []) {
    if (!ref.web) continue;
    items[ref.web] = { name: ref.name, web: ref.web, kind: "web" };
    for (const area of ref.areas as SystemArea[]) (evidence[area] ??= []).push({ itemId: ref.web, take: ref.takes?.[area] ?? ref.note });
  }
  const base = emptySystem("example");
  const system = {
    ...base,
    summary: spec.summary,
    areas: base.areas.map((a) => {
      const s = spec.areas[a.area];
      return s ? { ...a, decision: s.decision, why: s.why, never: s.never.join("\n"), confidence: 100, source: "team" as const, evidence: evidence[a.area] ?? [] } : a;
    }),
  };
  const md = renderCriterioMd({
    project: spec.name, system, items, labels: t.system.areas as Record<SystemArea, string>, strings: t.system.md,
    about: spec.template.about, mode: "clean", locale,
  });
  return { name: spec.name, md };
}
