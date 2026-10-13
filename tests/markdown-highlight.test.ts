import { describe, expect, it } from "vitest";
import { continueList, highlightMarkdown } from "@/lib/markdown-highlight";
import { excerptOf } from "@/lib/text-refs";

const textOf = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

const SAMPLES = [
  "# Services\n\nWe do **brand**, _naming_ and `code`.",
  "## A list\n- one\n- two with [a link](https://example.com/a_b?x=1&y=2)\n  - nested *em*\n1. first\n2) second",
  "- [ ] open task\n- [x] done task\n> a quote with **bold _inside_**\n---\n***",
  "```js\nconst a = \"<b>\" && x;\n```\nafter ~~strike~~ snake_case_word and 2*3*4",
  "unclosed **bold and `tick and [label](no close",
  "<script>alert(1)</script> & \"quotes\"\n\n\n",
  "",
];

describe("highlightMarkdown", () => {
  it("keeps every character of the source, in order, so the caret can be put back", () => {
    for (const src of SAMPLES) {
      expect(textOf(highlightMarkdown(src))).toBe(src);
      expect(textOf(highlightMarkdown(src, { links: true }))).toBe(src);
    }
  });

  it("never lets the text become markup", () => {
    const html = highlightMarkdown("<script>alert(1)</script> [x](javascript:alert(1))", { links: true });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("href=\"javascript");
  });

  it("sets what the marks mean", () => {
    expect(highlightMarkdown("## Title")).toContain("mde-h2");
    expect(highlightMarkdown("**b**")).toContain("<b class=\"mde-b\">");
    expect(highlightMarkdown("snake_case_word")).not.toContain("mde-i");
    expect(highlightMarkdown("```\n# not a heading\n```")).not.toContain("mde-h1");
    expect(highlightMarkdown("[a](https://x.y)", { links: true })).toContain("href=\"https://x.y\"");
    expect(highlightMarkdown("[a](https://x.y)")).not.toContain("href");
  });
});

describe("continueList", () => {
  it("carries the marker to the next line", () => {
    expect(continueList("- one")).toEqual({ next: "- " });
    expect(continueList("  * nested")).toEqual({ next: "  * " });
    expect(continueList("9. ninth")).toEqual({ next: "10. " });
    expect(continueList("- [x] done")).toEqual({ next: "- [ ] " });
  });
  it("ends the list on an empty item, and ignores other lines", () => {
    expect(continueList("- ")).toEqual({ end: true });
    expect(continueList("- [ ] ")).toEqual({ end: true });
    expect(continueList("plain words")).toBeNull();
  });
});

describe("excerptOf", () => {
  it("gives the card the words without their marks", () => {
    const md = "# Services\n\nWe do **brand**, _naming_ and `code`. See [the site](https://x.y).\n- [ ] open task\n> a quote\n---\n```\nconst a = 1;\n```\nsnake_case_word and 2*3*4";
    expect(excerptOf(md)).toBe("Services, We do brand, naming and code. See the site. open task, a quote, const a = 1; snake_case_word and 2*3*4");
  });
});
