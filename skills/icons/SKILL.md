---
name: icons
description: Iconography: one library, one stroke, and how to draw the missing ones. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.
metadata:
  source: criterio.design
  area: iconography
---

# Icon set

How to bring the Iconography area into the site as one consistent set.

## Read the project first

`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.
2. Read its **Iconography** area: the decision, the references it kept and its **Never** list. The area rules: where it and this skill disagree, the area wins.
3. If the file has a section titled **Build it: one set of icons**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.
4. If the Iconography area is still open, or there is no file, use the defaults below and say so in what you deliver.

## Defaults, while the area names no numbers

- Outline, 1.5px stroke, round caps and joins.
- 16px beside text, 20px in buttons, 24px on their own.
- The icon takes the colour of its text: `currentColor`.

## The craft

Pick one library that matches the area and install it as components: Lucide (`lucide-react`) for a fine, round outline; Phosphor (`@phosphor-icons/react`) when the area wants several weights of the same drawing. Import icon by icon, so only the ones used are shipped.

- One set and one weight in the whole site. A filled icon never sits beside an outlined one, and an emoji is not an icon.
- The stroke stays the same at every size (Lucide: `absoluteStrokeWidth`), so a 16px icon is not thinner than a 24px one.
- Sizes from the scale, in `em` when the icon sits in text (`1em`, `vertical-align: -0.125em`) so it follows the type.
- The pressable area is 44px or more even when the icon is 20: the padding belongs to the button.
- An icon that only decorates is `aria-hidden="true"`. A button with nothing but an icon has an `aria-label` that says what it does.
- An icon the set lacks is drawn on its grid (24 by 24, 2px of margin, the same stroke, caps and joins) and exported as SVG with `stroke="currentColor"`.
- Never an icon font. SVG inline or as components, optimised with SVGO keeping the `viewBox`.
- An icon goes with a word wherever its meaning is not universal; alone, only the ones everyone knows (close, search, menu).
