---
name: fonts
description: Typography: loading the families decided, and a fluid scale. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.
metadata:
  source: criterio.design
  area: typography
---

# Web fonts

How to load and set the Typography area on a website.

## Read the project first

`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.
2. Read its **Typography** area: the decision, the references it kept and its **Never** list. The area rules: where it and this skill disagree, the area wins.
3. If the file has a section titled **Build it: type on the web**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.
4. If the Typography area is still open, or there is no file, use the defaults below and say so in what you deliver.

## Defaults, while the area names no numbers

- One family for text and at most one more for display.
- Body at 1 to 1.125rem with line-height 1.6; each step of the scale 1.2 to 1.25 times the one before.
- Two weights of the text family (regular and one for emphasis) until the area asks for more.

## The craft

Serve the families from your own domain as WOFF2, the variable file when the family has one. In Next.js use `next/font` (local or Google): it self-hosts the files and adjusts the fallback so the text does not jump when the font arrives.

- Ship only the weights and styles the area names. `font-synthesis: none`, so the browser never fakes a bold or an italic the family does not have.
- `font-display: swap` for text. Preload the one face used above the fold and no other.
- Subset to the languages the site speaks (`unicode-range`): a Latin subset is a third of the file.
- A fallback that matches the font's measures (`size-adjust`, `ascent-override`) so nothing moves on load.
- Sizes in `rem`, the scale fluid with `clamp()`: `font-size: clamp(2.5rem, 1.6rem + 3.6vw, 4rem)`. Body text never below 1rem.
- Headlines: `text-wrap: balance`, line-height 1.05 to 1.2, tracking tighter as the size grows. Body: `text-wrap: pretty`, line-height 1.5 to 1.65, 60 to 75 characters a line.
- Figures that line up (prices, tables, counters): `font-variant-numeric: tabular-nums`.
- Emphasis by weight or italic of the same family, never by a third family.
