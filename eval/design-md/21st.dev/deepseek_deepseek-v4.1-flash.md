# 21st — DESIGN.md
> midnight component vault, electric blue

**Theme:** dark  
**Source:** https://21st.dev/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

A near-black interface laboratory. Obsidian (#09090b) is the canvas and a one-step-lighter Ink Panel (#0e0f10) is the only elevation, separated by 1px Hairline borders rather than shadow. Type is General Sans at weight 500 for essentially everything — 318 of the 340 measured weights — with 600 reserved for a handful of emphases and a General Sans 300 light tier for quiet asides; nothing is ever bold. The headline runs General Sans 500 at 64px/1.06 with -1.408px tracking, its middle word flipped to Signal Blue, and the aggressive negative tracking continues down the scale as size drops. Body copy is Slate against Ghost White headings, and the page is dense: 13px labels, 11px meta badges and 12.5px monospace readouts carry most of the meaning. Structure is pills and rounded rectangles — 9999px for every control, 6-8px for links and tags, 12-16px inside showcase panels. Motion is short and mechanical: color 0.15s, background-color 0.2s, transform 0.3s on cubic-bezier(0.23, 1, 0.32, 1).

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Obsidian | `#09090b` | neutral | Page canvas and every outline pill's fill. 1302 background hits: the site is this color before it is anything else. |
| Ink Panel | `#0e0f10` | neutral | Raised surface exactly one step above Obsidian — component tiles, dropdowns, code panels. Barely visible by design; separation comes from borders, not lightness. |
| Hairline | `#27272a` | neutral | The only structural border color: 1px around outline pills and cards. Content is drawn with lines here, not shadows. |
| Ghost White | `#f4f4f5` | neutral | Primary text, icons, headings. A near-white, never a pure-white, so it sits soft on Obsidian. |
| Slate | `#8f8f99` | neutral | Secondary text and the resting state of every nav link and description line (122 hits — the most common text color on the page). |
| Signal Blue | `#0033ff` | brand | The single saturated color in the chrome: primary CTA fill, 'living' in the headline, active tab. It carries all brand energy alone. |
| Selected Blue | `#008fe9` | brand | Declared as --color-selected; selection/focus accent, one step lighter and cooler than Signal Blue. |
| Chalk | `#f6f6f1` | accent | Inverted light surface used inside showcase panels and terminal cards. Warm off-white, not neutral white. |
| Terracotta | `#c86a50` | accent | Warm spotlight surface inside demo showcase cards only (183 area count). It never touches nav, buttons or page background. |
| Pure White | `#ffffff` | accent | Text sitting on Signal Blue, and the brightest preview-card surface. |

## Typography

### General Sans — ui
Everything — headline, body, buttons, nav, card titles. 269 of 350 font-family hits.
- **Fallback:** 
- **Weights:** 500, 600, 300
- **Sizes:** 11px, 12px, 13px, 16px, 17px, 18px, 36px, 44px, 64px
- **Line height:** 1.5 for body and controls, 1.06 for display
- **Letter spacing:** normal to -0.022em, tightening with size

### ui-monospace — mono
Terminal output, file paths, counts and installation snippets inside showcase panels.
- **Fallback:** 
- **Weights:** 400, 500
- **Sizes:** 11px, 12.5px
- **Line height:** 1.5 to 2.1
- **Letter spacing:** normal

### Averia Serif Libre — display
Five instances only — a small serif counterpoint in editorial copy. Optional; drop it and nothing structural breaks.
- **Fallback:** 
- **Weights:** 400
- **Sizes:** 16px-20px (not resolved from the token dump)
- **Line height:** 1.5
- **Letter spacing:** normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | General Sans | 500 | 11px | 1.5 | normal |
| body-sm | General Sans | 500 | 13px | 1.38 | normal |
| body | General Sans | 500 | 16px | 1.5 | normal |
| subtitle | General Sans | 500 | 17px | 1.5 | -0.012em |
| title-sm | General Sans | 500 | 18px | 1.5 | normal |
| title | General Sans | 500 | 36px | 1.1 | -0.012em |
| title-lg | General Sans | 500 | 44px | 1.06 | -0.022em |
| display | General Sans | 500 | 64px | 1.06 | -0.022em |

## Spacing and layout

**Density:** compact

- **Base unit:** 4px
- **Max page width:** 1152px
- **Section gap:** 64px to 96px (page runs 6288px tall at 1440px wide, so sections stack long and airy while controls stay tight)
- **Card padding:** 24px to 32px
- **Element gap:** 8px to 12px

### Border radii

- **Inline tag, nav link, small icon button:** 6px
- **Compact control, menu item:** 8px
- **Panel, terminal block, showcase card:** 12px
- **Large dialog / pill-inside-panel:** 16px
- **Every button, tab and badge:** 9999px

## Elevation

Depth is border-first: 1px Hairline #27272a on dark surfaces, an inset hairline rgba(0, 0, 0, 0.04) 0 0 0 1px inset paired with rgba(0, 0, 0, 0.07) 0 1px 3px 0 on tiles, and a pressed-control shadow rgba(0, 0, 0, 0.25) 0 0.5px 1px 0 with rgba(0, 0, 0, 0.02) 0 -3px 4px 0 inset for pill buttons. Glossy panels add a white top-inset highlight instead of a drop shadow.

## Components

### Primary pill button
**Role:** Reference: 'Sign up', 'Browse components'

Signal Blue background, Pure White text, General Sans 500, small variant 13px/1.5 with height 28px and 0 16px padding; large variant 15px/1.5 with height 44px and 0 24px padding. Radius 9999px, no border, no shadow. Hover transitions background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1); text is capitalized only in tab controls.

### Outline pill button
**Role:** Reference: 'Join for free'

Obsidian background, Ghost White text, 1px Hairline border, 15px/1.5 at weight 500, height 44px, 0 24px padding, radius 9999px. No fill change on hover in the measured state — treat hover as border brightening.

### Ghost nav link
**Role:** Reference: 'Components', 'Templates', 'Pricing', 'Log in'

Slate text, 13px/1.5 at weight 500, padding 4px 8px, radius 6px, transparent background. Transitions color 0.15s cubic-bezier(0.4, 0, 0.2, 1) toward Ghost White. Header height 28px for buttons, links vertically centered.

### Component preview card
**Role:** The library tile grid primitive

Ink Panel or Obsidian surface, square outer corners (radius 0 measured on the tile), 16px/1.5 Ghost White text plus a 13px/1.38 title at 80% Ghost White. Shadow is an inset hairline plus a whisper drop: rgba(0, 0, 0, 0.04) 0 0 0 1px inset, rgba(0, 0, 0, 0.07) 0 1px 3px 0. Inner demo surfaces use 12-16px radius and their own colors.

### Terminal / detail panel
**Role:** Code and status readouts inside cards

Chalk, Terracotta or Pure White surface, radius 12px, padding 32px 32px 24px, ui-monospace at 12.5px/2.1 weight 500 in a 90%-white tint. Optional glossy highlight ring: rgba(255, 255, 255, 0.3) 0 1px 1px inset, rgba(255, 255, 255, 0.16) 0 0 0 1px inset.

## Motion

Short and mechanical, never bouncy in feel despite the curves: color 0.15s and background-color 0.2s on cubic-bezier(0.4, 0, 0.2, 1) for hover, transform 0.3s and scale 0.15s on cubic-bezier(0.23, 1, 0.32, 1) for press and reveal. Opacity fades run 0.18s-0.2s. Scroll-triggered reveals are present.

## Layout

Single 1152px centered column on a 1440px viewport, 24px gutters. Header is a 3-zone bar — wordmark left, 13px nav links center, auth cluster right. Hero is a left-aligned 64px display with a 17px Slate lead and a row of filter pills. Below, a horizontally scrollable strip of square-cornered preview tiles.

## Imagery

Preview screenshots of real components fill the tile grid: dense UI captures at their own aspect ratios, no rounding on the tile, no overlay gradient. Decorative atmosphere is provided by blue glow gradients behind the hero rather than by photography.

## Do and don't

### Do
- Set every control and tab at 9999px radius, and every inline tag or nav link at 6px.
- Reach for General Sans 500 first; specify weight explicitly since the family ships 300/400/500/600 and the page leans on the middle of that range.
- Tighten tracking as type grows: roughly -0.012em at 17-36px and -0.022em at 44-64px.
- Keep the container at 1152px max width with 24px horizontal gutters, and build vertical rhythm from a 4px base with 8/12/16/24/32 steps.
- Use ui-monospace 12.5px for anything that reads as a command, file path or status line, and Averia Serif Libre only as a rare editorial flourish (5 hits measured — treat it as an accent, not a family).
- Animate only color, background-color, opacity, scale and transform, on 0.15s-0.3s cubic-bezier(0.4, 0, 0.2, 1) or cubic-bezier(0.23, 1, 0.32, 1).

### Don't
- Do not introduce a second saturated accent in the chrome; Signal Blue is the only colored fill on buttons, active tabs and headline emphasis.
- Do not bold anything. Weight 500 is the ceiling for running UI, 600 for the rare label — 700+ does not exist in this system.
- Do not use pure black #000000 or pure-neutral greys; the canvas is #09090b and every text grey carries a faint blue cast (#8f8f99, #f4f4f5).
- Do not add drop shadows to page-level surfaces. Depth is 1px inset hairlines (#27272a or rgba(0,0,0,0.04) inset) plus a 0 1px 3px whisper at most.
- Do not square off a button or a tab; controls are pill-shaped, square corners exist only on the outer preview tiles.
- Do not put Terracotta, Chalk or Pure White behind nav, buttons or page background — they belong to showcase panels only.

## Similar brands


## Agent prompt

Design system spec for 21st.dev — dark, near-black React component library with a single electric blue accent, General Sans at weight 500 doing nearly all the work, and pill-shaped controls.
