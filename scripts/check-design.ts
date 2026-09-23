// Check of what cleans the DESIGN.md data before and after the model.
// Not a test framework: assert.
//   npm run check:design
import assert from "node:assert/strict";
import { oklchToHex } from "../lib/design-extract";
import { normalizeSpec } from "../lib/design-md";
import type { DesignSpec } from "../types/design";

// oklch → hex: the 21st.dev border measured by Opus is #27272a99
const c = oklchToHex({ border: "oklch(0.274 0.005 286.033 / 0.6)", white: "oklch(1 0 0)", black: "oklch(0% 0 0)", keep: "rgb(1, 2, 3)" });
assert.deepEqual(c, { border: "#27272a99", white: "#ffffff", black: "#000000", keep: "rgb(1, 2, 3)" });

// Mechanical model errors: line height in px, family with a description, fake mono
const spec = normalizeSpec({
  fonts: [{ family: "Founders Grotesk", role: "mono" }, { family: "Jet Brains", role: "mono" }],
  typeScale: [{ family: "Jet Brains, uppercase — nav", size: 12, lineHeight: 18 }, { family: "founders grotesk", size: 44, lineHeight: 1.2 }],
} as unknown as DesignSpec);
assert.deepEqual(spec.fonts.map((f) => f.role), ["body", "mono"]);
assert.deepEqual(spec.typeScale.map((t) => [t.family, t.lineHeight]), [["Jet Brains", 1.5], ["Founders Grotesk", 1.2]]);

console.log("check:design ok");
