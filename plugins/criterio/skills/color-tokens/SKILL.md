---
name: color-tokens
description: Colour: the palette as variables, light and dark, and contrast. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.
metadata:
  source: criterio.design
  area: color
---

# Colour tokens

How to turn the Colour area into tokens a whole site is painted from.

## Read the project first

`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.
2. Read its **Colour** area: the decision, the references it kept and its **Never** list. The area rules: where it and this skill disagree, the area wins.
3. If the file has a section titled **Build it: colour as tokens**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.
4. If the Colour area is still open, or there is no file, use the defaults below and say so in what you deliver.

## Defaults, while the area names no numbers

- A neutral scale of 9 to 11 steps and one accent.
- Roles: `--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`, `--accent-text`.
- One accent does the acting: links, the primary button, the focus ring.

## The craft

Two layers of CSS custom properties. The palette holds the colours (`--gray-900`); the roles say what each is for (`--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`). Components only ever use roles.

- Write the palette in OKLCH (`oklch(0.21 0.01 95)`): lightness steps are even and a hue holds across them. Keep the hex the team chose in a comment.
- No colour outside the tokens: a raw hex in a component is a missing token.
- Light and dark by redefining the roles (under `[data-theme="dark"]` and `prefers-color-scheme`), never component by component. Set `color-scheme` so form controls and scrollbars follow.
- Contrast: text at 4.5:1 or more on its background; large text and the edges of controls at 3:1. Check every pair of text and background the site actually ships.
- States come from the token, not from new colours: `color-mix(in oklch, var(--accent), black 8%)` for hover, a little more for pressed.
- Lines and soft surfaces from the text colour with transparency (`color-mix(in oklch, var(--text) 12%, transparent)`), so they follow both themes.
- Colour never carries meaning alone: an error also has an icon or words.
- Images and illustrations sit inside the palette's contrast: a photo never becomes the only background of text without a wash over it.
