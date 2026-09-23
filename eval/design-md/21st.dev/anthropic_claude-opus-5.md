# 21st.dev — DESIGN.md
> midnight blue component vault

**Theme:** dark  
**Source:** https://21st.dev/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

21st.dev reads as a near-black developer gallery lit from below by an electric blue bloom. The page sits on Void #0a0a0d with component preview tiles a half-step lighter (#0e0f10 and #09090b), so depth comes from surface steps and 1px inset hairlines rather than shadows. General Sans does everything at weight 500 — even the 64px hero headline, tracked tight at -1.408px and set in Ice White #f4f4f5 — with only one flourish: the word 'living' in Averia Serif Libre italic, coloured Signal Blue #4b73ff. Supporting copy drops to Ash #9b9aa6 at 17px/25.5px. The UI layer is deliberately small: 13px nav links, 28px pill buttons, 6–12px radii, 12px gaps. The primary action is a fully-rounded #1436f4 pill with white label. Full-bleed rows of dark, high-contrast component screenshots run past the 1152px content container, and ui-monospace appears only inside terminal-style cards.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Void | `#0a0a0d` | neutral | Global page background, and the fill of ghost/outline buttons so they disappear into the page. |
| Obsidian | `#09090b` | neutral | Deepest surface behind component preview tiles and code panes. |
| Graphite | `#0e0f10` | neutral | Card and preview-frame surface, one step above Void. |
| Steel Border | `#3f3f4699` | neutral | Standard 1px border on outline buttons, panels and dividers. |
| Hairline | `#ffffff26` | neutral | Low-opacity white ring (0.06–0.15 alpha) used as inset outline on glass cards and thumbnails. |
| Ash | `#9b9aa6` | neutral | Muted text: nav links, subheadlines, metadata, counters. |
| Ice White | `#f4f4f5` | neutral | Primary text and headline colour on all dark surfaces. |
| Signal Blue | `#1436f4` | brand | Primary button and CTA fill, always with pure white label. |
| Living Blue | `#4b73ff` | accent | Highlight tint for the italic serif word in the hero and the ambient gradient glow at the fold. |
| Paper | `#f6f6f1` | accent | Inverted card surface used for light agent/editor mockups against the dark page. |
| Terracotta | `#c86a50` | accent | Warm card background for the Claude/terminal demo block, the only non-blue chroma in the system. |

## Typography

### General Sans — body
Carries the entire interface: hero, body, nav, buttons and card titles. The signature is that weight 500 does all the work — 318 of the measured nodes are medium and nothing is truly bold; hierarchy comes from size and opacity instead.
- **Fallback:** system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Weights:** 300, 500, 600
- **Sizes:** 11-64px · 10 values
- **Line height:** 1.06 on display, 1.5 on body
- **Letter spacing:** normal for UI, -0.2px to -1.4px on large type

### Averia Serif Libre — display
Used italic for exactly one word inside the hero headline ('living'), tinted Living Blue. It is a punctuation mark, never a heading font — never more than one word per page.
- **Fallback:** Georgia, 'Times New Roman', serif
- **Weights:** 400
- **Sizes:** 64px · 1 value
- **Line height:** 1.06
- **Letter spacing:** -1.4px

### ui-monospace — mono
Reserved for CLI output, install commands and diff logs inside demo cards. Set at 12.5px with generously loose 26px leading so terminal lines read as captured output, not as body copy.
- **Fallback:** 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace
- **Weights:** 500
- **Sizes:** 11-13px · 3 values
- **Line height:** 2.1 in terminal blocks
- **Letter spacing:** normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | General Sans | 500 | 11px | 1.5 | normal |
| body-sm | General Sans | 500 | 13px | 1.38 | normal |
| body | General Sans | 500 | 16px | 1.5 | normal |
| subtitle | General Sans | 500 | 17px | 1.5 | -0.2px |
| title-sm | General Sans | 600 | 18px | 1.4 | -0.19px |
| title | General Sans | 500 | 36px | 1.15 | -0.43px |
| title-lg | General Sans | 500 | 44px | 1.1 | -0.97px |
| display | General Sans | 500 | 64px | 1.06 | -1.41px |

## Spacing and layout

**Density:** comfortable

- **Base unit:** 4px
- **Max page width:** 1152px
- **Section gap:** 64px
- **Card padding:** 24px (32px 32px 24px on feature cards)
- **Element gap:** 12px

### Border radii

- **Buttons, tabs, pills:** 999px
- **Nav link hover chip, small badge:** 6px
- **Thumbnail, panel:** 8px
- **Feature card:** 12px
- **Large mockup card:** 16px
- **Avatar:** 50%

## Elevation

Depth is built from surface steps plus 1px rings, not drop shadows. Preview tiles use an inset hairline: inset 0 0 0 1px rgba(0,0,0,0.04) with 0 1px 3px rgba(0,0,0,0.07); glass panels use a ring of 0 0 0 1px #ffffff26 (stepping down to 0.08 and 0.06 alpha). Only the inverted Paper mockup lifts with 0 25px 50px -12px rgba(0,0,0,0.25). Glossy pills add inset 0 1px 1px rgba(255,255,255,0.3) and inset 0 -6px 10px -6px rgba(0,0,0,0.55).

## Components

### Primary button
**Role:** Sign up and Browse components — the single blue action per view.

Signal Blue fill, pure white label, pill radius, body-sm text at weight 500; height 28px with 0 16px padding in the header and 44px with 0 24px padding in page CTAs. Hover darkens the fill over 0.2s; active scales to 0.98.

### Secondary button
**Role:** Low-commitment actions like Log in and Join for free.

Void background with 1px Steel Border, Ice White or Ash label, pill radius; 28px or 44px height, 0 12–24px padding. Borderless variant for nav-adjacent buttons; hover lifts label to Ice White and adds a faint Hairline background.

### Link
**Role:** Header navigation and inline text links.

body-sm in Ash, no underline, 4px 8px padding with 6px radius so a Hairline hover chip can appear behind it; colour transitions to Ice White in 0.15s. Inline prose links keep a 1px underline offset by 3px.

### Card
**Role:** Component preview tile in the gallery grids.

Graphite or Obsidian surface, 8–12px radius, inset Hairline ring, zero padding on the media area and a 12px 4px footer holding a 13px/18px title at 80% white plus an Ash counter badge. Hover scales the media 1.02 over 0.3s and reveals Code/Preview pill tabs.

### Header
**Role:** Fixed top bar with logo, four nav links and auth actions.

48px tall, transparent over the hero then Void with a bottom Hairline once scrolled; content aligned to the 1152px container with the nav centred and 12px gaps between items.

## Motion

Short and functional: color 0.15s, scale 0.15s, background-color 0.2s, opacity 0.18–0.2s, all on cubic-bezier(0.4,0,0.2,1). The one expressive curve is transform 0.3s cubic-bezier(0.23,1,0.32,1) for card media zoom and preview reveals. Scroll-linked reveals fade and translate content in; the hero gradient glow breathes slowly. Nothing bounces, rotates or animates layout width.

## Layout

Single-column narrative on a 1152px centred container with a 64px rhythm between sections. The hero is left-aligned with a max-34ch subhead and a horizontal filter-pill row beneath it. Below the fold, component previews break out to a full-bleed edge-to-edge row (≈1471px) that bleeds off both sides, then settle into 2–4 column card grids with 12–24px gutters. Everything aligns to a 4px base unit.

## Imagery

No photography. Imagery is screenshots of the components themselves — dark UI captures with neon or metallic renders, ASCII art, liquid-chrome blobs — cropped into fixed-ratio tiles so the catalogue reads as a wall of live product. Interspersed are hand-built mockups of Claude, Codex and editor panes on Terracotta and Paper surfaces, plus autoplaying muted video previews on hover.

## Do and don't

### Do
- Keep every weight at 500 and create hierarchy with size, opacity and colour instead of bold.
- Use Signal Blue only once per viewport, on the single primary action.
- Give all buttons and tabs full pill radius; reserve 6–12px radii for cards and chips.
- Layer surfaces Void → Obsidian → Graphite and outline them with a 1px Hairline rather than a shadow.
- Tighten letter-spacing negatively as type grows: -0.2px at 17px, -1.4px at 64px.
- Let component screenshots bleed past the 1152px container to signal catalogue scale.

### Don't
- Don't use Averia Serif Libre for more than a single italic word in a headline.
- Don't introduce pure #000000 or pure #ffffff as page backgrounds; the darkest is Void #0a0a0d.
- Don't add coloured drop shadows or glows around buttons and cards.
- Don't set body copy in mono — monospace belongs only to terminal and diff blocks.
- Don't stack multiple blue CTAs in the same section; the second action is an outlined Void pill.
- Don't exceed 0.3s on any transition or animate layout dimensions on hover.

## Similar brands

- **Vercel** — Near-black canvas, tight medium-weight geometric sans and hairline-outlined cards.
- **Linear** — Same dark surface-step depth model with a single saturated blue accent and pill buttons.
- **shadcn/ui** — Shared zinc-based dark token ramp and 13px UI text with 6–8px radii.
- **Raycast** — Dark gallery of product screenshots bleeding full-width with glossy inset-highlight pills.
- **Resend** — Monochrome dark chrome punctuated by one vivid accent and mono-set terminal cards.

## Agent prompt

Build a dark developer-catalogue page: background #0a0a0d, card surfaces #0e0f10 and #09090b, text #f4f4f5, muted text #9b9aa6, borders rgba(63,63,70,0.6) plus white hairlines at 6–15% alpha. Type is General Sans at weight 500 only — 64px hero with -1.4px tracking, 17px subhead in muted grey, 13px nav and buttons — with exactly one word set in italic Averia Serif Libre coloured #4b73ff. Primary action is a #1436f4 pill (28px or 44px tall); secondary is a transparent pill with a 1px border. Cards get 8–12px radius, inset 1px rings, no drop shadows. Container 1152px, 4px base unit, 64px section gaps; transitions 0.15–0.3s on cubic-bezier(0.4,0,0.2,1).
