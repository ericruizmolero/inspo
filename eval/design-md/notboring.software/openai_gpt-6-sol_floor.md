# (Not Boring) Software — DESIGN.md
> playful software in open space

**Theme:** light  
**Source:** https://notbor.ing/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

(Not Boring) Software presents everyday utilities as things worth enjoying, not merely finishing. Its first impression is unusually spacious: a small, colorful mark and restrained navigation sit above a wide, largely open white field, while the editorial message begins on a cool gray surface. That restraint gives the larger page room for vivid app imagery and a substantial #ffb200 yellow surface without making the interface feel busy. Founders Grotesk carries the personality, moving from a 44px, weight-600 declaration to an equally large weight-400 reply; the 76px display heading is reserved for bigger moments. Jet Brains gives uppercase navigation a precise, almost technical counterpoint. Near-black #000000 actions and #232323 headings anchor the playful material against #ffffff, #ececec, and #e0e0e0 surfaces. Buttons are solid or outlined rather than decorative, with small corners and no shadows. The result feels confident and game-minded while leaving generous space around the words and products.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Ink Black | `#000000` | neutral | Anchors navigation, primary actions, borders, and the strongest text. |
| Soft Charcoal | `#232323` | neutral | Gives large editorial headings a slightly softer contrast than pure black. |
| Quiet Gray | `#aaaaaa` | neutral | Recedes secondary labels and supporting links; nearby measured grays are treated as this token. |
| Inset Gray | `#e0e0e0` | neutral | Separates lighter gray content surfaces from the main editorial surface. |
| Gallery Gray | `#ececec` | neutral | Provides the broad, cool-gray ground for editorial content. |
| Paper White | `#ffffff` | neutral | Keeps open page areas bright and supplies text on solid black actions. |
| Andy Yellow | `#ffb200` | brand | Creates a large, unmistakably playful section surface rather than a routine UI highlight. |

## Typography

### Founders Grotesk — display
Used for the major statements, supporting editorial copy, and buttons. The signature contrast is a weight-600 statement paired with a weight-400 continuation at the same 44px size; weight 700 is saved for the largest heading.
- **Fallback:** Arial, Helvetica, sans-serif
- **Weights:** 400, 600, 700
- **Sizes:** 22-76px · 5 values
- **Line height:** 0.91-1.4
- **Letter spacing:** normal

### Jet Brains — mono
Used for compact uppercase navigation and small labels. Its mechanical rhythm counterbalances the expressive grotesk; the supplied font name suggests a monospaced face, though the exact custom font file is not identified.
- **Fallback:** 'JetBrains Mono', 'Courier New', monospace
- **Weights:** 400, 700
- **Sizes:** 12-16px · 2 values
- **Line height:** 1.125-1.67
- **Letter spacing:** normal to 1px

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | Jet Brains | 700 | 12px | 1.67 | 1px |
| body-sm | Jet Brains | 400 | 16px | 1.125 | normal |
| body | Founders Grotesk | 600 | 22px | 0.91 | normal |
| subtitle | Founders Grotesk | 400 | 24px | 1.4 | normal |
| title-sm | Founders Grotesk | 600 | 36px | 1 | normal |
| title | Founders Grotesk | 600 | 44px | 1.2 | normal |
| display | Founders Grotesk | 700 | 76px | 1 | normal |

## Spacing and layout

**Density:** airy

- **Base unit:** 10px
- **Max page width:** 1200px outer; 880px editorial
- **Section gap:** 100px
- **Card padding:** 40px; no consistent card primitive was measured
- **Element gap:** 60px for major groups; 10-40px for local spacing

### Border radii

- **Buttons:** 4px
- **Subscribe action:** 8px

## Elevation

Flat surface changes, solid outlines, and whitespace establish hierarchy; no box shadows were measured.

## Components

### Primary button
**Role:** Presents the principal download action.

Ink Black background, Paper White body text, 4px radius; 12px 30px 15px padding and no border. A background-color transition is measured, but its hover color is not established.

### Secondary button
**Role:** Offers a lower-emphasis route to more work.

Paper White background, Ink Black body text, 4px radius; 12px 30px 15px padding with a 2px solid Ink Black border.

### Input
**Role:** Collects an email address for subscription.

Transparent background and Founders Grotesk subtitle text; borderless field with 0px 8px padding. Its adjacent Subscribe action has a 2px Ink Black outline and 8px radius.

### Link
**Role:** Supports navigation and quieter secondary routes.

Uppercase Jet Brains text without an underline or border; use Ink Black at body-sm size for principal navigation and Quiet Gray at caption size for subdued links.

### Header
**Role:** Keeps the brand mark, site navigation, and download action immediately accessible.

Paper White surface within the 1200px outer container; small mark aligned left, widely spaced links toward the right, and the primary button at the far edge. No shadow or dividing line is measured.

## Motion

A background-color transition of 0.3s ease is measured on one element. Scroll animations are present elsewhere on the page, but their timing and transforms are unspecified; avoid assigning motion to every component.

## Layout

Center a 1200px outer container and use narrower 880px editorial columns for prominent text. Give major sections about 100px of vertical padding and use 60px gaps between substantial groups. Favor broad horizontal surfaces, left-aligned statements, and pronounced open space over a dense card grid.

## Imagery

Product-led imagery and video carry the playful, game-like character; the page includes numerous images and video rather than relying on illustration as UI decoration. Let dimensional app visuals provide color and detail while the surrounding interface stays flat and quiet.

## Do and don't

### Do
- Keep the white opening spacious, with the small brand mark and navigation doing little visual work.
- Pair weight-600 and weight-400 Founders Grotesk statements at the same 44px size.
- Use Jet Brains in uppercase for compact navigation and labels.
- Alternate white and measured gray surfaces, reserving Andy Yellow for a large intentional color field.
- Use solid black or black-outlined actions with small radii and no shadow.
- Constrain editorial text to about 880px inside the wider 1200px layout.

### Don't
- Fill the open upper viewport with invented cards, copy, or decorative shapes.
- Turn Andy Yellow into the default button color or scatter it across minor controls.
- Replace the paired headline weights with universally bold type.
- Use rounded pills, gradients, glass effects, or floating shadows for controls.
- Set long editorial statements in the small uppercase navigation face.
- Infer specific hover colors or scroll-animation choreography from the measured transition alone.

## Similar brands

- **Panic** — Playful software presentation supported by confident typography and expressive product imagery.
- **Teenage Engineering** — Technical-feeling small labels and strong product personality coexist with restrained page furniture.
- **Cultured Code** — Considerable whitespace and polished product storytelling keep utility software feeling considered.

## Agent prompt

Build a light, spacious software site for (Not Boring) Software. Center a 1200px layout, narrow editorial copy to 880px, and give major sections roughly 100px of vertical breathing room. Use Founders Grotesk for large, conversational statements, especially 44px lines contrasting weights 600 and 400; reserve 76px bold type for display moments. Set uppercase navigation in Jet Brains. Work with white, #ececec, and #e0e0e0 surfaces, black actions, and one substantial #ffb200 yellow field. Keep buttons small-radius, imagery product-led, and shadows absent.
