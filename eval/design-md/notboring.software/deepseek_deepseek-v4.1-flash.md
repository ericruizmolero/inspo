# Not Boring Software — DESIGN.md
> game-studio minimalism with a yellow wink

**Theme:** light  
**Source:** https://notbor.ing/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

A near-white gallery for a company that makes apps like games. Everything sits on Paper White and an enormous field of Fog #ececec, with the only saturated colour — Andy Yellow #ffb200 — appearing as a small logo mark and skin imagery, never as a large painted panel in the first viewport. Typography carries the whole personality: Founders Grotesk in two identical 44px sizes, one at weight 600 for the claim and one at weight 400 for the answer, so headlines read as call-and-response rather than a scale. Jet Brains appears only in 12px uppercase utility labels with 1px tracking, giving navigation a mechanical, almost terminal voice against the warm grotesk. Buttons are the loudest objects: solid Ink or a 2px Ink outline, radius 4px, generous horizontal padding, and an oddly low 20px line-height that makes the label feel pressed into the box. Space is lavish — 100px vertical section padding, 880px text measure, 60px gaps.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Paper White | `#ffffff` | neutral | Page base and header surface; also the fill of outline buttons. |
| Fog | `#ececec` | neutral | Dominant section surface — the large grey blocks that carry every editorial statement. |
| Gainsboro | `#e0e0e0` | neutral | Second-tier panel surface used to alternate or nest against Fog. |
| Ink | `#000000` | neutral | Primary buttons, borders, body and display text; the only border colour on the site. |
| Soft Ink | `#232323` | neutral | Headline text inside grey sections — a hair softer than Ink, used for all h3 copy. |
| Ash | `#aaaaaa` | neutral | Muted and secondary text: footer links, meta, anything demoted below Ink. |
| Andy Yellow | `#ffb200` | brand | The brand's single saturated accent; logo mark and app-skin imagery. Measured as a wide background area deeper in the page, so treat it as a real section colour, not a dot. |

## Typography

### Founders Grotesk — display
Every headline, paragraph, button label and input. Weight 600 does the claiming, weight 400 answers it, weight 700 only at 76px for the page's single shout.
- **Fallback:** sans-serif
- **Weights:** 400, 600, 700
- **Sizes:** 22px, 24px, 36px, 44px, 76px
- **Line height:** TBD
- **Letter spacing:** normal

### Jet Brains — ui
Uppercase navigation and footer labels only. Its 1px tracking and monospaced rhythm are the site's one machine-like gesture.
- **Fallback:** monospace
- **Weights:** 400, 700
- **Sizes:** 12px, 16px
- **Line height:** TBD
- **Letter spacing:** 1px on 12px caption

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | Jet Brains | 700 | 12px | 1.67 | 1px |
| body-sm | Founders Grotesk | 400 | 16px | 1.15 | normal |
| body | Founders Grotesk | 400 | 24px | 1.4 | normal |
| subtitle | Founders Grotesk | 600 | 22px | 1 | normal |
| title-sm | Founders Grotesk | 600 | 36px | 1 | normal |
| title | Founders Grotesk | 600 | 44px | 1.2 | normal |
| title-lg | Founders Grotesk | 400 | 44px | 1.2 | normal |
| display | Founders Grotesk | 700 | 76px | 1 | normal |

## Spacing and layout

**Density:** airy

- **Base unit:** 
- **Max page width:** 880px text measure, 1200px page container
- **Section gap:** 100px vertical, 90-100px bottom on closing sections
- **Card padding:** 40px 100px on panel content
- **Element gap:** TBD

### Border radii

- **button:** 4px
- **submit button:** 8px
- **input:** 0px
- **card / section:** 0px

## Elevation

None. There are no shadows anywhere in the system; hierarchy is made with flat Fog/Gainsboro surfaces and 2px Ink borders.

## Components

### Primary button
**Role:** Main call to action ('Download')

Ink background, Paper White text, subtitle scale (22px/600), 4px radius, padding 12px 30px 15px, no border or shadow. Hover transitions background-color over 0.3s ease.

### Outline button
**Role:** Secondary action ('See all Works')

Paper White background, Ink text at 22px/600, 2px solid Ink border, 4px radius, same 12px 30px 15px padding as the primary button.

### Nav link
**Role:** Header and footer navigation

Jet Brains, 16px/400, uppercase, Ink, no underline, no border. Footer/meta variants drop to caption scale (12px/700, 1px tracking) and Ash colour.

### Email input
**Role:** Newsletter field

Transparent background, no border at rest, Ink text at body scale (24px/400), padding 0 8px. Placeholder reads 'your@email.com' and inherits Ash.

### Subscribe button
**Role:** Submit inside the input row

Transparent background, Ink text at 26px/600, 2px solid Ink border, 8px radius (the only 8px on the site), padding 13px 24px 16px.

### Header
**Role:** Persistent top bar

Paper White surface, 1200px max width, small colour logo left, nav links right, primary button last. No bottom border, no shadow, no scroll-state change.

## Motion

Near-static. One measured transition, background-color 0.3s ease, on buttons; scroll-triggered reveals exist deeper in the page. Nothing bounces or scales.

## Layout

Full-bleed alternating bands: Paper White at the top and around content, then wide Fog #ececec sections. Content is left-aligned inside a 1200px container with an 880px text measure, sections separated by 100px of vertical air and 60px internal gaps. Radii are essentially square — 0px on sections, 4px only on controls.

## Imagery

3D rendered app hardware and colourful skin artwork, high-contrast, placed as large product shots against flat grey rather than treated as photography. The palette stays neutral so the yellow and the app screens supply all chroma.

## Do and don't

### Do
- Set every headline and paragraph in Founders Grotesk; reserve Jet Brains exclusively for 12-16px uppercase labels with 1px tracking.
- Pair a 44px weight-600 claim with a 44px weight-400 reply instead of changing size — that weight flip is the system's signature.
- Give sections 100px of vertical padding and hold body copy to an 880px measure.
- Use Fog #ececec as the default section surface and Paper White for the header and for controls that sit on grey.
- Keep buttons at radius 4px, 2px Ink borders for outlines, and horizontal padding near 30px.
- Left-align everything; no centred hero copy anywhere in the system.
- Let Andy Yellow appear only in the logo and product imagery — it is an accent, not a background for text.

### Don't
- Do not introduce shadows, gradients or glass — the system is strictly flat.
- Do not add a fourth font weight or any italic; Founders Grotesk 400/600/700 and Jet Brains 400/700 are the whole set.
- Do not colour buttons with Andy Yellow or any hue other than Ink/Paper White.
- Do not round sections or cards; corners stay at 0px outside of controls.
- Do not use 8px radius except on the Subscriber submit button, and even there treat it as an inconsistency rather than a rule.
- Do not set body copy below 24px in Founders Grotesk or above 12px in Jet Brains.
- Do not centre or justify multi-line headlines — the ragged left edge is intentional.

## Similar brands


## Agent prompt


