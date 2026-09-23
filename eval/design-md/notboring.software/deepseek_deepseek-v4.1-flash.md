# !Boring Software — DESIGN.md
> playful monochrome, one amber spark

**Theme:** light  
**Source:** https://notbor.ing/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

A stark white-and-grey editorial surface that behaves like a gallery wall: 100px of empty air above and below every statement, nothing framed, nothing boxed, no shadows anywhere on the page. The whole system is achromatic — paper white and two greys doing the architectural work while Founders Grotesk speaks in a two-voice duet, weight 600 for the claim and weight 400 for the punchline sitting directly beneath it at the same 44px size. A second, unrelated typeface — Jet Brains, uppercase, letterspaced 1px — is quarantined to navigation and micro-labels, so the nav reads like machine labelling against the humanist headlines. The only chromatic event is a single amber #FFB200 borrowed from the little hand-drawn logo squiggle; it appears nowhere else, which is exactly why it lands. Buttons are flat rectangles: solid black for the primary action, 2px black outline for the alternative, 4px radius, never a shadow. The site is loud by being quiet.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Paper White | `#FFFFFF` | neutral | Page base and the text color sitting on Ink Black elements. The default canvas of the header and the top of the page. |
| Smoke | `#ECECEC` | neutral | Dominant section background — the pale grey band that the editorial headline blocks sit on. Weighted as the single largest surface color on the page. |
| Gainsboro | `#E0E0E0` | neutral | Second-tier panel grey for alternating bands and media placeholders. One step darker than Smoke so stacked sections separate without a border. |
| Ink Black | `#000000` | neutral | Primary action fill, 2px outline on the secondary button, and display headline ink. The only color used for hard borders. |
| Charcoal | `#232323` | neutral | Long-form text ink: h3 claims and supporting paragraphs. Slightly softened from pure black so 44px blocks do not vibrate on grey. The CSS also carries #272727/#292929/#212121 — near-identical shades that collapse into this token. |
| Ash | `#AAAAAA` | neutral | De-emphasized text: metadata, secondary body copy, anything that must recede behind Charcoal. |
| Dormant | `#B6B5B5` | neutral | Disabled / low-priority nav link color, e.g. the unselected SUPPORT item. Barely lighter than Ash; treat as the quietest readable step. |
| Andy Amber | `#FFB200` | accent | The lone chromatic accent, sampled from the logo scribble and the illustrated app skins. Used in graphical marks only — never for buttons, links or body text. Its scarcity is the point. |

## Typography

### Founders Grotesk — display
The entire voice of the site. Weight 600 states the claim, weight 400 delivers the counter-line at the identical size and line-height, so headlines read as a two-part joke rather than a hierarchy. Weight 700 is reserved for the 76px display line and is the only genuinely bold moment.
- **Fallback:** sans-serif
- **Weights:** 400, 600, 700
- **Sizes:** 22px, 24px, 36px, 44px, 76px
- **Line height:** 1.0 for display, 1.2 for h3, 1.4 for paragraph text
- **Letter spacing:** normal (no tracking at any size)

### Jet Brains — mono
Quarantined to navigation items, eyebrows and micro-labels, always uppercase with 1px tracking. Never used for sentences. The functional/monospaced texture against Founders Grotesk is what makes the system legible as 'software company' rather than 'agency'.
- **Fallback:** monospace
- **Weights:** 400, 700
- **Sizes:** 12px, 16px
- **Line height:** 1.125 for nav (18px), 1.67 for 12px labels
- **Letter spacing:** 1px (applied to ~60 elements)

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | Jet Brains, uppercase — small labels and tertiary nav. | 700 | 12px | 20 | 1px |
| body-sm | Jet Brains, uppercase — primary header navigation. | 400 | 16px | 18 | 1px |
| subtitle | Founders Grotesk — button and CTA label size. | 600 | 22px | 20 | normal |
| body | Founders Grotesk — lead paragraphs and blog descriptions. | 400 | 24px | 34 | normal |
| title-sm | Founders Grotesk — article and card titles. | 600 | 36px | 36 | normal |
| title | Founders Grotesk — section statements; weight 400 at the same size is the paired reply. | 600 | 44px | 53 | normal |
| display | Founders Grotesk — the single largest line on the page, set solid with no leading. | 700 | 76px | 76 | normal |

## Spacing and layout

**Density:** airy

- **Base unit:** 5px
- **Max page width:** 880px for prose and headline columns, 1200px for the page shell
- **Section gap:** 100px
- **Card padding:** not applicable — the system has no cards; blocks are framed by whitespace instead of borders or fills
- **Element gap:** 60px between column blocks; 40px / 30px / 10px vertical margins for stacked text; 8px 10px for inline label pairs

### Border radii

- **buttons:** 4px
- **input submit / form control:** 8px

## Elevation

None. There are zero box-shadows in the system; separation is achieved by alternating Smoke and Gainsboro section fills and by 2px black borders on outlined controls.

## Components

### Primary Button
**Role:** Filled action (Download)

Ink Black background, Paper White label, subtitle type (22px Founders Grotesk 600), 4px radius, no border, no shadow, padding 12px 30px 15px (asymmetric bottom-heavy). Hover transitions background-color over 0.3s ease.

### Secondary Button
**Role:** Outlined action (See all Works)

Paper White background, Ink Black label at the same subtitle size and weight, 2px solid Ink Black border, 4px radius, padding 12px 30px 15px. Identical geometry to the primary so the two sit as a matched pair.

### Subscribe Control
**Role:** Inline email capture

A transparent, borderless input at 24px Founders Grotesk 400 with 0px 8px padding, paired with a submit that is Paper White, 2px Ink Black border, 8px radius, 26px Founders Grotesk 600, padding 13px 24px 16px. The softer 8px radius deliberately breaks from the 4px button family.

### Nav Link
**Role:** Header and footer navigation

Jet Brains 16px 400 uppercase, 1px letter-spacing, Ink Black, no underline, no background, line-height 18px, 30px horizontal margin between items. Inactive or low-priority items fall to Dormant #B6B5B5 at 12px weight 700.

### Header Bar
**Role:** Fixed top navigation

Paper White background, logo mark left, nav cluster and primary button right, no bottom border and no shadow. Contains no vertical padding token of its own; the 60px gap rhythm separates nav from CTA.

## Motion

Background-color 0.3s ease on interactive controls only. Scroll-triggered reveals exist page-wide but the resting state of every element is fully opaque and un-transformed — motion never carries meaning that the static layout does not already convey.

## Layout

Centered single column capped at 880px for reading content inside a 1200px shell, sections separated by 100px of vertical air and nothing else: no dividers, no cards, no borders between bands. Full-bleed Smoke and Gainsboro panels alternate to segment the page. Two-column blocks use a 60px gap. Navigation is a flat horizontal row pinned to the top-right, with the primary CTA visually terminating the line.

## Imagery

Photography and 3D app renders appear at full panel width against the flat grey bands, with no border radius, no shadow and no caption overlay — images behave like posters pasted flush onto the wall.

## Do and don't

### Do
- Set headline pairs at identical size and line-height, changing only the weight: 600 for the statement, 400 for the reply underneath.
- Keep every surface achromatic and let Andy Amber #FFB200 appear only inside logo or illustration artwork.
- Separate sections with 100px of vertical space or a full-bleed grey band — never with a border, card or shadow.
- Use Jet Brains uppercase with 1px letter-spacing for anything under 16px that functions as a label or nav item.
- Give buttons the 4px radius and the asymmetric 12px 30px 15px padding; keep filled and outlined variants geometrically identical.

### Don't
- Never apply a box-shadow, gradient or glass effect — elevation does not exist in this system.
- Never use Andy Amber on a button, link or piece of body text.
- Never set body text in Jet Brains or sentence-case a nav item; Jet Brains is uppercase labelling only.
- Never enlarge the headline weight to 700 below 76px — weight 600 does the work at section level.
- Never box editorial content in cards with fills or borders; blocks breathe against grey, not inside frames.

## Similar brands


## Agent prompt

Build a stark, achromatic editorial page on Paper White #FFFFFF with full-bleed Smoke #ECECEC and Gainsboro #E0E0E0 bands. Use Founders Grotesk at 400/600/700 for every sentence; headline blocks are 44px with line-height 53px, weight 600 followed by weight 400 at the same size. Reserve the 76px/76px weight 700 line for the single largest statement. Set navigation in Jet Brains 16px uppercase with 1px letter-spacing, secondary labels at 12px weight 700. Paragraph copy is 24px Founders Grotesk 400 with 34px leading, color Charcoal #232323. Buttons: 4px radius, 12px 30px 15px padding, 22px Founders Grotesk 600 — filled Ink Black for primary, 2px Ink Black outline on white for secondary. Let the amber #FFB200 live only in the logo mark. No shadows anywhere; separate sections with 100px vertical spacing and alternating grey fills. Cap prose at 880px, the page shell at 1200px.
