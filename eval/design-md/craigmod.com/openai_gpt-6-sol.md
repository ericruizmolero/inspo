# Craig Mod — DESIGN.md
> charcoal literary field notes

**Theme:** dark  
**Source:** https://craigmod.com/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Craig Mod’s homepage feels like a writer’s personal archive rather than a product landing page. A continuous #222222 field gives photographs, book covers, and small editorial details room to speak; #DDDDDD text stays soft against it, while #666666 and #999999 quietly separate publication notes from the main story. FF Meta Web Pro supplies compact, letter-spaced navigation and direct headings, but FF Meta Serif Web Pro carries the descriptions, quotations, and essay text at a readable 18px with generous 27px lines. The opening newsletter form is unusually prominent without becoming glossy: a white email field and restrained #2969FF action sit beneath plainspoken copy and native-looking checkboxes. Farther down, award laurels and a large book photograph establish credibility before text does. The 1140px content width, broad vertical pauses, thin rules, and mostly unboxed content make the long page feel curated, personal, and comfortable to read.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Charcoal | `#222222` | neutral | The continuous dark page background lets editorial text and photography take precedence. |
| Raised Charcoal | `#333333` | neutral | A restrained alternate dark surface where content needs separation without a prominent card. |
| Slate Rule | `#555555` | neutral | Subtle dividers and dark-mode borders. |
| Quiet Gray | `#666666` | neutral | Low-priority publication details and newsletter reassurance. |
| Archive Gray | `#999999` | neutral | Secondary labels and supporting text that must remain more legible than Quiet Gray. |
| Reading White | `#DDDDDD` | neutral | The principal heading, navigation, and reading color on Charcoal. |
| Field Edge | `#EFEFEF` | neutral | The light border around the white newsletter email field. |
| Paper White | `#FFFFFF` | neutral | Email-field fill and occasional bright text on blue actions. |
| Action Blue | `#2969FF` | accent | The conspicuous newsletter submit action against the otherwise subdued page. |
| Link Blue Veil | `#007AFCBF` | accent | The translucent blue backing measured on compact purchase links. |

## Typography

### FF Meta Web Pro — display
Used for headings, navigation, form controls, and compact calls to action. Its signature contrast is bold, tightly organized navigation against headings that can remain at weight 500 rather than always becoming heavy.
- **Fallback:** -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif
- **Weights:** 400, 500, 700
- **Sizes:** 13–32px · 6 common values
- **Line height:** normal for headings; approximately 1.5 for smaller interface text
- **Letter spacing:** normal, except 1px on uppercase navigation

### FF Meta Serif Web Pro — body
Carries newsletter descriptions, essay prose, quotations, and publication notes. The recognizable decision is to keep long-form copy at 18px with roughly 27px lines, even on the dark background.
- **Fallback:** Georgia, Times, serif
- **Weights:** 400, 500
- **Sizes:** 13–22px · 4 common values
- **Line height:** 1.5 for reading text; approximately 1.1 for small editorial headings
- **Letter spacing:** normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | FF Meta Serif Web Pro | 400 | 13px | 1.5 | normal |
| body-sm | FF Meta Web Pro | 400 | 14px | 1.5 | normal |
| body | FF Meta Serif Web Pro | 400 | 18px | 1.5 | normal |
| subtitle | FF Meta Web Pro | 400 | 20px | 1.5 | normal |
| title-sm | FF Meta Serif Web Pro | 400 | 22px | 1.1 | normal |
| title | FF Meta Web Pro | 500 | 26px | 1.1 | normal |
| title-lg | FF Meta Web Pro | 700 | 28px | 1.2 | normal |
| display | FF Meta Web Pro | 700 | 32px | 1.2 | normal |

## Spacing and layout

**Density:** comfortable

- **Base unit:** 10px
- **Max page width:** 1140px
- **Section gap:** 60–90px
- **Card padding:** 20px 15px where a contained surface is needed; most content is unboxed
- **Element gap:** 10–30px

### Border radii

- **Email field:** 5px
- **Compact action links:** 6px
- **Photographic corners:** 8px
- **Circular monogram:** 50%

## Elevation

Depth comes primarily from the Charcoal and Raised Charcoal surface steps and thin Slate Rule borders, not floating panels. A few raised elements use 0 10px 26px #00000047; keep that shadow exceptional.

## Components

### Primary button
**Role:** Submits the newsletter selection.

Action Blue face with Paper White label, approximately 44px high and generous horizontal padding; preserve a clear pressed state rather than adding a large glow.

### Input
**Role:** Collects the newsletter email address.

Paper White fill, Field Edge 2px border, 5px radius, and 4px 10px internal padding; use a plain text caret and visible focus state. Newsletter choices use native-looking checkboxes.

### Link
**Role:** Connects navigation, editorial references, and purchasing destinations.

Editorial links read as underlined body text; navigation links are uppercase with 1px tracking and 3px vertical padding. Compact purchase links instead use a Link Blue Veil backing with approximately 8px 17px padding.

### Header
**Role:** Provides a compact directory into the creator’s work.

Constrain to the main content width, place the circular monogram apart from grouped text links, and end with a thin Slate Rule divider. Keep link groups left-aligned rather than turning them into a full-width menu bar.

## Motion

Keep motion secondary to reading: link color changes use 200–300ms ease, and action-background changes about 150ms ease. Occasional imagery may transform over 600ms with a gentle curve; do not animate paragraphs, headings, or the overall layout during ordinary reading.

## Layout

Use a centered 1140px maximum-width container with generous side margins. Open with a narrow, centered subscription area, then move into wider editorial arrangements pairing substantial imagery with text. Maintain broad vertical intervals, modest gaps within text groups, left-aligned reading columns, and thin separation rather than repeated card grids.

## Imagery

Use real photography of walks, places, books, and printed objects, alongside occasional graphic award marks. Images are substantial editorial evidence, not decorative backgrounds; retain natural color and avoid heavy overlays or illustration-style substitutes.

## Do and don't

### Do
- Keep the page field Charcoal and the principal reading text Reading White.
- Set long-form copy in FF Meta Serif Web Pro at 18px with approximately 27px lines.
- Use FF Meta Web Pro for headings and compact uppercase navigation with 1px tracking.
- Give photographs and book imagery meaningful width and breathing room.
- Keep newsletter controls straightforward: a white field, native-looking choices, and one blue submit action.
- Separate content with space or a quiet rule before introducing another surface.

### Don't
- Do not turn every editorial item into a raised card.
- Do not replace the serif reading voice with sans-serif body copy.
- Do not use bright blue across headings, rules, and decorative accents.
- Do not compress the page into a dense dashboard grid.
- Do not center long quotations or essay paragraphs merely because the subscription block is centered.
- Do not use stock illustrations or color-tinted photographs in place of documentary imagery.

## Similar brands

- **Kottke.org** — A long-running personal editorial site that prioritizes links, reading, and an individual curatorial voice.
- **The Creative Independent** — Pairs understated interface decisions with typography-led stories about creative work.
- **The Marginalian** — Treats books, quotations, and essays as the main visual and editorial material.
- **Dense Discovery** — Uses an authorial newsletter sensibility and restrained navigation to foreground curated content.

## Agent prompt

Build a dark, literary homepage for Craig Mod on a continuous #222222 background. Use FF Meta Web Pro for compact uppercase navigation, forms, and measured headings; use FF Meta Serif Web Pro for 18px editorial copy on 27px lines. Center content within 1140px, allowing wide pauses between an uncomplicated newsletter form and image-led book and essay content. Keep text #DDDDDD, supporting details gray, dividers faint, and blue reserved for subscription and compact purchase actions. Favor documentary photography, printed-book imagery, underlined references, and whitespace over cards or effects.
