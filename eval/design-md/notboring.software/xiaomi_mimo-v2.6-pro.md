# (Not Boring) / !Boring Software — DESIGN.md
> playful brutalist app toybox

**Theme:** dark  
**Source:** https://notbor.ing/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

A toy-maker's website wearing a Swiss grid. Everything functional is set in JetBrains Mono, uppercase, tiny (12px), tracked out 1px — nav, labels, footnotes, the whole instrument layer — while Founders Grotesk does all the talking in enormous, tightly-leaded statements. The signature move is the paired headline: one 44px line at weight 600 ('Built like a game,') stacked directly over an identical 44px line at weight 400 ('Runs like an app.') — setup and punchline share a size and only weight separates them. The page is ruthlessly flat: zero shadows anywhere, depth carried purely by full-bleed background bands that alternate Paper White and Studio Fog at 100px section padding. Content sits in an 880px column inside 1200px grids. The palette is a monochrome grey ramp — white, fog, card grey, ink, graphite, ash — punctured by exactly one saturated yellow, Andy Yellow #FFB200, reserved for the logo's dotted rings and app skins. Buttons are black bricks with 4px corners and bottom-heavy padding that optically sits them on the baseline.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Paper White | `#FFFFFF` | neutral | Page ground and inverted button labels; the default surface every white section sits on. |
| Studio Fog | `#ECECEC` | neutral | Full-bleed alternate band — the largest colored area on the page (CSS var --white-smoke-2); sections alternate Fog and Paper White to chapter the scroll. |
| Cardboard Grey | `#E0E0E0` | neutral | Secondary panels, dividers and inert fills (var --gainsboro); the step between Fog and Ash when a block needs to recede. |
| Ink | `#000000` | neutral | Primary button fills, 2px button borders and the loudest text (var --black); used for anything that must be obeyed. |
| Graphite | `#232323` | neutral | Headline and statement text (var --black-4); body copy sits at #333333 — Graphite is the slightly softened black used at 44px and up. |
| Ash | `#B6B5B5` | neutral | Muted and secondary link text (SUPPORT-tier navigation), inactive states; the quietest legible grey. |
| Andy Yellow | `#FFB200` | accent | The single chromatic accent (var --andyyellow); logo rings, app skins and one-off highlights only — never on buttons or as a background band. |

## Typography

### Founders Grotesk — display
All speaking type: hero declarations (76px/700), paired section statements (44px at 600 over 400), article titles (36px/600), body paragraphs (24px/400), button labels (22px/600).
- **Fallback:** Helvetica Neue, Arial, sans-serif
- **Weights:** 400, 600, 700
- **Sizes:** 22–76px
- **Line height:** 1.0–1.2
- **Letter spacing:** normal

### JetBrains Mono — mono
The entire functional layer — nav links, labels, footnotes — uppercase with 1px tracking. Signature decision: nothing is ever bolded in Founders except buttons and the 600 line of a paired headline; hierarchy comes from the mono/grotesk split and from 400-vs-600 within one size.
- **Fallback:** ui-monospace, SFMono-Regular, monospace
- **Weights:** 400, 700
- **Sizes:** 12–16px
- **Line height:** 20px
- **Letter spacing:** 1px

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | JetBrains Mono · uppercase — nav items, labels, footnotes; the most-used style on the site (66 uses). | 700 | 12px | 20 | 1px |
| body-sm | JetBrains Mono · uppercase — primary nav links one tier above caption, same tracking. | 400 | 16px | 18 | 1px |
| body | Founders Grotesk — running paragraphs and blog descriptions; the only long-form size. | 400 | 24px | 34 | normal |
| subtitle | Founders Grotesk — the button/CTA voice; sits just under body on purpose so buttons read as labels, not headlines. | 600 | 22px | 20 | normal |
| title-sm | Founders Grotesk — article and card titles; line-height equals the size, so multi-line stacks lock tight. | 600 | 36px | 36 | normal |
| title | Founders Grotesk — the paired statement size: 600 lead line over a 400 follow line at the identical 44/53. | 600 | 44px | 53 | normal |
| title-lg | Founders Grotesk — hero declarations ('Let's Play'); leading equals the size for a solid block of type. | 700 | 76px | 76 | normal |
| display | No step above 76px exists — the ceiling. Bigger moments are made by isolation and whitespace, never by growing type further. | 700 | 76px | 76 | normal |

## Spacing and layout

**Density:** comfortable

- **Base unit:** 10px
- **Max page width:** 880px text column inside 1200px grids
- **Section gap:** 100px top / 100px bottom padding per band
- **Card padding:** 40px 100px for the wide inset block
- **Element gap:** 60px grid gap, 10–40px inline rhythm

### Border radii


## Elevation

none

## Components

### Primary button
**Role:** Solid Ink call-to-action (a.button.btn-black)

Ink #000000 fill, Paper White label in Founders Grotesk 22px/600, radius 4px, padding 12px 30px 15px (bottom-heavy so the label optically centres). No border, no shadow. Hover transitions background-color over 0.3s ease — the only measured transition in the system.

### Secondary button
**Role:** Outlined variant (a.button.button-black-border)

Paper White fill with 2px solid Ink border, Ink label at 22px/600, radius 4px, identical padding to the primary so the two sit flush in a row. Inverts to Ink fill on hover over 0.3s ease (inferred from the single measured transition).

### Newsletter field
**Role:** Borderless input paired with outlined submit

Input: transparent background, no border, Founders Grotesk 24px/400, padding 0 8px, placeholder in Ash. Submit: 2px solid Ink border, radius 8px (the only 8px radius on the site), Founders Grotesk 26px/600, padding 13px 24px 16px — same bottom-heavy baseline trick.

### Mono text link
**Role:** Navigation and inline link (a.text-link / a.link-2)

JetBrains Mono uppercase with 1px letter-spacing; 16px/400 for primary nav items in Ink, 12px/700 in Ash for secondary tiers (SUPPORT). No underline by default, no padding; hover shifts color over 0.3s ease.

### Header
**Role:** Top navigation bar

Paper White surface, no border and no shadow — separated from the hero by whitespace alone. Logo lockup left (dot-and-ring mark in Andy Yellow, Ink, Ash), mono text links grouped centre-right with 30–40px gaps, primary button flush right. Horizontal inset ~100px.

## Motion

Quiet and utilitarian: one shared transition, background-color 0.3s ease, applied to buttons and links; plus scroll-triggered entrance animations on sections. Nothing bounces — the playfulness is carried by imagery and voice, not easing.

## Layout

Alternating full-bleed bands of Paper White and Studio Fog, each padded 100px top and bottom, holding a centred 880px text column. Wider grids cap at 1200px with 60px gaps. Radii are almost absent (4px buttons, 8px submit) and shadows are entirely absent.

## Imagery

Toy-like 3D renders and skins floating on flat Fog or White bands; hard, borderless crops with no frames or drop shadows.

## Do and don't

### Do
- Pair every section headline as a 600 line over a 400 line at the same 44px/53 — setup and punchline.
- Set all nav, labels and metadata in JetBrains Mono uppercase at 12px with exactly 1px letter-spacing.
- Alternate full-bleed Paper White and Studio Fog bands with 100px vertical padding to chapter the page.
- Give buttons bottom-heavy padding (12px top, 15px bottom) so their labels sit on the optical baseline.
- Keep surfaces perfectly flat: borders (2px Ink) and color blocks do all the depth work.

### Don't
- Don't add box-shadows, glows, gradients or borders to section containers — there are zero shadows in this system.
- Don't put Andy Yellow on buttons, links or body text; it is for the logo mark and app skins only.
- Don't introduce intermediate grey tints between Fog #ECECEC and Cardboard Grey #E0E0E0 — the ramp is closed.
- Don't use Founders Grotesk for functional micro-text or JetBrains Mono for anything above 16px.
- Don't exceed 76px type or add a new weight (no 500, no 800) — the system's tension comes from 400 vs 600 vs 700 only.

## Similar brands

- **Teenage Engineering** — Mono functional layer over a stark monochrome ground with one hot accent.
- **Linear changelog / Vercel** — Flat bands, tight display type, zero shadow depth.
- **Panic** — Playful indie software brand voice in a rigorously gridded shell.

## Agent prompt

Design a landing page for a playful indie software studio. Ground: alternating full-bleed bands of Paper White #FFFFFF and Studio Fog #ECECEC, 100px top/bottom padding, centred 880px text column inside 1200px grids with 60px gaps. Type: Founders Grotesk for headlines and body (hero 76px/76px 700; section statements 44px/53px as a 600-weight line over a 400-weight line; body 24px/34px 400; article titles 36px/36px 600) and JetBrains Mono uppercase with 1px letter-spacing for all nav, labels and footnotes (12px/20px 700 caption tier, 16px/18px 400 nav tier). Palette: Paper White #FFFFFF, Studio Fog #ECECEC, Cardboard Grey #E0E0E0, Ink #000000, Graphite #232323, Ash #B6B5B5, accent Andy Yellow #FFB200 used only in the logo mark and app skins. Buttons: Ink fill with Paper White label at 22px/600 Founders, radius 4px, padding 12px 30px 15px; outlined variant with 2px solid Ink border. Links: mono uppercase, Ink for primary, Ash for secondary. Depth is flat — no shadows anywhere; the only motion is background-color 0.3s ease plus light scroll reveals.
