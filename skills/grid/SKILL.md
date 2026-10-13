---
name: grid
description: Layout: grid, container queries, and spacing and radii as tokens. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.
metadata:
  source: criterio.design
  area: layout
---

# CSS grid

How to build the Layout area with CSS, from the page down to a card.

## Read the project first

`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.
2. Read its **Layout** area: the decision, the references it kept and its **Never** list. The area rules: where it and this skill disagree, the area wins.
3. If the file has a section titled **Build it: layout with CSS grid**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.
4. If the Layout area is still open, or there is no file, use the defaults below and say so in what you deliver.

## Defaults, while the area names no numbers

- Spacing on a base of 8px: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- A container of `min(100% - 2 * var(--gutter), 72rem)` with a gutter of `clamp(1rem, 4vw, 3rem)`.
- Sections apart by `clamp(4rem, 10vw, 8rem)`.

## The craft

Start from tokens: a spacing scale (`--space-1` to `--space-10`, on a base of 4 or 8px), the radii the area names and one container width. Everything else is made of them.

- Grid for two dimensions, flex for one. Space between things with `gap`, not with margins on the children.
- Lists of cards without breakpoints: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr))`.
- A component adapts to its own room, not the window's: `container-type: inline-size` on its wrapper and `@container (min-width: 40rem)` inside. Media queries are for the page.
- Mobile first. Breakpoints where the content breaks, not at device names. Check 360, 768, 1280 and 1920.
- No fixed heights. Media holds its place with `aspect-ratio`; a full screen is `min-height: 100dvh`.
- `subgrid` when the inner rows of cards in a row must line up (title, text, button).
- Logical properties (`margin-inline`, `padding-block`) and `gap` in tokens, so one change moves the whole rhythm.
- Nothing scrolls sideways at 320px wide, and text is never clipped to fit a box.
