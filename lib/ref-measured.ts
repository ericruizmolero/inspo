// What a reference measured, in values: its DESIGN.md's colours, typefaces, radii, density and theme, and the share
// of each colour in its saved palette. The system pass reads it (lib/system.ts measuredSummary) and criterio.md writes it
// under the reference. Pure, so the app and the server build the same lines.
import type { DesignSpec } from "@/types/design";
import type { InspoColor } from "@/types/inspo";

export interface RefMeasured {
  theme?: "light" | "dark";
  colors?: { name: string; hex: string; group: string }[];
  families?: { family: string; role: string; weights: number[] }[];
  radius?: { element: string; value: string }[];
  density?: string;
  pixels?: { hex: string; share: number }[];
}

/** A project's measures, as the server reads them for the file (lib/share-view.ts) */
export interface ProjectMeasures {
  /** By item id: only the references that measured something */
  measured: Record<string, RefMeasured>;
  /** The client's site's own words, for the voice samples */
  clientCopy: string[];
}

const GROUP_ORDER = ["brand", "accent", "neutral", "semantic"];

/** Undefined when nothing was measured */
export function refMeasuredOf(spec: DesignSpec | null, pixels: InspoColor[] | undefined): RefMeasured | undefined {
  const out: RefMeasured = {
    theme: spec?.theme,
    colors: spec?.colors.length ? [...spec.colors].sort((x, y) => GROUP_ORDER.indexOf(x.group) - GROUP_ORDER.indexOf(y.group)).slice(0, 5).map(({ name, hex, group }) => ({ name, hex, group })) : undefined,
    families: spec?.fonts.length ? spec.fonts.map(({ family, role, weights }) => ({ family, role, weights })) : undefined,
    radius: spec?.radii.length ? spec.radii.slice(0, 3) : undefined,
    density: spec?.spacing?.density,
    pixels: pixels?.length ? [...pixels].sort((x, y) => y.share - x.share).slice(0, 5).map(({ hex, share }) => ({ hex, share: Math.round(share * 100) / 100 })) : undefined,
  };
  const kept = Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as RefMeasured;
  return Object.keys(kept).length ? kept : undefined;
}

/** The words a site says out loud, as its DESIGN.md keeps them (lib/design-store.ts DesignMdEntry.copy) */
export interface SiteCopy { h1: string; headings: string[]; ctas: string[] }

const line = (s: string) => s.replace(/\s+/g, " ").trim();
const distinct = (xs: string[]) => [...new Set(xs.map(line).filter(Boolean))];

/** What is kept of the copy the extraction read: the headline, 6 headings and 4 buttons */
export const keptCopy = (c: SiteCopy): SiteCopy => ({ h1: line(c.h1), headings: distinct(c.headings).slice(0, 6), ctas: distinct(c.ctas).slice(0, 4) });

/** The client's own words for criterio.md's voice samples: the copy its DESIGN.md kept, or, for an entry saved before
 *  that, the verbatim quote its voice line ends with */
export function clientCopyOf(entry: { copy?: SiteCopy; spec?: DesignSpec } | null): string[] {
  if (entry?.copy) return distinct([entry.copy.h1, ...entry.copy.headings, ...entry.copy.ctas]);
  const voice = entry?.spec?.brief?.voice ?? "";
  return distinct([...voice.matchAll(/“([^”]+)”|"([^"]+)"|«([^»]+)»/g)].map((m) => m[1] ?? m[2] ?? m[3]));
}
