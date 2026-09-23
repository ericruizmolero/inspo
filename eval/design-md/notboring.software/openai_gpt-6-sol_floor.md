# !Boring Software — DESIGN.md
> playful objects in open space

**Theme:** light  
**Source:** https://notbor.ing/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

!Boring Software presents everyday utilities as things worth playing with, but gives that playfulness a remarkably restrained frame. A small, colorful mark and spare Jet Brains navigation sit across a broad #ffffff header; a black Download button supplies the clearest action. The opening viewport leaves a large white field before moving into a full-width #ececec panel, where generous margins make a few lines of copy feel deliberate. Founders Grotesk carries the personality: 44px statements alternate between 600-weight conviction and 400-weight warmth, while 76px display text delivers occasional exuberance. Black and #232323 keep the language grounded, with #ffb200 reserved for stronger branded moments rather than scattered interface decoration. Across the longer page, product imagery and video can provide the spectacle while the surrounding system stays flat and orderly. Wide 100px section padding, narrow reading columns, squared-off typography, and modest 4px button corners make the site feel more like a playful product manifesto than a conventional software dashboard.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Ink Black | `#000000` | neutral | Primary navigation, display text, outlines, and the solid call to action. |
| Soft Charcoal | `#232323` | neutral | Large editorial statements that need slightly less contrast than pure black. |
| Quiet Gray | `#aaaaaa` | neutral | De-emphasized small links and supporting text; nearby measured grays serve the same role. |
| Panel Gray | `#e0e0e0` | neutral | A secondary light-gray surface for separating content areas. |
| Mist Gray | `#ececec` | neutral | The principal broad background for editorial content panels. |
| Paper White | `#ffffff` | neutral | The page canvas, open header space, and text on solid black buttons. |
| Andy Yellow | `#ffb200` | brand | A bold branded surface color used in selected large areas, not as routine UI chrome. |

## Typography

### Founders Grotesk — display
Use for the large, conversational statements, article titles, button labels, and form text. Its signature move is placing 600-weight declarations beside equally large 400-weight follow-up lines, rather than shrinking the supporting thought.
- **Fallback:** Arial, Helvetica, sans-serif
- **Weights:** 400, 600, 700
- **Sizes:** 22–76px · 7 values
- **Line height:** 1–1.4, depending on scale
- **Letter spacing:** normal

### Jet Brains — mono
Use for compact uppercase navigation and small utility labels. The technical, monospaced texture acts as a precise counterpoint to the expressive Founders Grotesk headlines.
- **Fallback:** 'JetBrains Mono', 'Courier New', monospace
- **Weights:** 400, 700
- **Sizes:** 12–16px · 2 values
- **Line height:** 18–20px
- **Letter spacing:** normal; 1px on some small labels

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | Jet Brains | 700 | 12px | 1.67 | 1px |
| body-sm | Jet Brains | 400 | 16px | 1.125 | normal |
| body | Founders Grotesk | 600 | 22px | 1 | normal |
| subtitle | Founders Grotesk | 400 | 24px | 1.4 | normal |
| title-sm | Founders Grotesk | 600 | 36px | 1 | normal |
| title | Founders Grotesk | 400 | 44px | 1.2 | normal |
| title-lg | Founders Grotesk | 600 | 44px | 1.2 | normal |
| display | Founders Grotesk | 700 | 76px | 1 | normal |

## Spacing and layout

**Density:** airy

- **Base unit:** 10px
- **Max page width:** 1200px overall; 880px for narrower content
- **Section gap:** 100px vertical padding
- **Card padding:** Not established; no repeated card primitive was measured
- **Element gap:** 60px for major groups; 10–40px for local spacing

### Border radii

- **Buttons:** 4px
- **Subscribe control:** 8px

## Elevation

Flat surfaces establish depth through white and gray section changes, solid black fills, and occasional 2px black outlines. No box shadows were measured.

## Components

### Primary button
**Role:** Provides the prominent download action.

Ink Black background, Paper White title-scale-family label at body size, and 4px radius; approximately 47px tall with 30px horizontal padding. No measured shadow.

### Secondary button
**Role:** Offers a less dominant route to more work or content.

Paper White background, Ink Black label, 2px Ink Black border, and 4px radius; 30px horizontal padding and roughly 47px content-and-padding height.

### Input
**Role:** Collects an email address for the newsletter.

Transparent field with an Ink Black subtitle-scale label and 8px horizontal padding; no visible field border or radius. Its adjacent Subscribe control is outlined in Ink Black with a 2px border, 8px radius, and 24px horizontal padding.

### Link
**Role:** Keeps navigation and small utility actions terse.

Jet Brains text without a resting border or underline; primary navigation uses uppercase body-sm in Ink Black, while subordinate links can use uppercase Quiet Gray captions.

### Header
**Role:** Holds the compact brand mark, navigation, and download action.

Paper White, horizontally spaced within the wide container; the small multicolor mark sits left, with uppercase links and the Primary button aligned right. Keep substantial white space around the row.

## Motion

A 300ms ease background-color transition was measured on one element, and the page contains scroll animation and video. Keep interface hover changes restrained; let product media carry the more expressive motion. Specific scroll timings were not established.

## Layout

Use full-width, flat color bands with a centered 1200px outer container and an approximately 880px inner content width where copy needs focus. Maintain around 100px of vertical section padding and 60px between major groups. The opening composition is notably sparse: a compact horizontal header, a deep white visual field, then a gray text panel with ample inset.

## Imagery

Product-led media rather than stock photography: the measured page contains 31 images and video. Give app visuals room to be colorful and dimensional, while keeping the surrounding typography, backgrounds, and controls simple.

## Do and don't

### Do
- Leave genuinely large areas of Paper White around the compact header and product media.
- Set major statements in Founders Grotesk at 44px, pairing 600-weight assertions with 400-weight continuation.
- Use uppercase Jet Brains for navigation and restrained small utility labels.
- Build long-page rhythm from full-width Paper White and Mist Gray bands with generous vertical padding.
- Reserve Andy Yellow for deliberate branded impact rather than every interactive state.
- Use flat black-filled or 2px black-outlined calls to action with modest corners.

### Don't
- Do not fill the opening white field with extra cards, copy, or decorative UI.
- Do not replace the large regular-weight follow-up statements with tiny body copy.
- Do not use rounded pill buttons, gradients, or drop shadows for standard controls.
- Do not make every section yellow; neutral space is essential to the contrast.
- Do not use Jet Brains for the expressive large headlines.
- Do not introduce a dense dashboard grid or stock lifestyle photography.

## Similar brands

- **Panic** — Playful software identity with confident product imagery and uncomplicated interface framing.
- **Teenage Engineering** — Treats utility products as expressive objects against disciplined, spacious layouts.
- **Things by Cultured Code** — Uses carefully controlled typography and generous breathing room to present everyday software.

## Agent prompt

Create a light, spacious !Boring Software-inspired page with a small colorful mark, uppercase Jet Brains navigation, and a compact black Download button. Keep a substantial white opening field before broad #ececec editorial panels. Use Founders Grotesk for expressive 44px statements, alternating 600-weight assertions with 400-weight continuations; save 76px bold type for rare display moments. Set content within a 1200px container, narrow text toward 880px, and use roughly 100px section padding. Let colorful product imagery or video provide spectacle. Keep controls flat, black or outlined, with minimal rounding and no shadows.
