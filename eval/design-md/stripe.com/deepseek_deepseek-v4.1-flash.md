# Stripe — DESIGN.md
> iridescent gradient rails, quiet grid

**Theme:** light  
**Source:** https://stripe.com/en-es · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Stripe's marketing system is a white financial grid lit from one corner by a full-bleed spectral gradient that never appears in the token set — everything else is disciplined monochrome. Soehne-variable carries the entire page at weight 300: 48px hero lines at 1.15 with -0.02em tracking, 32px section statements, 26px bento titles and 16px body all set in the same light cut, so the only assertive thing on the page is the iris button. Copy runs three depths of navy — near-black headlines, slate body, steel-grey descriptive passages. Surfaces step from pure white to a pale #F8FAFD panel to a deep #0D1738 midnight band, separated by 1px #E5EDF5 hairlines rather than shadows; real elevation is reserved for floating product screenshots on layered blue-tinted shadows. Corners stay tight — 4px on controls, 6px on cards — and the grid holds at 1266px.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Paper White | `#FFFFFF` | neutral | Default page surface and the ground of every card, browser mock and header. Also the label color inside solid iris buttons. |
| Cloud Panel | `#F8FAFD` | neutral | Softly tinted card and program-panel surface (Stripe Startups, Atlas); reads as white until it sits next to Paper White. |
| Hairline Mist | `#E5EDF5` | neutral | The only divider in the system: 1px section rules, header underline, card outlines and table separators. Also used as a large-area wash behind dark content. |
| Midnight Ledger | `#0D1738` | neutral | Deep dark band surface for full-width contrast sections; never used for text. |
| Ink Navy | `#061B31` | neutral | Primary text — all headings, nav labels and high-emphasis copy. |
| Slate Copy | `#50617A` | neutral | Secondary body text: section headers, footer links, supporting paragraphs and stat descriptions. |
| Steel Caption | `#64748D` | neutral | Muted descriptive register for large 32px explanatory lines and legal micro-copy; one step lighter than Slate Copy and deliberately lower contrast. |
| Signal Iris | `#533AFD` | accent | The single brand accent. Solid button fills, all inline callout links, the Sign in label, and the gradient-free counterweight to the hero artwork. |
| Lavender Hairline | `#B9B9F9` | accent | Outline stroke for iris buttons on light surfaces — the only permitted border color on an interactive tinted control. |

## Typography

### sohne-var — display
Every headline and large statement. Weight 300 is non-negotiable — the hero, the 32px section lines and the bento titles are all the same light cut, which is the site's signature decision.
- **Fallback:** -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif
- **Weights:** 300
- **Sizes:** 48px, 32px, 26px, 22px
- **Line height:** 1.1 to 1.15
- **Letter spacing:** -0.02em

### sohne-var — ui
Body paragraphs and footer text at 300; buttons, nav triggers and links at 400. The page never goes bold — weight 400 is the ceiling and it is reserved for anything clickable, which is how interactivity is signalled instead of color alone.
- **Fallback:** -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif
- **Weights:** 300, 400
- **Sizes:** 18px, 16px, 14px, 12px
- **Line height:** 1.4
- **Letter spacing:** 0 to 0.1px

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | sohne-var | 300 | 12px | 1.4 | 0 |
| body-sm | sohne-var | 300 | 14px | 1.43 | 0 |
| body | sohne-var | 300 | 16px | 1.4 | 0 |
| subtitle | sohne-var | 300 | 18px | 1.4 | 0 |
| title-sm | sohne-var | 300 | 22px | 1.2 | -0.01em |
| title | sohne-var | 300 | 26px | 1.12 | -0.01em |
| title-lg | sohne-var | 300 | 32px | 1.1 | -0.02em |
| display | sohne-var | 300 | 48px | 1.15 | -0.02em |

## Spacing and layout

**Density:** airy

- **Base unit:** 8px
- **Max page width:** 1266px
- **Section gap:** 64px
- **Card padding:** 24px
- **Element gap:** 8px

### Border radii

- **buttons, nav triggers, small controls:** 4px
- **cards, panels, floating product graphics:** 6px
- **large media blocks (used sparingly):** 16px

## Elevation

Almost none by default — sections are separated by 1px Hairline Mist rules, not shadow. Elevation is reserved for floating product mockups: a blue-tinted layer like rgba(50, 50, 93, 0.12) 0px 16px 32px 0px, optionally paired with rgba(23, 23, 23, 0.06) 0px 3px 6px 0px for edge definition. Never apply a shadow to a layout container.

## Components

### Primary Button
**Role:** the single solid action

Signal Iris background, Paper White label, 4px radius, no border, no shadow. Label in sohne-var 16px/1 weight 400 with a trailing '›' glyph. Padding 16px 24px (height ≈48px); the compact header variant is 14px/1, padding 12px 20px, height 40px. Transition background-color 0.3s cubic-bezier(0.25, 0.1, 0.25, 1); darken the fill slightly on hover and keep the label white at all times.

### Outline Button
**Role:** secondary action, always paired with the primary

Transparent or rgba(255, 255, 255, 0.65) background over the gradient, Signal Iris label, 1px solid Lavender Hairline border, 4px radius. sohne-var 16px/1 weight 400, padding 16px 24px. The border is the only decoration — no shadow, no fill change on hover, just the border stepping to Signal Iris.

### Callout Link
**Role:** inline navigation inside copy and cards

Signal Iris text in sohne-var 16px weight 400, no underline at rest, underline on hover, color transition 0.3s cubic-bezier(0.25, 0.1, 0.25, 1). Can carry a trailing arrow for 'View services' style links. Footer and muted-context variants use Slate Copy at weight 300 instead of iris.

### Paper Card
**Role:** product graphic, bento tile and program panel

Paper White or Cloud Panel background, 6px radius, optional 1px Hairline Mist border; content padding 24px and internal 8-16px stacks. Shadowed variants use the blue-tinted elevation stack. Title inside is sohne-var 26px weight 300 Ink Navy at 1.12; description is 16px weight 300 Slate Copy.

### Header Bar
**Role:** persistent top navigation

Paper White background, 1px Hairline Mist bottom border, full-bleed at 1440px with content held to the 1266px container. Left cluster: wordmark, then nav triggers in sohne-var 14px/1 weight 400 Ink Navy with 8px gaps and 12px vertical padding, no background. Right cluster: a borderless iris-text 'Sign in' at 14px/1 weight 400 on Paper White, followed by the compact Primary Button 'Contact sales' with 16px gap between them.

## Motion

Uniform and short. Color, fill, stroke and background-color all run 0.3s cubic-bezier(0.25, 0.1, 0.25, 1); opacity runs 0.15s linear. Larger transforms (card reveals, diagram shifts) use 0.6-0.8s cubic-bezier(0.165, 0.84, 0.44, 1) or cubic-bezier(0.16, ...) — never a bounce, never a spring. No scroll-triggered animation on the page.

## Layout

Centered 1266px container with generous 64px vertical section rhythm; prose columns clamp to roughly 818px so 32-48px lines break at three or four words per line. Hero is a left-aligned text block on the left half with the full-bleed iridescent gradient occupying the right, and a horizontal logo rail beneath it separated by a Hairline Mist rule. Below, content alternates Paper White, Cloud Panel and Midnight Ledger bands, each opened by a 32px weight-300 statement in Ink Navy with a Steel Caption continuation clause.

## Imagery

One saturated multicolor gradient (pink, violet, orange, blue) as the hero artwork — it is the only chroma in the system and never resolves into a token. Everything else is product UI: floating white browser and dashboard mockups with 6px corners and blue-tinted shadows, plus white logo marks at small sizes on a plain white rail.

## Do and don't

### Do
- Set every heading and paragraph in sohne-var weight 300; use weight 400 only for buttons, nav triggers and links.
- Track 32px and 48px text at -0.02em and 22-26px at -0.01em; leave 16px and below at 0 to 0.1px.
- Separate sections with 1px #E5EDF5 rules and surface changes (Paper White → Cloud Panel → Midnight Ledger) rather than shadows.
- Pair every solid Signal Iris button with an outline sibling so the hierarchy reads at a glance.
- Keep control radius at 4px and card radius at 6px; add 16px only on large media.
- Send secondary copy down the navy ladder: #061B31 headings, #50617A body, #64748D for large explanatory lines.

### Don't
- Never use weight 500 or above — the system has no bold.
- Never introduce a second accent hue; Signal Iris is the only chromatic UI color, and the hero gradient is decoration, not a palette.
- Don't fill cards or sections with Signal Iris; it belongs on controls, links and labels only.
- Don't round buttons past 6px or use pill shapes.
- Don't apply shadows to layout containers or section wrappers — reserve the blue-tinted stack for floating product graphics.
- Don't use Midnight Ledger for text, and don't set body copy in the same near-black as headings.

## Similar brands


## Agent prompt

Build in the style of Stripe: a white, hairline-ruled grid with one saturated gradient artwork and almost no color elsewhere. Load sohne-var and set everything at weight 300 except buttons, nav triggers and links, which use 400 — never bold. Use a 1266px container with 64px section gaps and ~818px prose columns. Type: 48/1.15/-0.02em display, 32/1.1/-0.02em title-lg, 26/1.12/-0.01em title, 16/1.4 body, 14/1.43 body-sm. Colors: #FFFFFF surface, #F8FAFD panel, #E5EDF5 hairline, #0D1738 dark band, #061B31 headings, #50617A body, #64748D large muted lines, #533AFD accent, #B9B9F9 outline stroke. Buttons: 4px radius, 16px 24px padding, iris fill with white label for primary, transparent with 1px Lavender Hairline and iris label for outline. Cards: 6px radius, white or Cloud Panel, hairline border, blue-tinted 0 16px 32px shadow only when floating. Transitions 0.3s cubic-bezier(0.25, 0.1, 0.25, 1).
