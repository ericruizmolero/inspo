# Reading raw values into tokens

`extract-url.mjs` ranks what the page renders; `scan-codebase.sh` finds what the code declares. Neither names the roles. These heuristics do.

## Logo and images

- `logo` in `tokens.json` points at `logo-light.png` (and `logo-dark.png` when the site has a dark theme) and gives the lockup's box in CSS px; the files are 2x. The capture is the header's home link, so it is the lockup the site actually shows, not the file the repo keeps. Use it for `primary` only when no file exists; a repo's own SVG beats a capture.
- `images` lists the page's pictures at 320px wide or more, largest first, with `area` saying whether each sits in the hero, a section or the footer. A hero capture or a product shot is imagery; a background texture, a decorative SVG or a partner logo is not. Open the top five before choosing.

## Color

- **Page background:** the background with the most area that sits on `body`, `main` or full-width sections (`bodyBackground` in `tokens.json`). If two light colors are close in area (e.g. `#ffffff` and `#f5f5f4`), the one behind most sections is `background` and the other is `surface` (cards, inputs, alternating bands). Confirm on `desktop-full.png`.
- **Ink:** the darkest text color with a high count, usually on headings (check `typeRoles.h1.color`).
- **Muted / subtle ink:** the next greys down by count. Body paragraphs (`typeRoles.body.color`) are `ink-muted`; small/caption text is `ink-subtle`.
- **Primary:** the background of the most prominent button (largest, solid, in the hero), even if it's rare by count. Check `buttons` and the screenshot. If the main CTA is near-black, primary is the ink color and the brand hue becomes `accent`.
- **Accent:** a saturated hue used on badges, links, highlights, icons or a selected state. Often appears as a tint pair (a light background + a darker text of the same hue, e.g. `#faf5ff` / `#7e22ce`): record both.
- **Border:** the top border color; a second, darker one is usually for inputs or hover.
- **Ignore:** colors that only appear inside screenshots/embeds, third-party widgets, search-result previews and logos. Their samples (`samples` in `tokens.json`) usually give them away.
- **Near-duplicates:** `#78716c` and `#79716b` are one token. Collapse values within a few RGB points, and greys into a 3–5 step scale.
- **Alpha values** (`#000000 @10%`): keep them as `rgb(0 0 0 / 0.1)` when they're overlays or shadows; if text uses an alpha grey, record the solid color it renders on the background and note it.
- If the code defines a shade scale (`brand-50 … brand-900`), list it; otherwise don't invent one.

## Typography

- The first family in `fontFamilies` is usually the body font; check H1's `fontFamily` for a separate display font. A mono family on labels or code is a third role.
- `loadedFonts` lists the weights that actually load: the doc's weights should be a subset.
- Sizes: H1 → H2 → H3 → body → small from `typeRoles`. If a role is missing (no `h2` on the homepage), read it from a second page or the code, or mark it *(inferred)*.
- Line-height: write it as a ratio too (`24px / 15px = 1.6`) so it carries across sizes.
- Letter-spacing: negative tracking on headings (`-0.02em`, `-1.5px`) is a deliberate brand choice; record it.
- Mobile H1: measure from `mobile.png` against the 390px width, or read the responsive class/media query in code.

## Spacing

- The spacing tally mixes component internals and layout. The small, frequent values (4, 8, 12, 16) are the component scale; the large rare ones (48, 64, 80, 96+) are section padding.
- Base unit: if nearly every value divides by 4, it's a 4px grid; by 8, an 8px grid. Odd values (5, 10, 14) are drift or line-height side effects; mention them only if common.
- Section padding: read `sections[].paddingY`; if it's `0px` (padding lives on an inner container), measure the gap between sections on the screenshot or read the container classes.
- Content width: the widest centered container on desktop (often 1120–1280px); side padding on mobile from `mobile.png`.
- Root font size other than 16px changes every rem value; `rootFontSize` in `tokens.json` tells you.

## Radius and shadow

- Group radii into personalities: sharp (0–4px), soft (6–12px), round (16px+), pill (9999px). Most systems use one personality plus pill for badges/avatars. Two personalities fighting (e.g. 4px buttons and 24px cards) is a finding for the Don't list.
- Shadows: keep 2–3. Note whether cards rely on borders or shadows; mixing both on the same element type is drift.

## Code vs page

- The code has the **names**; the page has the **values in use**. Use code names in the doc, page values to check them.
- When they disagree, the rendered page is what users see, but the code is what the agent edits: record the code token and add a line under "Source of truth" about the mismatch.
- Tailwind v4: tokens live in `@theme { --color-*, --font-*, --radius-* }`; the class names follow (`--color-ink` → `text-ink`). Tailwind v3: `theme.extend` in `tailwind.config.*`. CSS-in-JS: a `theme.ts` object. Plain CSS: `:root` custom properties, or none (then everything is a raw value; name them yourself).
