---
name: logo-svg
description: Logo: versions, clear space, favicon and share image. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.
metadata:
  source: criterio.design
  area: logo
---

# Logo as SVG

How to turn the Logo area into the files a site needs: the mark, its versions, the favicon and the share image.

## Read the project first

`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.
2. Read its **Logo** area: the decision, the references it kept and its **Never** list. The area rules: where it and this skill disagree, the area wins.
3. If the file has a section titled **Build it: the logo as files**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.
4. If the Logo area is still open, or there is no file, use the defaults below and say so in what you deliver.

## Defaults, while the area names no numbers

- Clear space on every side equal to the height of one of its letters.
- Smallest size on screen: 80px wide for the wordmark, 16px for the symbol.
- Versions: whole, symbol alone, one colour, and on a dark ground.

## The craft

The master is one SVG: text converted to outlines, a tight `viewBox`, no fixed width or height, and `fill="currentColor"` in the one-colour version so it takes the colour of where it sits.

- The logo is never recoloured, stretched, outlined, tilted or given a shadow. If it does not read on a ground, use its other version, do not alter it.
- In the header it is inline SVG or an `<img>` whose `alt` is the name of the brand, it links home and its height comes from a token.
- Favicons: `icon.svg` (it can change with `prefers-color-scheme` inside the file), `favicon.ico` at 32px for old browsers, `apple-touch-icon.png` at 180px, and 192 and 512px in the web manifest, with the symbol inside the maskable safe zone.
- The symbol alone below 32px: a wordmark is not legible in a tab.
- Share image (Open Graph) at 1200 by 630: the page's own headline in the project's type, the logo small in a corner. Never the logo huge and centred.
- Optimise with SVGO, keep the `viewBox`, give it a `<title>` when it stands alone.
- It moves only if the Motion area says so, once, on arrival (for a line drawing, `stroke-dasharray`), and it stands still with reduced motion.
- Keep the versions together in one folder with what each is for. Nobody should have to redraw it from a screenshot.
