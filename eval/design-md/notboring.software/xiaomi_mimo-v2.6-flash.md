# !Boring Software (notbor.ing) — DESIGN.md
> toy-like software with brutal restraint

**Theme:** light  
**Source:** https://notbor.ing/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

An Apple Design Award–winning software house that presents its marketing page like a game manual: full-bleed horizontal bands of flat grey (#ECECEC, alternating with #E0E0E0) against paper white, no shadows, no gradients, and one electric Andy Yellow #FFB200 field reserved for product showcases. Type is a strict two-family conversation — Founders Grotesk carries every statement, set as 44px/1.2 semibold lead-ins paired with 44px/1.2 regular follow-through, while JetBrains Mono uppercase with 1px letterspacing handles navigation, labels and footer links so the chrome reads like a build log. Content lives on an 880px or 1200px centered measure with 100px section padding and 60px gaps. Buttons are the only rounded objects: 4px radius, flat Ink Black fill or Paper White with a 2px black outline. Playful color, brutal restraint.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Paper White | `#FFFFFF` | neutral | Page base and elevated surfaces; sits behind the hero and inside light content bands. |
| Smoke Grey | `#ECECEC` | neutral | Primary section band — the dominant background by area, carrying most mid-page content. |
| Gainsboro | `#E0E0E0` | neutral | Alternate section band, one step deeper than Smoke Grey, used to separate consecutive story blocks. |
| Andy Yellow | `#FFB200` | accent | Brand accent: product showcase fields and logo accents only — never body text or UI chrome. |
| Ink Black | `#000000` | neutral | Primary action color: filled buttons, 2px button outlines, strongest headings and nav links. |
| Graphite | `#232323` | neutral | Default reading color for section headings and paragraph copy; softer than pure black. |
| Ash | `#AAAAAA` | neutral | Secondary and de-emphasized copy, supporting descriptions and meta text. |
| Muted Stone | `#B6B5B5` | neutral | Footer and utility link color — lowest-contrast text on the page. |

## Typography

### Founders Grotesk — display
All headings, statements, button labels and reading copy. The signature is the 44px heading pair: a 600-weight bold line stacked directly above a 400-weight regular line at the same size — emphasis comes from the pairing, never from color or size jumps.
- **Fallback:** Helvetica Neue, Arial, sans-serif
- **Weights:** 400, 600, 700
- **Sizes:** 16px–76px
- **Line height:** 1.0–1.4
- **Letter spacing:** normal

### Jet Brains — mono
All interface chrome: uppercase navigation (16px/400), labels, captions and footer links (12px/700). Its monospaced uppercase texture is what makes the page read like a technical manual rather than a brochure.
- **Fallback:** ui-monospace, SFMono-Regular, Menlo, monospace
- **Weights:** 400, 700
- **Sizes:** 12px–16px
- **Line height:** 1.5–1.65
- **Letter spacing:** 1px

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | Jet Brains | 700 | 12px | 1.65 | 1px |
| body-sm | Jet Brains | 400 | 16px | 1.5 | 1px |
| body | Founders Grotesk | 600 | 22px | 1 | normal |
| subtitle | Founders Grotesk | 400 | 24px | 1.4 | normal |
| title-sm | Founders Grotesk | 600 | 36px | 1 | normal |
| title | Founders Grotesk | 600 | 44px | 1.2 | normal |
| title-lg | Founders Grotesk | 600 | 60px | 1.1 | normal |
| display | Founders Grotesk | 700 | 76px | 1 | normal |

## Spacing and layout

**Density:** airy

- **Base unit:** 10px
- **Max page width:** 880px / 1200px
- **Section gap:** 100px vertical section padding, 60px between stacked items
- **Card padding:** 40px 100px
- **Element gap:** 10px–40px vertical rhythm (40px between major blocks, 10px inside a block)

### Border radii

- **Primary / secondary buttons:** 4px
- **Newsletter input and subscribe control:** 8px

## Elevation

none — no shadows anywhere; separation is achieved purely by flat background bands and 2px black borders

## Components

### Primary button
**Role:** The single conversion action (Download): flat Ink Black block on any band.

Paper White label, Founders Grotesk body (22px, weight 600, line-height 1.0), Ink Black background #000000, radius 4px, padding 12px 30px 15px, no border, no shadow. Hover: background-color shifts to Graphite #232323 over 0.3s ease. Active: Ink Black unchanged, 1px downward translate. Never place on Andy Yellow with a black-on-yellow override.

### Secondary button
**Role:** Lower-commitment action (See all Works, Subscribe): outline twin of the primary.

Paper White background, Ink Black label in Founders Grotesk 22px/600, 2px solid Ink Black border, radius 4px, padding 12px 30px 15px. The large newsletter variant uses radius 8px, padding 13px 24px 16px, 26px/600 label, 2px solid Ink Black. Hover: background fills Ink Black, label flips to Paper White, 0.3s ease. Active: same filled state.

### Link
**Role:** All navigational and utility text; two distinct variants.

Nav variant — JetBrains Mono body-sm (16px, weight 400, line-height 1.125), uppercase, letterspacing 1px, Ink Black #000000, no underline, no padding; hover underline or shift to Ash #AAAAAA. Footer variant — JetBrains Mono caption (12px, weight 700, line-height 1.65), uppercase, letterspacing 1px, Muted Stone #B6B5B5; hover lifts to Paper White or Ink Black depending on band. Never mix the two sizes in one row.

### Text input
**Role:** Newsletter capture field — deliberately borderless and integrated into the page.

Founders Grotesk subtitle (24px, weight 400, line-height 1.4), Ink Black text, transparent background, radius 0, padding 0 8px, no border of its own; it sits inside a container defined by a 2px solid Ink Black border at radius 8px. Placeholder: Ash #AAAAAA. Focus: border stays Ink Black, caret Ink Black; do not add glow or shadow.

### Header bar
**Role:** Persistent top navigation over the Paper White hero band.

Full-width, Paper White background, no bottom border, no shadow, height ≈100px with logo at left and link cluster plus primary button at right; inner max-width 1200px, horizontal padding 40px. Nav links use the Link nav variant (JetBrains Mono 16px uppercase, 1px letterspacing, Ink Black) spaced 40px apart; the primary button sits at the far right. Hover: background-color 0.3s ease only — no sliding indicators.

## Motion

Minimal: a single background-color 0.3s ease transition on interactive elements plus light scroll-triggered reveals. No parallax, no transform-based entrances.

## Layout

Full-bleed horizontal bands alternate Paper White, Smoke Grey #ECECEC and Gainsboro #E0E0E0; content is centered on an 880px or 1200px measure with 100px vertical section padding and 60px gaps between stacked items. Andy Yellow #FFB200 appears as a whole-band field for product showcases.

## Imagery

High-gloss 3D app renders and playful product mockups floating on flat color bands — no shadows on the chrome itself; the renders carry all the depth. Screenshots sit edge-to-edge inside bands rather than inside cards.

## Do and don't

### Do
- Pair every major section heading as a 44px Founders Grotesk weight-600 line stacked over a 44px weight-400 line at line-height 1.2.
- Set all navigation, labels, captions and footer links in JetBrains Mono uppercase with 1px letterspacing — nav at 16px/400, footer at 12px/700.
- Separate sections with full-bleed flat bands cycling Paper White → Smoke Grey #ECECEC → Gainsboro #E0E0E0, each with 100px vertical padding.
- Restrict Andy Yellow #FFB200 to showcase/product fields; buttons stay Ink Black or white-with-2px-black-outline at 4px radius.
- Keep content inside the 880px or 1200px centered measure with 60px gaps between stacked items.

### Don't
- Do not introduce shadows, gradients, blur or elevation — depth comes only from flat color bands and 2px black borders.
- Do not add a third typeface or use Founders Grotesk for navigation chrome; mono is reserved for interface text and grotesk for statements.
- Do not set headings in color: heading text is Graphite #232323 or Ink Black, never yellow or grey.
- Do not exceed the 8-step type scale or letterspace Founders Grotesk — normal tracking for it, 1px only for JetBrains Mono.
- Do not use rounded pills or large radii: buttons cap at 4px, the newsletter control at 8px, everything else 0px.

## Similar brands


## Agent prompt

Start from the 8-color palette (Paper White, Smoke Grey, Gainsboro, Andy Yellow, Ink Black, Graphite, Ash, Muted Stone) and the two families Founders Grotesk + JetBrains Mono. Build sections as full-bleed flat bands alternating Paper White / #ECECEC / #E0E0E0 with 100px vertical padding, content constrained to 880px or 1200px, 60px gaps. Every section heading = 44px/1.2 weight 600 line over 44px/1.2 weight 400 line in Founders Grotesk, Graphite #232323. All chrome (nav, labels, footer) = JetBrains Mono uppercase, 1px letterspacing. Buttons: 4px radius, 12px 30px 15px padding, 22px/600 label; primary Ink Black on white text, secondary white with 2px solid black border. No shadows, no gradients, no extra radii.
