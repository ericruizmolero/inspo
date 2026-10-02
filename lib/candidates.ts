// What the board offers for one area, read from the material of its references: the families found,
// the palettes, the easings, the captures, the lines of copy. Pure: the same code renders the table.
import type { RefVisual } from "./system";
import type { AreaCandidate, SystemArea } from "@/types/system";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "x";

export function areaCandidates(area: SystemArea, vs: RefVisual[]): AreaCandidate[] {
  switch (area) {
    case "typography": {
      const map = new Map<string, AreaCandidate>();
      for (const v of vs) for (const f of v.fonts) {
        const k = f.family.toLowerCase();
        const c = map.get(k) ?? { id: `font-${slug(f.family)}`, label: f.family, detail: f.role, refs: [], visual: { families: [{ family: f.family, weights: f.weights, role: f.role }] } };
        if (!c.refs.includes(v.itemId)) c.refs.push(v.itemId);
        map.set(k, c);
      }
      const rank: Record<string, number> = { display: 0, body: 1, ui: 2, mono: 3 };
      return [...map.values()].sort((a, b) => (rank[a.detail ?? ""] ?? 9) - (rank[b.detail ?? ""] ?? 9) || b.refs.length - a.refs.length);
    }
    case "color":
      return vs.filter((v) => v.colors.length).map((v) => ({ id: `palette-${v.itemId}`, label: v.name, detail: `${v.colors.length}`, refs: [v.itemId], visual: { colors: v.colors.filter((c) => c.group !== "semantic").slice(0, 10).map((c) => ({ hex: c.hex, name: c.name })) } }));
    case "motion": {
      const map = new Map<string, AreaCandidate>();
      for (const v of vs) if (v.easing) {
        const k = `${v.easing}|${v.durationMs ?? ""}`;
        const c = map.get(k) ?? { id: `ease-${slug(v.easing)}-${v.durationMs ?? 0}`, label: v.easing, detail: v.durationMs ? `${v.durationMs} ms` : undefined, refs: [], visual: { easing: v.easing, durationMs: v.durationMs ?? undefined } };
        if (!c.refs.includes(v.itemId)) c.refs.push(v.itemId);
        map.set(k, c);
      }
      return [...map.values()];
    }
    case "layout":
      return vs.filter((v) => v.radii.length || v.cover).map((v) => ({ id: `layout-${v.itemId}`, label: v.name, detail: v.radii[0]?.value, refs: [v.itemId], visual: { image: v.cover, radii: v.radii.map((r) => r.value).slice(0, 4) } }));
    case "imagery":
      return vs.filter((v) => v.cover || v.scroll).map((v) => ({ id: `img-${v.itemId}`, label: v.name, refs: [v.itemId], visual: { image: v.scroll ?? v.cover } }));
    case "logo":
      return vs.filter((v) => v.logo).map((v) => ({ id: `logo-${v.itemId}`, label: v.name, refs: [v.itemId], visual: { image: v.logo } }));
    case "iconography":
      return vs.filter((v) => v.icons.length).map((v) => ({ id: `icons-${v.itemId}`, label: v.name, detail: `${v.icons.length}`, refs: [v.itemId], visual: { icons: v.icons.slice(0, 8) } }));
    case "voice":
      return vs.filter((v) => v.voice || v.tagline).map((v) => ({ id: `voice-${v.itemId}`, label: v.name, detail: v.tagline ?? undefined, refs: [v.itemId], visual: { text: v.voice ?? v.tagline ?? "" } }));
  }
}
