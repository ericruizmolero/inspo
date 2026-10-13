---
name: bring-brand
description: Brings a team's existing brand into a criterio.design project through the criterio MCP. Measures the live site with headless Chrome (computed styles, not guesses), scans the codebase for its theme, components, logo and fonts, writes a DESIGN.md, and then fills the project's presentation (palette, faces and scale, logo, motion, voice, imagery, handles) with bring_brand, adds the site as a reference and proposes what belongs to an area. Use when the user says "bring our brand into criterio", "fill the project's presentation from this repo / this site", "extract our design system into criterio" or "put our tokens in criterio".
metadata:
  source: criterio.design
  area: all
---

# Bring in a brand

Turns a site or a codebase into the brand's values on a criterio project, as the team would have typed them: real hex values, the faces that load, the logo's own SVG, the curves in the CSS. Then a DESIGN.md for what the presentation has no place for.

`<skill-dir>` is the folder this file is in.

## When to use

- "Bring our brand into criterio" / "fill the presentation from this repo" / "extract our design system into criterio"
- A criterio project exists and its Sistema has no brand values yet, or the team wants them replaced from the source

## When not to use

- The user wants the page restyled, not documented. Do the restyle, reading the project's criterio.md first.
- A design critique. Use the `review_against_criterio` prompt of the connector instead.
- Copying another company's brand into a live product. Extract the system (scale, spacing, component shapes), swap in the user's own colours and logo, and say so.

## Needs the criterio MCP

Look for tools from the server named `criterio` (`list_projects`, `read_criterio`, `add_reference`, `propose_decision`, `bring_brand`; Claude Code shows them as `mcp__criterio__*`).

If they are missing, say so in one line and fall back: write `DESIGN.md` (steps 1 to 7) and tell the person to paste it in the app, from the project's "…" menu, Bring in an existing brand, as text.

> The criterio MCP is not connected. Its address is the app's `/mcp`; in Claude Code: `claude mcp add --transport http criterio https://app.criterio.design/mcp` (other clients: the Connect MCP dialog in the app has the steps).

## Workflow

```
- [ ] 1. Pick the source
- [ ] 2. Measure the rendered page
- [ ] 3. Scan the codebase
- [ ] 4. Name the tokens by role
- [ ] 5. Components and sections
- [ ] 6. Do and don't rules
- [ ] 7. Write DESIGN.md
- [ ] 8. Map DESIGN.md to criterio's sections
- [ ] 9. In criterio: read, show the plan, write after the yes
- [ ] 10. Report
```

### 1. Pick the source

| Input | Do |
| --- | --- |
| A URL | Step 2. If it is the user's own site and its repo is open, also step 3: the code has the token names, the page has the values in use. |
| "This repo", no URL | Step 3. If a dev server runs or the site is live, also step 2 on its homepage. |
| Both | Steps 2 and 3. Where they disagree, the code's token wins and the mismatch goes in DESIGN.md. |

If a `DESIGN.md` already exists, read it and update it in place.

### 2. Measure the rendered page

```bash
node <skill-dir>/scripts/extract-url.mjs --url <url> --out-dir .design-extract
```

First run only: `cd <skill-dir>/scripts && npm install` (playwright-core, driving the installed Chrome). No Chrome: `npx playwright install chromium` there too.

It writes `.design-extract/tokens.json` and three screenshots, and prints colours ranked by use, font families and the fonts that loaded, the type scale of h1 to h6, body and small, spacing, radii, shadows, button variants, sections and the site's `:root` custom properties. Open the screenshots: the numbers do not say which colour is the accent; the CTA does.

Two more outputs feed the logo and the imagery:

- `logo-light.png`: the header's home link, the lockup as the site shows it (the mark beside the name), at 2x on a transparent ground. `logo-dark.png` too when the page has a dark theme; when it has none, the summary says so. `tokens.json` records both paths and the box size under `logo`.
- `images` in `tokens.json`: every picture the page shows at 320px wide or more, `<img>` and CSS backgrounds, with its absolute `src`, `alt`, natural size and where it sits (`hero`, `section`, `footer`), largest first. The summary names the top five. Open them before choosing: a background texture is not imagery.

A page behind a login: ask for a public page or a screenshot and mark what you read from it *(inferred)*.

### 3. Scan the codebase

```bash
bash <skill-dir>/scripts/scan-codebase.sh <repo-root>
```

Then read, in this order:

1. The theme source (`@theme`, `:root`, `tailwind.config.*`, the tokens file). Record names and values as written.
2. `Button`, `Card`, `Input`: variants, sizes, states.
3. The logo's SVG source: `public/`, `components/Logo*`, the favicon. Keep the markup whole; you pass it as is.
4. How fonts load: `next/font`, `@font-face`, a Google Fonts or Fontshare link. That names the face's source. A face loaded for one use (a margin note, a pull quote, a handwritten label) is part of the brand too: keep it, with role `accent`, and say in its note what it is for.
5. CSS transitions and keyframes: the `cubic-bezier` values and durations in use.

### 4. Name the tokens by role

Map raw values to roles per [references/reading-tokens.md](references/reading-tokens.md): background, surface, ink, ink-muted, border, primary, accent; one font per role; the scale from display to caption; spacing, radius and shadow steps. Every value comes from a measurement or a file. If you had to guess, write *(inferred)* after it.

### 5. Components and sections

From the screenshots and the component code: each button variant with its colours, radius, height and weight; cards, inputs, badges; how a section header is built and what the hero, pricing and footer look like. One sentence per pattern.

### 6. Do and don't rules

Five to ten rules, each checkable in a review and tied to a measured value ("Body is ink-muted #78716C at 15px/1.6; never pure black"). Don'ts come from what the system visibly avoids.

### 7. Write DESIGN.md

Copy `<skill-dir>/assets/DESIGN.template.md` to `DESIGN.md` at the project root and fill every section; delete rows that do not apply. Under 200 lines. Search the file for a leftover placeholder (two opening braces): there must be none.

### 8. Map DESIGN.md to criterio's sections

`bring_brand` takes the presentation's sections. Pass only the ones you have values for; each replaces its section whole.

| DESIGN.md | bring_brand field | Shape |
| --- | --- | --- |
| Brand in one line | `intro` | `headline`, up to 3 `paragraphs` |
| Color table | `color` | `items[]` with your own `id`, `name`, six-digit `hex`, `role`, `group` (brand, accent, neutral, semantic) and `weight` 1 to 4 (the page ground 4, text 3, accent 2, rare 1); `accentId` names the accent by id |
| Typography table and font loading | `typography` | `faces[]` with `id`, `family`, `role` (display, text, accent, mono), `source` (google, fontshare with `slug`, site with `siteWeb`, system), `weights`; `scale[]` with `label`, `px`, `faceId`, `weight`, unitless `lineHeight`, `tracking` in em; `sample`, `trackingRule`. `accent` is the face used sparingly: a handwritten note, a quote, a label |
| The logo's SVG, light and dark | `logo` | `primary` and `mark`, each `{ light, dark }`; a slot is `{ svg }` from the repo's own file, `{ url }` to a public SVG, PNG or WebP, `{ data }` with the file's bytes as base64, or null; `clearSpace` in x, `minPx` or null, `lede` |
| The header's lockup, when the site has no file for it | `logo.primary` | The captured lockup as `data` (`logo-light.png` and `logo-dark.png` from step 2); the mark from the repo or `public/` as `svg` or `url` |
| The site's own pictures | `imagery.images` | Up to 9 from `images` in `tokens.json`: hero captures, illustrations, photographs. `{ url }` when the address is public, `{ data }` as base64 when it is only on disk. They become the section's examples next to `itemIds` |
| Transitions and keyframes | `motion` | `curves[]` with `bezier` as four numbers, `durations[]` in ms, `staggerMs`, `rule` in prose |
| Voice, from the site's copy | `voice` | `principles[]` (`title`, `body`, `sample`) and `pairs[]` (`context`, `do`, `dont`) |
| Imagery | `imagery` | `traits[]` (`label`, `value`), `avoid[]`, `itemIds[]` from `list_references` |
| Domain, social handle, tagline | `applications` | `domain`, `handle` without @, `tagline`, `bio`, `postLine`, `heroItemId` or null |
| The whole file | `guide` | `DESIGN.md` as one string |

Spacing, radius, elevation, component rules and the do and don't list have no section: they stay in `guide` and go to the team as proposals (step 9).

### 9. In criterio

1. `list_projects`, then `read_criterio` with section `decisions`: what is decided, what the brand already holds.
2. Show the plan before writing: the sections you will bring with their key values, the references you will add, one proposal per area the source decides. Wait for the yes.
3. `bring_brand` once, with `source` ("acme.com and the repo's app/globals.css"), every section from step 8 and `guide` set to DESIGN.md. The answer names what was written and what the team had set by hand and kept.
4. `add_reference` for the live site, with a note and its areas.
5. `propose_decision` for layout (spacing scale, content width, radius, elevation) and any other area the source decides, with `reason` saying where it was read. An area is never a brand value.

### 10. Report

The sections written, the sections the team kept, the references added, the proposals waiting, the areas still open, and the project's url from the answer. `.design-extract/` is scratch: say it can be deleted.

## Troubleshooting

- `Cannot find package 'playwright-core'`: `cd <skill-dir>/scripts && npm install`.
- `Failed to launch a browser`: install Google Chrome, or `npx playwright install chromium` in `<skill-dir>/scripts`.
- Content loads late or a banner covers the page: pass `--wait 3000`; the values still come from the whole page.
- The page blocks headless browsers (403, captcha): ask for a screenshot and read from the code.
- Dozens of greys: collapse near-duplicates into 3 to 5 neutrals; the strays go in the don'ts.
- Fonts show as a fallback (Arial, Times): the webfont did not load; read `loadedFonts` in `tokens.json` and the code's font imports.
- `bring_brand` refuses an SVG: it has a script, an event handler or a link out. Pass the plain drawing, or the logo's public address as PNG.
- A capture has to go in as `data`: `base64 -i .design-extract/logo-light.png | tr -d '\n'` gives the string, with no `data:` prefix. The type comes from the bytes, so a PNG stays a PNG whatever the name says. Keep captures small: a slot takes about 1 MB, and the whole call about 4 MB. When the pictures are heavy, send `logo` and `imagery` in two calls; a section not passed is left as it is.
- `bring_brand` answers `kept_by_team`: those sections were set by hand in the app. Say so; the team can hand them back there.
