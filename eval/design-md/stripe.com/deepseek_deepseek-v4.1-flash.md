# Stripe — DESIGN.md
> weightless financial infrastructure on chromatic gradients

**Theme:** light  
**Source:** https://stripe.com/en-es · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Stripe's system is a single typeface doing almost all the work at weight 300. Söhne Variable, loaded as one variable font with only two weights in use, sets the 48px hero, the 26px bento titles and the 16px body copy with no change in voice — it never bolds, it just grows. Large sizes tighten hard (−0.96px at 48px, −0.64px at 32px, −0.26px at 26px), which is what makes the display read as engineered rather than editorial. Everything else is deliberately quiet: an overwhelmingly white canvas, hairline #E5EDF5 rules, #F8FAFD card surfaces, and Ink Navy #061B31 headings over Slate #50617A body copy. The only saturated element is Signal Violet #533AFD, reserved for primary buttons and callout links, with pale #B9B9F9 borders standing in for filled surfaces. Colour drama is delivered by gradients inside artwork, never by the chrome. Motion is a 0.3s cubic-bezier(0.25, …) fade on colour and stroke; layout-level transforms run slower at 0.6–0.8s with heavier easing. Density stays low; 4px control radii and 6px card radii keep the geometry flat.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Paper White | `#FFFFFF` | neutral | Page canvas and the base of every card; 11,151 measured backgrounds. Also the label colour inside primary buttons. |
| Frost | `#F8FAFD` | neutral | Cool near-white surface for programme cards and alternating bands; the step below Paper White, never used for text. |
| Mist | `#E5EDF5` | neutral | Hairline borders, table rules and pale section fills — the system's only divider colour. |
| Ink Navy | `#061B31` | neutral | All headings and primary body text (166 hits). Near-black with a blue cast; replaces pure black everywhere except inside product artwork. |
| Slate | `#50617A` | neutral | Default body copy, footer links, secondary paragraphs at 16–18px. |
| Fog | `#64748D` | neutral | De-emphasised running text, especially the 32px section descriptions that would be too heavy in Ink Navy. |
| Signal Violet | `#533AFD` | accent | The single brand accent: primary button fill, callout link text, active iconography, inline emphasis words inside the hero headline. |
| Violet Whisper | `#B9B9F9` | accent | 1px border on secondary buttons and violet-tinted outlines; the accent at 30% presence, never filled. |
| Deep Navy | `#0D1738` | neutral | Dark band and footer ground; carries white and Signal Violet text, never used for type on light surfaces. |

## Typography

### sohne-var — mono
The only family. 300 carries every heading, paragraph and 32px description; 400 is reserved for interactive text — nav triggers, buttons, callout links — so weight doubles as an affordance signal. Letter-spacing scales negatively with size: normal below 20px, −0.26px at 26px, −0.64px at 32px, −0.96px at 48px.
- **Fallback:** ui-sans-serif, system-ui, sans-serif
- **Weights:** 300, 400
- **Sizes:** 12–48px
- **Line height:** 1.1–1.4
- **Letter spacing:** normal → −0.96px

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | sohne-var | 400 | 12px | 16 | normal |
| body-sm | sohne-var | 400 | 14px | 20 | normal |
| body | sohne-var | 300 | 16px | 22 | normal |
| subtitle | sohne-var | 300 | 18px | 25 | normal |
| title-sm | sohne-var | 300 | 22px | 26 | normal |
| title | sohne-var | 300 | 26px | 29 | −0.26px |
| title-lg | sohne-var | 300 | 32px | 35 | −0.64px |
| display | sohne-var | 300 | 48px | 55 | −0.96px |

## Spacing and layout

**Density:** airy

- **Base unit:** । 8, 
- **Max page width:** 1266px
- **Section gap:** 64px
- **Card padding:** 18–24px
- **Element gap:** 8px

### Border radii

- **control:** 4px
- **card:** 6px
- **pill:** 100%

## Elevation

shadow-sm: 0 3px 6px rgba(23,23,23,0.06); shadow-md: 0 16px 32px rgba(50,50,93,0.12); shadow-float: 0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.03). Shadows belong to product artwork and the cookie toast only — chrome and layout never cast.

## Components

### Primary button
**Role:** The single high-emphasis action — 'Contact sales', 'Stripe for startups'.

Signal Violet fill, Paper White label, sohne-var 14–16px weight 400, radius 4px, no border, no shadow. Nav size: 11.5px / 20px / 12.5px padding. Hero size: 15.5px / 24px / 16.5px padding. Hover darkens the fill; the 0.3s cubic-bezier(0.25, …) transition covers color and background-color.

### Secondary button
**Role:** Lower-commitment sibling with equal footprint — 'Sign in', 'Sign up with Google'.

Transparent or rgba(255,255,255,0.65) fill, Signal Violet label, 1px Violet Whisper border, radius 4px, same padding rhythm as the primary. Text weight stays 400. Hover tints the fill, never the border.

### Callout link
**Role:** In-line navigation with an implicit arrow — 'View services', 'Read the story'.

Signal Violet at 16px weight 400, no underline, no background; sits on Paper White or Frost. Frequently wrapped in a 1px #D6D9FC border for the bordered variant. Hover slides the arrow ~4px rather than changing colour.

### Header
**Role:** Sticky top navigation across the whole site.

Paper White ground, max-width 1266px, 16px horizontal gutters. Nav triggers are 14px weight 400 Ink Navy at 12px 0 padding with a chevron; the right cluster pairs the secondary 'Sign in' and primary 'Contact sales' buttons. No border or shadow separates it from the page — the gap does.

### Card
**Role:** Container for product artwork and programme offers.

Frost or Paper White fill, radius 6px, no border, padding 18–24px, 14px weight 300 Slate copy at 19.6px line-height for the toast variant. Product-graphic cards carry shadow-md; flat programme cards carry none. Cards are never clickable as a whole — the callout link inside is the target.

## Motion

Colour, fill and stroke fade over 0.3s cubic-bezier(0.25, 0.1, 0.25, 1); small transforms use the same 0.3s curve, while larger layout and reveal transforms stretch to 0.6–0.8s cubic-bezier(0.16, …) with opacity on a flat 0.15s linear. No scroll-triggered animation is present.

## Layout

Centred 1266px column on a 1440px viewport, 16px side gutters, generous 64px vertical rhythm between sections. Text blocks cap at ~817px so display lines break at 3–4 words. Hero is left-aligned in a white column with artwork bleeding to the right edge; alternating Frost bands separate content zones.

## Imagery

Full-bleed chromatic gradient ribbons — orange through magenta to violet — in the hero, sharply cropped by the right edge. Screenshots of Stripe UI (browser frames, order summaries, dashboards) float with soft diffuse shadows. Logo strips render partners in flat monochrome grey.

## Do and don't

### Do
- Set every heading and paragraph in sohne-var weight 300; reach for 400 only for buttons, links and nav triggers.
- Tighten letter-spacing as size grows: normal under 20px, −0.26px at 26px, −0.64px at 32px, −0.96px at 48px.
- Reserve Signal Violet #533AFD for one action per view — a filled primary button or a set of callout links, not both competing.
- Separate surfaces with 1px #E5EDF5 hairlines and Frost #F8FAFD fills; never with shadows.
- Keep radii at 4px for controls and 6px for cards; no pill buttons except status dots.
- Use 64px vertical gaps between sections and cap text columns near 817px.

### Don't
- Do not introduce a second typeface or a weight above 400 — the whole system collapses without the light-weight voice.
- Do not use pure black for text; Ink Navy #061B31 replaces it at every size.
- Do not add colour beyond the violet accent and the gradient artwork; no second brand hue.
- Do not fill anything with Violet Whisper #B9B9F9 — it exists only as a border.
- Do not put drop shadows on layout, cards at rest or the header; shadows are for floating product graphics and the cookie toast.
- Do not let gradient artwork cross the text column — it always bleeds off an outer edge.

## Similar brands

- **Linear** — same single-family, low-weight, violet-accented restraint on a white canvas
- **Vercel** — engineered display type with negative tracking and hairline dividers
- **Mercury** — financial-grade navy text, cool grey surfaces and one saturated action colour

## Agent prompt

Build this page as a light, airy financial-infrastructure interface. Load one variable sans (Söhne or an Inter Tight stand-in) at weights 300 and 400 only: weight 300 for every heading, paragraph and description, weight 400 exclusively for buttons, links and nav triggers. Headings use Ink Navy #061B31, body copy Slate #50617A, de-emphasised descriptions Fog #64748D, all on a Paper White #FFFFFF canvas. The only accent is Signal Violet #533AFD: filled primary buttons with Paper White labels, and callout links with the same violet text, optionally bordered 1px in #B9B9F9. Cards are Frost #F8FAFD or white with 6px radius and no border; separate zones with 1px #E5EDF5 hairlines and 64px vertical gaps, never with shadows. Controls use 4px radii. Scale type 12 / 14 / 16 / 18 / 22 / 26 / 32 / 48px, tightening letter-spacing to −0.26px, −0.64px and −0.96px at the top three steps. Keep the layout in a centred 1266px column with text blocks capped near 817px, and let vivid chromatic gradient artwork bleed off the right edge behind a white text panel. Do not add a second typeface, a heavier weight, pure black text, a second accent hue, or shadows on chrome.
