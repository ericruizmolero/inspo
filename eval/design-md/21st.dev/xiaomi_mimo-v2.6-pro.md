# 21ST (21st.dev) — DESIGN.md
> darkroom console for living interfaces

**Theme:** dark  
**Source:** https://21st.dev/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

21st.dev is a component marketplace built like a darkroom for interfaces: an Obsidian #09090B field with a faint blue light-leak behind the hero, where content is separated by 1px hairline rings rather than fills. General Sans sets every control, title and caption at weight 500 — 318 of 383 measured text nodes — so hierarchy comes from scale and alpha, never from bold. The text ladder is compressed from 11px to 18px and then detonates at 36px, 44px and a 64px display tracked to −0.022em, where one word — living — flips to Averia Serif Libre italic in Signal Blue #4B73FF. That blue is rationed to a single CTA pill, that single word, and a cyan-leaning #008FE9 selection hue. Preview thumbnails are hard-cornered, lit like studio shots against the black, with a ring of 8% white. Two inverted cards — warm Paper #F6F6F1 and Clay #C86A50 — are the only bright fields on the page, and ui-monospace appears solely where the product speaks in shell commands.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Obsidian | `#09090B` | neutral | Page canvas and card wells. The body measures oklch(0.141 0.004 285.824) ≈ #09090E — a rounding-level difference; use #09090B everywhere. Every surface sits directly on it. |
| Carbon | `#0E0F10` | neutral | Raised panel and preview-thumbnail surface — one step up from the canvas (545 measured nodes). The only 'elevation' this system owns. |
| Fog | `#F4F4FF` | neutral | Primary text on dark: headlines, card titles, button labels on dark fills. A near-white with a fractional cool cast (oklch 0.968 0.001 286) — never pure #FFFFFF on running text. |
| Ash | `#8F8FB1` | neutral | The single secondary text color: nav items, lead paragraphs (hero lead uses it), card metadata, counters. Its blue-violet cast is what makes the gray read as instrument-panel, not as dead gray. |
| Signal Blue | `#4B73FF` | accent | The rationed accent (oklch 0.485 0.291 264.1). Exactly three jobs: the primary pill fill, the italic display word 'living', and active/selected affordances. Never a background band, never a border. |
| Highlight Cyan | `#008FE9` | accent | The --color-selected token: text selection and range highlight only. Deliberately leans cyan so a selection never reads as a second brand blue. |
| Hairline | `#27272A` | neutral | Structure. Two recipes: #27272A at 60% (#27272A99) for control outlines and dividers, and #FFFFFF at 6–15% (#FFFFFF14 → #FFFFFF26) as inset rings on cards and panels. |
| Paper | `#F6F6F1` | accent | Inverted card surface — the warm cream 'real source' demo block. Text on it inverts to Obsidian with ui-monospace at Carbon. One of only two bright fields allowed. |
| Clay | `#C86A50` | accent | The second inverted card surface — terracotta terminal block. Always paired with Fog text and ui-monospace; never used for type or controls. |

## Typography

### General Sans — mono
Sole UI face — nav, buttons, card titles, captions, headlines. Its italic is unused; the display flourish comes from a different family entirely.
- **Fallback:** system-ui, -apple-system, Segoe UI, sans-serif
- **Weights:** 400, 500, 600
- **Sizes:** all
- **Line height:** 
- **Letter spacing:** 

### Averia Serif Libre — display
A hand-drawn, slightly wobbly serif reserved for exactly one word — 'living' — set italic inside the sans headline and tinted Signal Blue. Five measured uses; it is a signature, not a second voice.
- **Fallback:** serif
- **Weights:** 400
- **Sizes:** 64px display only
- **Line height:** 1.06
- **Letter spacing:** -0.022em

### ui-monospace — mono
Terminal blocks and install commands only ($ claude, ✓ path lists). Generous 2.1× line-height so command output reads as a transcript, not as code.
- **Fallback:** SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, monospace
- **Weights:** 500
- **Sizes:** 12.5px
- **Line height:** 26.25px
- **Letter spacing:** normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | General Sans | 500 | 11px | 16.5 | normal |
| body-sm | General Sans | 500 | 12px | 18 | normal |
| body | General Sans | 500 | 13px | 19.5 | normal |
| subtitle | General Sans | 500 | 17px | 25.5 | -0.2px |
| title-sm | General Sans | 600 | 18px | 26 | normal |
| title | General Sans | 500 | 36px | 42 | -0.4px |
| title-lg | General Sans | 500 | 44px | 50 | -1px |
| display | General Sans | 500 | 64px | 68 | -1.4px |

## Spacing and layout

**Density:** compact

- **Base unit:** 4px
- **Max page width:** 1152px
- **Section gap:** 64px
- **Card padding:** 12px 4px 0px
- **Element gap:** 12px

### Border radii

- **micro chip:** 6px
- **control / hover plate:** 6px
- **card:** 8px
- **panel:** 12px
- **feature block:** 16px
- **button / tab / filter chip:** 9999px (pill)
- **preview thumbnail:** 0px — hard corners, the counterweight to all those pills

## Elevation

None in the usual sense. Surfaces are separated by hairline rings: `inset 0 0 0 1px rgba(255,255,255,0.08)` on cards and `inset 0 0 0 1px #27272A99` on controls, plus `0 1px 3px rgba(0,0,0,0.07)` to seat thumbnails on the canvas. Drop shadows appear only on the one light mockup card (0 25px 50px -12px rgba(0,0,0,0.25)).

## Components

### Primary Pill Button
**Role:** Conversion action — one per view (Sign up, Browse components).

Signal Blue #4B73FF fill, #FFFFFF label, General Sans 500 at body (13px/19.5px) or subtitle (15px/22.5px) for the 44px variant. Pill radius. Height 28px / padding 0 16px (small) or 44px / padding 0 24px (large). Borderless. Hover brightens the fill over 200ms; press scales to 0.98 over 150ms; no shadow at any state.

### Secondary Button (outline & ghost)
**Role:** Everything that is not the conversion action.

Outline: Obsidian #09090B fill, Fog label, 1px #27272A99 border, pill, 44px tall, 0 24px padding, 15px/22.5px. Ghost: transparent, Ash label at 13px, 28px tall, 0 12px padding. Hover changes color only — label goes Fog (or border to #FFFFFF26) over 150ms; never gains a fill.

### Text Link (nav & inline)
**Role:** Navigation items and links inside copy.

General Sans 500 at body. Nav: Ash → Fog on hover over 150ms, padding 4px 8px with −8px negative margin and a 6px hover plate (background-color 200ms). Inline: Fog with a 1px Hairline underline at 3px offset; no color change on hover, the plate does the work.

### Component Preview Card
**Role:** The catalog unit — thumbnail plus metadata row.

0px radius, Carbon #0E0F10 media block with `inset 0 0 0 1px rgba(255,255,255,0.08)` and `0 1px 3px rgba(0,0,0,0.07)`. Metadata strip at 12px top padding: title in Fog at 80% (#F4F4FFCC) at 13px/18px, counter chip at 11px in Ash at 50% (#8F8FB173), padding 2px 4px, 6px radius. Hover lifts the whole card with a 300ms transform; the ring brightens to 15% white.

### Header Bar
**Role:** Persistent chrome, identical on every route.

Sticky, transparent over the Obsidian canvas, 1152px content row at ~48px height, 12px item gaps. Wordmark left in Fog; nav items centered in Ash at body; right cluster is a ghost 'Log in' plus a 28px Signal Blue pill. No divider or blur at rest — the hero light-leak passes straight through it.

## Motion

Motion is a thin instrument polish over a static layout. Color and opacity resolve in 150–200ms on cubic-bezier(0.4, 0, 0.2, 1); the only longer move is the 300ms cubic-bezier(0.23, 0.4, …) transform used for card lift and scroll reveals (the page is scroll-animated). Press feedback is a 150ms scale to 0.98. Nothing loops except the embedded preview thumbnails.

## Layout

Single centered 1152px column against the Obsidian canvas, with one full-bleed exception: the component thumbnails strip runs edge-to-edge and is cropped by the viewport, so the row reads as infinite. Vertical rhythm is 64px between sections, 24px inside blocks, 12px between sibling controls.

## Imagery

Preview thumbnails are raw screenshots of the components themselves, unframed and hard-cornered, lit brightly against the black so they behave like light sources. The two inverted demo cards use Paper #F6F6F1 and Clay #C86A50 with terminal text. No lifestyle photography, no illustration, no device mockups.

## Do and don't

### Do
- Set every label, link and headline at weight 500 and build hierarchy from scale + alpha (Fog → Fog 80% → Ash → Ash 50%).
- Separate surfaces with 1px rings only: #27272A99 on controls, rgba(255,255,255,0.08–0.15) inset on cards.
- Ration Signal Blue #4B73FF to one pill, one display word, and active states per view; use #008FE9 for selection so the two never collide.
- Keep the corner logic strict: pill for anything in a control row, 8/12/16px for panels, 0px for preview thumbnails.
- Track display type at −0.022em (−1.4px at 64px) and leave all UI type at normal tracking.
- Set terminal content in ui-monospace at 12.5px with ~2.1 line-height so output reads as a transcript.

### Don't
- Don't introduce 700 for emphasis — 600 is the ceiling and appears only on compact headings; use scale instead.
- Don't round or shadow the preview thumbnails; they must stay hard-cornered against the pill-heavy UI.
- Don't spread Averia Serif Libre beyond one short italic phrase per page — never in body, buttons or labels.
- Don't add a third gray tier or pure #FFFFFF body text; Ash #8F8FB1 and Fog #F4F4FF are the entire text range.
- Don't fill large areas with Signal Blue, and never stack a blue button beside blue links in one block.
- Don't use the Paper/Clay inversions for CTAs — they are demo-card surfaces only, and at most two appear per page.

## Similar brands

- **Vercel** — Same hard-cornered preview thumbnails on near-black with hairline rings and one rationed accent.
- **shadcn/ui** — Identical dark zinc foundation — #09090B canvas, #27272A borders, weight-500 UI type.
- **Linear** — Compressed type scale detonating into one tracked display step, cool blue-gray secondary text.

## Agent prompt

Build for 21st.dev as a darkroom: canvas #09090B, panels #0E0F10, structure made only of 1px rings (#27272A99 on controls, rgba(255,255,255,0.08) inset on cards) — no shadows except one light mockup card. Use General Sans at weight 500 for absolutely everything (600 only on 18px compact headings), type scale 11/12/13/17/18/36/44/64px with display tracked −0.022em and card titles at 13px/18px in Fog at 80%. Text colors are exactly two: Fog #F4F4FF and Ash #8F8FB1 with alpha steps at 80%, 50%, 35%. Signal Blue #4B73FF appears three times per view at most (one pill CTA, the italic word 'living', active states); selection is #008FE9. Buttons are always pill (9999px), 28px tall with 0 16px padding or 44px tall with 0 24px; preview thumbnails are always 0px radius. Averia Serif Libre italic is allowed for one word only. Terminal blocks use ui-monospace 12.5px/26px. Motion: 150–200ms cubic-bezier(0.4,0,0.2,1) for color/opacity, 300ms transform for card lift and scroll reveals, 150ms scale-0.98 press. Layout is a 1152px centered column with 64px section gaps and one full-bleed, viewport-cropped row of thumbnails.
