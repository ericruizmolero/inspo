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
