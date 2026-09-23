# Craig Mod — DESIGN.md
> quiet dark reading room

**Theme:** dark  
**Source:** https://craigmod.com/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

A near-black reading room built on Meta's serif and sans, where the page is mostly ground and the words float on it. The body sits at #222 with #000 used as a deeper bed for images and book plates, so the interface never competes with the photography. Almost everything is set in ff-meta-serif-web-pro at 18px/27px, weight 400 — long essays, pull quotes, book blurbs, publisher lines. The sans counterpart, ff-meta-web-pro, is reserved for structure: 13px uppercase navigation with 1px tracking at weight 700, 28px section headings at 500 or 700, and the single blue button. Colour is almost absent: greys step from #fff through #ddd, #999, #666 down to #555 rules, and one saturated blue (#2969FF, with a translucent 75% variant) appears only when the site wants a signature. Articles are capped at 720px, the page grid at 1140px, corners are barely rounded, and every hover is a 0.2s colour fade — nothing moves except a gentle scroll reveal.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Obsidian | `#000000` | neutral | Deepest ground: image beds, book-cover plates, the logo disc, and the space behind the newsletter form. Never used for text. |
| Charcoal | `#222222` | neutral | The page ground. Body background and the dominant surface of every section; dark mode's default --dm-bg. |
| Graphite | `#333333` | neutral | Raised surface for inset blocks and quiet dividers inside dark sections (--dm-surface). |
| Rule Grey | `#555555` | neutral | Hairline borders and separators on dark backgrounds, in place of any shadow (--dm-rule). |
| Ash | `#DDDDDD` | neutral | Primary text on dark: headings, body copy, links, nav. Also surfaces as the light-mode rule colour, but on this site it reads as ink. |
| Paper White | `#FFFFFF` | neutral | Brightest text — labels on the blue button, hovered links — and the fill of the email field, the one light object on the page. |
| Paper Mist | `#EFEFEF` | neutral | The 2px border hugging the email input and small light chips; keeps the white field from bleeding into the dark. |
| Ink Mute | `#666666` | neutral | Secondary metadata: placeholder text, publication lines, the subscriber-count reassurance. Recedes without disappearing. |
| Ink Faint | `#999999` | neutral | Tertiary colophon text and the widest-tracked uppercase micro-labels at the page edges. |
| Signal Blue | `#2969FF` | brand | The only saturated colour: fill of the primary Subscribe button and, at 75% alpha, of inline purchase badges. Hover darkens toward #0064CC. |

## Typography

### ff-meta-serif-web-pro-1 — body
Everything that is meant to be read: paragraphs, pull quotes, book blurbs, newsletter descriptions, essay titles at 400. Never bolded — emphasis is done by size and colour, not weight.
- **Fallback:** Georgia, Times, serif
- **Weights:** 400, 500
- **Sizes:** 18px body, 21.6px essay titles
- **Line height:** 1.5 (27px on 18px)
- **Letter spacing:** normal

### ff-meta-web-pro-1 — ui
Structure and interface: uppercase nav items at 700/1px tracking, section headings at 500 or 700, the email field at 20px, button labels at 13px/700. The signature is that weight 700 is used almost exclusively at 13px in caps — headlines stay 500.
- **Fallback:** -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif
- **Weights:** 400, 500, 700
- **Sizes:** 13px nav and buttons, 20px input, 28–32px headings
- **Line height:** 19.5px at 13px
- **Letter spacing:** 1px on uppercase nav, 2px on colophon

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | serif | 400 | 13px | 19.5 | normal |
| body-sm | sans | 400 | 14px | 21 | normal |
| body | serif | 400 | 18px | 27 | normal |
| subtitle | sans | 400 | 20px | 30 | normal |
| title-sm | serif | 400 | 22px | 24 | normal |
| title | sans | 500 | 26px | 29 | normal |
| title-lg | sans | 500 | 28px | 34 | normal |
| display | sans | 700 | 32px | 38 | normal |

## Spacing and layout

**Density:** airy

- **Base unit:** measured values cluster on 10px and 20px steps; 30px is the section rhythm
- **Max page width:** 1140px page grid, 720px prose measure
- **Section gap:** 30px between stacked blocks; 20px horizontal page gutter
- **Card padding:** 20px 15px for inset text blocks; 9px 20px for button-like elements
- **Element gap:** 8–30px between form controls, 3px padding on nav rows

### Border radii

- **checkbox and tiny chips:** 3px
- **email input:** 5px
- **primary button and inline badges:** 6px
- **logo disc:** 50%

## Elevation

Essentially flat: only one shadow exists, a soft rgba(0,0,0,0.28) 0 10px 26px used on floating/pushable elements. Everywhere else, separation is done with Rule Grey hairlines and Obsidian grounds, never with blur.

## Components

### Primary button
**Role:** Single commit action — Subscribe.

Signal Blue background, Paper White label in sans 13px weight 700, 6px radius, ~9px 20px padding (≈36px tall), no border, no visible shadow. Hover darkens the fill to #0064CC over 0.15s; active nudges down 1–2px with transform 0.25s ease. Centred in a narrow column.

### Email field
**Role:** The only light object on the page.

Paper White fill, 2px Paper Mist border, 5px radius, 4px 10px padding, sans 20px weight 400, Ink Mute placeholder ('email address'), Ash text when typed. Sits above the checkbox list and button, roughly 320px wide. Focus state not measurable from the JSON — a 1px Signal Blue border would be the consistent choice.

### Body text link
**Role:** In-prose navigation to essays, publishers, archives.

Serif 18px/27px in Ash, underlined; hover shifts colour to Paper White on a 0.2s ease colour transition. No background, no padding, no weight change.

### Nav item
**Role:** Top-of-page wayfinding, two stacked columns under the logo.

Sans 13px uppercase weight 700 with 1px letter-spacing and 3px 0 vertical padding, Ash. Hover only changes colour (0.2s ease); no underline, no background. Left-aligned in short stacks, never wrapped.

### Meta line
**Role:** Publisher credits, subscriber counts, captions — the quiet voice under every block.

Serif 13–18px weight 400 in Ink Mute, line-height 1.5, centred under the newsletter form and left-aligned under book descriptions. Occasionally Ink Faint at 11px uppercase with 2px tracking for colophon text at the page edges.

## Motion

Uniformly restrained. Colour and background-color transitions at 0.15–0.3s ease on every link, nav item and button; the primary button uses transform 0.25s ease for its press nudge; scroll-triggered reveals use transform 0.6s cubic-bezier(0.3, …). Nothing scales, nothing bounces, nothing fades opacity on hover.

## Layout

A 1140px centred grid on a Charcoal field with 20px side gutters. The top is a three-column row: circular monogram left, two columns of uppercase nav, a small social icon right, separated by a Rule Grey hairline. Content alternates centred narrow columns (720px forms, quotes, meta) with wide two-up rows (image left, description right). Generous 30px vertical rhythm; a lot of Obsidian is intentionally left empty around photography.

## Imagery

Documentary photography and product shots of books, treated as full-bleed rectangles with no rounding and no overlay — the Obsidian ground acts as the mount. Awards appear as thin white laurel line-art, low contrast, sitting on the dark like engraving.

## Do and don't

### Do
- Keep the page ground Charcoal #222 and reserve Obsidian #000 for image beds; never invert a section to light.
- Set all reading copy in ff-meta-serif-web-pro at 18px/27px weight 400 — no bold inside prose.
- Use sans weight 700 exclusively at 13px uppercase with 1px tracking; keep 28px headings at weight 500.
- Give Signal Blue to exactly one action per view; everything else is a text link.
- Separate blocks with 30px of space or a single #555 hairline, not with shadows or cards.
- Animate hover as a 0.2s ease colour fade only, and cap prose at 720px inside the 1140px grid.

### Don't
- Don't introduce a second saturated hue, gradients, or coloured section backgrounds.
- Don't bold serif body text, italicise for emphasis, or use weight 800 headlines.
- Don't round anything beyond 6px or add pill buttons — the geometry stays near-square.
- Don't apply the blue to secondary or destructive actions; the Amazon-style 75%-alpha badge is the only permitted variant.
- Don't put text below Ink Faint #999 on the dark ground, and avoid #555 for anything but rules.
- Don't add lift shadows, glass blur, or parallax; the single 0 10px 26px shadow belongs only to floating elements.

## Similar brands


## Agent prompt

Build in dark mode only. Background #222, deepest wells #000, borders #555, primary text #DDD, secondary #666, tertiary #999, accents #FFF and one action blue #2969FF (hover #0064CC). Body copy is a Meta-style serif at 18px/27px weight 400; navigation is a Meta-style sans at 13px uppercase weight 700 with 1px letter-spacing; section headings are sans 28px weight 500. Prose column 720px, page grid 1140px, gutters 20px, vertical rhythm 30px. Corners 5px on inputs, 6px on the button, nothing more. Hover = 0.2s colour fade; press = 1px downward nudge. Flat throughout except one soft shadow on floating elements.
