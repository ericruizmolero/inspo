# Stripe — DESIGN.md
> prismatic gradient over clinical white

**Theme:** light  
**Source:** https://stripe.com/en-es · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Stripe's homepage is a white laboratory crossed by one enormous prismatic gradient: the hero sits on #ffffff while a silk-ribbon render of magenta, orange and indigo bleeds off the right edge, and every piece of chrome stays sober so the image carries the emotion. Type is a single family, sohne-var, and almost everything runs at weight 300 — the 48px/55px hero headline, the 32px section leads, the 26px card titles — so hierarchy comes from size and colour, not boldness; only UI labels and buttons step up to 400 at 14-16px. Text is a navy ladder: #061b31 for statements, #50617a and #64748d for the second clause of every two-tone headline, a device Stripe uses constantly. Signal violet #533afd owns primary buttons, links and the Sign in label. Surfaces are #f8fafd and #e5edf5 panels plus a #0d1738 dark band. Radii are tiny (4px controls, 6px cards); shadows only lift product screenshots.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Paper White | `#ffffff` | neutral | Dominant page background and the fill of floating product-screenshot cards. |
| Midnight Navy | `#0d1738` | neutral | Dark inverted section band used to break the white rhythm mid-page. |
| Ink Navy | `#061b31` | neutral | Primary heading and nav-label colour; never pure black. |
| Slate Text | `#50617a` | neutral | Body copy, footer links and supporting paragraphs at 300 weight. |
| Muted Steel | `#64748d` | neutral | Second clause of two-tone headlines and de-emphasised large type. |
| Mist Panel | `#f8fafd` | neutral | Lightest surface for cards and quiet section blocks; also used at 45% alpha over gradients. |
| Fog Panel | `#e5edf5` | neutral | Stronger tinted section background and the standard hairline border colour. |
| Signal Violet | `#533afd` | brand | Primary button fill, link colour and the whole brand signal of the page. |
| Periwinkle Line | `#b9b9f9` | accent | Border of secondary/ghost buttons sitting on light or gradient backgrounds. |
| Lilac Wash | `#ecedfe` | accent | Faint violet tint for selected states and violet-tinted card surfaces. |
| Sky Link | `#7389ff` | accent | Callout link colour when placed on dark navy sections. |

## Typography

### sohne-var — display
One variable grotesque does the entire site, display through UI. The signature decision is weight 300 everywhere for headlines and paragraphs — nothing is bold — with negative tracking scaled to size so the 48px hero reads tight and optical. Weight 400 appears only on buttons, nav items and links at 14-16px.
- **Fallback:** Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif
- **Weights:** 300, 400
- **Sizes:** 14-48px · 9 values
- **Line height:** 1.05-1.15 for headings, 1.4 for body
- **Letter spacing:** -0.96px at 48px, -0.64px at 32px, -0.26px at 26px, normal below 18px

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | sohne-var | 400 | 11px | 1.45 | 0.1px |
| body-sm | sohne-var | 400 | 14px | 1.4 | normal |
| body | sohne-var | 300 | 16px | 1.4 | normal |
| subtitle | sohne-var | 300 | 18px | 1.4 | normal |
| title-sm | sohne-var | 300 | 22px | 1.15 | -0.33px |
| title | sohne-var | 300 | 26px | 1.12 | -0.26px |
| title-lg | sohne-var | 300 | 32px | 1.1 | -0.64px |
| display | sohne-var | 300 | 48px | 1.15 | -0.96px |

## Spacing and layout

**Density:** airy

- **Base unit:** 8px
- **Max page width:** 1266px
- **Section gap:** 64px
- **Card padding:** 18-24px
- **Element gap:** 8px

### Border radii

- **Buttons and nav triggers:** 4px
- **Cards and panels:** 6px
- **Floating product screenshots:** 8-10px
- **Avatars and dots:** 100%

## Elevation

Depth is reserved for product imagery, not UI. Flat sections separated by #e5edf5 hairlines and surface steps (#ffffff → #f8fafd → #e5edf5 → #0d1738). Screenshot cards use rgba(50,50,93,0.12) 0 16px 32px or the lighter rgba(23,23,23,0.06) 0 3px 6px; overlay panels use rgba(0,0,0,0.06) 0 4px 24px with a 1px Fog Panel border. Buttons carry no shadow.

## Components

### Primary button
**Role:** Drives Get started, Contact sales and other conversions.

Signal Violet background, Paper White label, body-sm to body text at weight 400, 4px radius, padding 12px 20px in the header and 16px 24px in page CTAs, no border or shadow; hover darkens the fill via a 0.3s background-color transition, trailing chevron shifts right 2px.

### Secondary button
**Role:** Alternate paths such as Sign up with Google or Read the story.

Transparent or 65% white fill, 1px Periwinkle Line border, Signal Violet label at weight 400, 4px radius, same 16px 24px padding as primary; hover raises fill to solid Paper White and border to Signal Violet. On dark navy sections the variant inverts to a Paper White fill with violet label.

### Link
**Role:** Inline and callout navigation through dense copy and the footer.

Signal Violet at weight 400 for callouts with a chevron, Sky Link on navy backgrounds; footer links are Slate Text at weight 300, 20px line height, no underline until hover. Colour animates over 0.3s.

### Card
**Role:** Bento tiles and program blocks that group a title with supporting copy.

Mist Panel or Paper White surface, 6px radius, no border in bento use, 24px internal padding, title at title step and body in Slate Text; interactive tiles are buttons and reveal their illustration on hover with a 0.3s transform.

### Header
**Role:** Sticky global navigation with dropdown menus and two CTAs.

Transparent over the hero gradient, ~76px tall, content capped at 1266px; nav triggers are Ink Navy body-sm weight 400 with 12px vertical padding and a caret, 8px gap between items; a Fog Panel hairline appears under the bar once scrolled.

## Motion

Everything eases on cubic-bezier(0.25, 0.1, 0.25, 1) — colour, fill, stroke and background-color at 0.3s for hover feedback. Larger reveals use transform at 0.6-0.8s with cubic-bezier(0.165/0.16, ...) for a decelerated glide of graphics and menu panels; menus fade with opacity 0.15s linear. No parallax, no scroll-triggered counters, no looping ambient animation on text.

## Layout

A single 1266px centred container with 16px gutters; prose columns narrow to ~820-880px so headlines break into 3-4 lines. Sections stack full-bleed with alternating surfaces and 64px internal gaps, separated by hairlines. The hero is a left-aligned text column occupying roughly 60% width while the gradient artwork bleeds past the right edge, unconstrained by the grid. Bento grids of 2-3 columns with 16-32px gutters; a logo strip sits flush under the hero.

## Imagery

No photography of people in the hero. Instead a single high-resolution 3D prismatic ribbon render (magenta, orange, indigo, ice blue) bleeding off-canvas, plus crisp UI screenshots and vector dashboards rendered as white cards with soft shadows. Customer logos are monochrome or brand-coloured wordmarks on white, evenly spaced. Illustration is always product-truthful, never decorative iconography.

## Do and don't

### Do
- Keep all headlines at weight 300 and let size plus colour create hierarchy.
- Split long headlines into two tones: Ink Navy for the statement, Muted Steel for the continuation.
- Scale negative letter-spacing with size: -0.96px at 48px, -0.64px at 32px, normal under 18px.
- Let the gradient artwork bleed off the viewport edge instead of boxing it in.
- Use 4px radius on controls and 6px on cards; never mix in larger pill shapes.
- Reserve shadows for product screenshots and keep UI separation to hairlines and surface steps.

### Don't
- Do not use weights 500-700 anywhere; boldness is not part of this system.
- Do not paint large areas with Signal Violet — it belongs to buttons, links and small accents.
- Do not use pure black #000000 for text; Ink Navy is the darkest ink.
- Do not add drop shadows to buttons or nav items.
- Do not centre body copy or headlines; content is left-aligned on the 1266px grid.
- Do not introduce a second typeface — sohne-var covers display, body and UI.

## Similar brands

- **Linear** — Single variable grotesque, tight negative tracking and a violet signal on near-white surfaces.
- **Vercel** — Clinical white canvas, hairline separations and shadows reserved for product screenshots.
- **Mercury** — Navy text ladder on soft blue-grey panels with restrained 4-6px radii.
- **Plaid** — Fintech gradient hero bleeding off the grid with sober light-weight typography.

## Agent prompt

Build a light fintech landing page on #ffffff with one large prismatic 3D gradient render (magenta, orange, indigo) bleeding off the right edge behind a left-aligned hero. Use a single grotesque (sohne-var, fallback Inter) at weight 300 for all headings and body — 48px/55px display with -0.96px tracking, 32px leads, 26px card titles — and weight 400 only for 14-16px UI labels. Colour ink #061b31, continuation clauses #64748d, body #50617a. Signal violet #533afd for primary buttons and links; secondary buttons transparent with a #b9b9f9 border. Surfaces #f8fafd and #e5edf5, one #0d1738 band. 1266px container, 64px section gaps, 4px button and 6px card radii, hairline borders, shadows only on screenshot cards, 0.3s cubic-bezier(0.25,0.1,0.25,1) hovers.
