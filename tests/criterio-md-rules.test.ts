// The never lists as rules with an id (lib/system/rules.ts), gathered at the top of criterio.md (rejects), and the
// parts of the file a reader may ask for alone (partMd).
import { expect, test } from "vitest";
import { blocksToMd, criterioBlocks, partMd } from "@/lib/criterio-md";
import { ruleLine } from "@/lib/system/rules";
import { pageFailed } from "@/lib/page-failed";
import { emptySystem, type SystemArea } from "@/types/system";
import en from "@/lib/i18n/en";

const input = () => {
  const system = emptySystem("p1");
  const set = (area: SystemArea, decision: string, never: string) => { const a = system.areas.find((x) => x.area === area)!; a.decision = decision; a.never = never; };
  set("color", "Ink on paper, one accent.", "`color-no-gradients` NEVER: Gradients on any surface. Because the brand is flat. Correct: a solid paper surface. Wrong: a blue hero.");
  set("voice", "Plain and short.", "No exclamation marks");
  return { project: "Zernio", system, items: {}, labels: en.system.areas as Record<SystemArea, string>, strings: en.system.md };
};

test("a rule is written as an id, a strength, a reason and a right and a wrong example; ids never repeat", () => {
  const taken = new Set<string>();
  const r = { slug: "No gradients!", strength: "NEVER", rule: "Gradients on any surface.", because: "the brand is flat", correct: "a solid paper surface", wrong: "a blue hero" };
  expect(ruleLine("color", r, "en", taken)).toBe("`color-no-gradients` NEVER: Gradients on any surface. Because the brand is flat. Correct: a solid paper surface. Wrong: a blue hero.");
  expect(ruleLine("color", { ...r, correct: "", wrong: "" }, "es", taken)).toBe("`color-no-gradients-2` NEVER: Gradients on any surface. Porque the brand is flat.");
});

test("every area's never lines come together under 'Never, at a glance', marked required, and nowhere else is it typed over", () => {
  const blocks = criterioBlocks(input());
  const rejects = blocks.find((b) => b.kind === "section" && b.id === "rejects");
  expect(rejects).toBeTruthy();
  const md = blocksToMd(blocks);
  expect(md).toContain("## Never, at a glance (required)");
  expect(md).toContain("- **Color:** `color-no-gradients` NEVER:");
  expect(md).toContain("- **Voice and tone:** No exclamation marks");
  expect(blocks.findIndex((b) => b.kind === "section" && b.id === "rejects")).toBe(blocks.findIndex((b) => b.kind === "section" && b.id === "use") + 1);
});

test("no never lines, no section", () => {
  const i = input();
  for (const a of i.system.areas) a.never = "";
  expect(criterioBlocks(i).some((b) => b.kind === "section" && b.id === "rejects")).toBe(false);
});

test("one part of the file keeps the head and how to use it", () => {
  const blocks = criterioBlocks(input());
  const color = partMd(blocks, "color");
  expect(color).toContain("## How to use this file");
  expect(color).toContain("## Color");
  expect(color).not.toContain("## Voice and tone");
  expect(partMd(blocks, "all")).toBe(blocksToMd(blocks));
});

test("the palette gains a 'Not for' column only when a colour has one, and the CSS variable says it too", async () => {
  const { brandTokenLines } = await import("@/lib/brand-md");
  const { tokensCss } = await import("@/lib/brand-export");
  const { emptyBrand } = await import("@/types/brand");
  const strings = en.system.md.brand;
  const spec = emptyBrand();
  spec.color.items = [{ id: "c1", name: "Signal", hex: "#FF4F00", role: "The one call to action", group: "accent", weight: 2 }, { id: "c2", name: "Ink", hex: "#111111", role: "Text", group: "neutral", weight: 3 }];
  const table = (b: typeof spec) => brandTokenLines("color", b, strings, { href: (k) => k, cite: (i) => i });
  expect(table(spec).join("\n")).not.toContain("Not for");
  spec.color.items[0].notFor = "Body text or borders";
  const lines = table(spec).join("\n");
  expect(lines).toContain("| Not for |");
  expect(lines).toContain("| The one call to action | Body text or borders |");
  expect(lines).toContain("| Text |  |");
  expect(tokensCss(spec, "Zernio")).toContain("/* The one call to action. Not for: Body text or borders */");
});

test("a MUST or SHOULD rule is not written under 'Never (required)': each strength has its own label, and 'at a glance' lists only Nevers", () => {
  const inp = input();
  inp.system.areas.find((x) => x.area === "color")!.never = "`color-no-gradients` NEVER: No gradients.\n`color-paper` MUST: Paper under ink.\n`color-tint` SHOULD: Tint with opacity.";
  const md = blocksToMd(criterioBlocks(inp));
  const color = md.slice(md.indexOf("## Color\n"));
  expect(color).toContain("**Never** (required):\n- `color-no-gradients` NEVER");
  expect(color).toContain("**Must** (required):\n- `color-paper` MUST");
  expect(color).toContain("**Should** (guidance):\n- `color-tint` SHOULD");
  expect(md.slice(md.indexOf("## Never, at a glance"), md.indexOf("## Color\n"))).not.toContain("MUST");
});

test("a link to this machine leaves the file with the public address, whichever place it was built in", () => {
  const md = blocksToMd([{ kind: "head", lines: ["![x](http://localhost:3837/api/files/a.png) and http://127.0.0.1:3000/b and https://example.com/localhost"] }]);
  expect(md).toContain("![x](https://app.criterio.design/api/files/a.png)");
  expect(md).toContain("https://app.criterio.design/b");
  expect(md).toContain("https://example.com/localhost");
  expect(md).not.toContain("localhost:3837");
});

test("a summary written by an error page is no 'what it is'", () => {
  expect(pageFailed("404 Not Found · IBM")).toBe(true);
  expect(pageFailed("Just a moment...")).toBe(true);
  expect(pageFailed("Página no encontrada")).toBe(true);
  expect(pageFailed("Multiverse · Learn on the job, 401(k) plans")).toBe(false);
  expect(pageFailed("Stripe · Payments infrastructure")).toBe(false);
});

test("only a proposal stays in an area's conversation; a loose comment does not", () => {
  const inp = { ...input(), talk: { color: [{ who: "Eric", text: "akskas" }, { who: "Ana", text: "Warmer paper", proposal: { decision: "Warmer paper", state: "open" as const } }] } };
  const md = blocksToMd(criterioBlocks(inp));
  expect(md).toContain("Warmer paper");
  expect(md).not.toContain("akskas");
});

test("with no brand drawn, the sentences of the areas that carry a value are gathered under Tokens, word for word", () => {
  const inp = input();
  const set = (area: SystemArea, decision: string) => { inp.system.areas.find((x) => x.area === area)!.decision = decision; };
  set("typography", "Schibsted Grotesk for everything (400, 500, 600, italic 400). JetBrains Mono for data (400, 500). Nothing is centred.");
  set("color", "Paper #F5F0E8 and ink #111111. Fills use #F01438; text in red uses #FF5C77. Tinted backgrounds use rgba(240,20,56,.14).");
  set("layout", "The gutter is clamp(20px, 4vw, 64px). Two radii: 6px for cards and 2px for small marks. Keep it airy.");
  set("motion", "Falls use power2.in, 0.3 s. It gives way 3.2px and returns.");
  set("logo", "The nav logo at 52px without moving the header height. Keep the mark whole.");
  set("imagery", "Team portraits in a grey ramp at 180px and full opacity.");
  inp.system.areas.find((x) => x.area === "color")!.never = "`color-portrait-ceiling` NEVER: Portraits never go lighter than #A6ADB5. Because they would vanish.\nNo gradients";
  inp.system.areas.find((x) => x.area === "imagery")!.never = "Flat faces in one colour with a 1px black outline";
  const md = blocksToMd(criterioBlocks(inp));
  const tokens = md.slice(md.indexOf("## Tokens"));
  expect(tokens).toContain("The nav logo at 52px without moving the header height.");
  expect(tokens).toContain("Team portraits in a grey ramp at 180px and full opacity.");
  // A rule lifted out of its list would lose its polarity: "flat faces with a 1px outline" reads as an order
  expect(tokens).not.toContain("#A6ADB5");
  expect(tokens).not.toContain("1px outline");
  expect(tokens).not.toContain("No gradients");
  expect(tokens).not.toContain("Keep the mark whole");
  expect(tokens).toContain("Schibsted Grotesk for everything (400, 500, 600, italic 400).");
  expect(tokens).toContain("Fills use #F01438; text in red uses #FF5C77.");
  expect(tokens).toContain("rgba(240,20,56,.14)");
  expect(tokens).toContain("The gutter is clamp(20px, 4vw, 64px).");
  expect(tokens).toContain("Two radii: 6px for cards and 2px for small marks.");
  expect(tokens).toContain("It gives way 3.2px and returns.");
  expect(tokens).not.toContain("Nothing is centred");
  expect(tokens).not.toContain("Keep it airy");
  expect(tokens).toContain("look for it in its area before asking");
});
