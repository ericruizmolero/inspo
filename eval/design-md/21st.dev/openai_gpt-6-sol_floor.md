# 21st — DESIGN.md
> electric gallery after dark

**Theme:** dark  
**Source:** https://21st.dev/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

21st presents a component library as a living exhibition rather than a conventional software catalog. A near-black #09090b foundation opens into a broad blue glow behind the hero, while large, edge-to-edge previews supply the visual variety. The headline is unusually spacious: 64px General Sans at weight 500, interrupted by one blue, italic Averia Serif Libre word that makes “living” feel expressive without changing the rest of the system. Supporting copy and navigation recede into #8f8f99; the principal action is a small, unmistakable #0033ff pill. Below the roomy introduction, the interface becomes compact and systematic, using 13px labels, short category tabs, tight metadata, and closely arranged previews. Later surfaces introduce warm terracotta and cream, with brighter pink and orange reserved for showcase moments. Borders and shadows remain restrained so the examples, not their containers, carry the spectacle. The overall effect is polished, technical, and deliberately animated without making the navigation complicated.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Midnight Ink | `#09090b` | neutral | The primary page background and dark surface used to keep the gallery visually continuous. |
| Soft Charcoal | `#0e0f10` | neutral | A subtly raised dark section and preview surface. |
| Graphite Line | `#27272a` | neutral | A quiet outline for controls and contained interfaces. |
| Mist Gray | `#8f8f99` | neutral | Secondary copy, inactive navigation, and supporting labels. |
| Gallery White | `#f4f4f5` | neutral | Primary text against dark surfaces. |
| Electric Blue | `#0033ff` | brand | The decisive call-to-action color for signup and browsing. |
| Glow Blue | `#4b73ff` | brand | A softer blue used in atmospheric glow and expressive emphasis. |
| Terracotta | `#c86a50` | accent | A warm background for a contrasting showcase surface farther down the page. |
| Warm Paper | `#f6f6f1` | neutral | A light showcase surface that breaks up the dark page rhythm. |
| Neon Pink | `#ff66f4` | accent | A vivid color within the site's more expressive showcase treatments. |
| Hot Orange | `#fe7b02` | accent | A second high-energy showcase color, not a default control color. |

## Typography

### General Sans — body
Used for navigation, explanatory text, buttons, labels, and nearly all headings. Weight 500 does most of the work; scale and contrast create hierarchy instead of frequent bold weights.
- **Fallback:** system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
- **Weights:** 400, 500, 600
- **Sizes:** 11-64px · approximately 10 values
- **Line height:** 1.06 for display; approximately 1.4-1.6 for smaller text
- **Letter spacing:** normal for most text; -1.408px for the display heading

### Averia Serif Libre — display
Reserved for the expressive italic word in the main headline rather than used as a second general-purpose text face. That single handwritten-feeling interruption is the recognisable typographic signature.
- **Fallback:** Georgia, Times New Roman, serif
- **Weights:** 400
- **Sizes:** approximately 64px · 1 prominent value
- **Line height:** approximately 1.06
- **Letter spacing:** display-tight

### ui-monospace — mono
Used for command-line and code-oriented demonstrations. It distinguishes executable output from the polished sans-serif marketing interface.
- **Fallback:** SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, monospace
- **Weights:** 500
- **Sizes:** 12-13px · 2 values
- **Line height:** approximately 1.5-2.1
- **Letter spacing:** normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | General Sans | 500 | 11px | 1.5 | normal |
| body-sm | General Sans | 500 | 13px | 1.5 | normal |
| body | General Sans | 500 | 16px | 1.5 | normal |
| subtitle | General Sans | 500 | 17px | 1.5 | -0.204px |
| title-sm | General Sans | 500 | 36px | 1.15 | -0.968px |
| title | General Sans | 500 | 44px | 1.1 | -0.968px |
| display | General Sans | 500 | 64px | 1.06 | -1.408px |

## Spacing and layout

**Density:** comfortable

- **Base unit:** 4px
- **Max page width:** 1152px
- **Section gap:** 64px
- **Card padding:** 12px for metadata; previews are edge-to-edge
- **Element gap:** 8-24px

### Border radii

- **Small controls and navigation states:** 6px
- **Contained interface panels:** 8px
- **Large showcase panels:** 12px
- **Call-to-action buttons:** 9999px
- **Gallery preview frames:** 0px

## Elevation

Depth is mostly supplied by background changes, expansive color glow, and the previews themselves. Gallery frames use a restrained inset outline and small shadow: 0 0 0 1px #0000000a inset, 0 1px 3px #00000012. Avoid heavy floating-card shadows in the main catalog.

## Components

### Primary button
**Role:** Directs visitors toward signup or browsing.

Electric Blue background, Gallery White text, pill radius; 28px high with 16px horizontal padding in the header, or 44px high with 24px horizontal padding for larger actions.

### Secondary button
**Role:** Offers a quieter action beside the primary conversion path.

Midnight Ink background, Gallery White text, Graphite Line 1px border, pill radius; 44px high with 24px horizontal padding. Keep it visually subordinate to Electric Blue.

### Link
**Role:** Handles navigation and low-emphasis category choices.

Mist Gray body-sm text with a transparent default background; navigation links have 4px 8px padding and a 6px radius. Emphasize the active category with a subtle surface fill rather than a bright underline.

### Card
**Role:** Makes a live component example the primary clickable object.

Edge-to-edge preview with a square outer frame, minimal inset outline and shadow; place compact labels and metadata below rather than padding the artwork. Allow the preview's own colors and motion to vary.

### Header
**Role:** Keeps the brand, catalog routes, and account actions accessible without competing with the gallery.

A slim, transparent row within the centered container: logo at left, muted links in the middle, ghost login and a small Primary button at right. Use generous space between groups rather than a visible divider.

## Motion

Use short color changes around 150ms, background and opacity changes around 200ms, and preview transforms around 300ms with restrained cubic-bezier easing. Some examples and lower-page elements animate on scroll; keep ordinary navigation steady and let motion belong chiefly to the showcased work.

## Layout

Center editorial text and navigation within a 1152px container, but let the gallery extend broadly across the viewport. Start with a large, left-aligned headline and a compact paragraph, leave substantial vertical breathing room, then switch to a tight category row and a horizontally abundant preview grid. Reuse 8px, 12px, and 24px internal intervals; separate major groups by roughly 64px.

## Imagery

The imagery is the product: numerous live interface previews rather than stock photography or a unified illustration set. Show diverse dark, light, typographic, and animated examples in large cropped frames; preserve their individual visual identities while the surrounding catalog remains restrained.

## Do and don't

### Do
- Use Midnight Ink as the stable canvas and concentrate blue glow behind major introductory content.
- Set most interface text in General Sans at weight 500.
- Use Averia Serif Libre sparingly for one italic, highlighted display phrase.
- Let preview artwork run to the edges of square gallery frames.
- Keep navigation, labels, and metadata small and muted against the large heading.
- Use Electric Blue for unmistakable primary actions, not every interactive element.

### Don't
- Do not turn every gallery example into a padded, rounded dashboard card.
- Do not apply the serif accent to paragraphs, navigation, or multiple headings.
- Do not replace the dark canvas with continuous terracotta, cream, pink, or orange sections.
- Do not make all category links as bright as the primary call to action.
- Do not use heavy shadows to separate the main catalog items.
- Do not force one color treatment onto the diverse live previews.

## Similar brands

- **Vercel** — Dark developer-focused presentation with restrained chrome and prominent product demonstrations.
- **Linear** — Precise typography, muted navigation, and atmospheric lighting over dark surfaces.
- **shadcn/ui** — A code-oriented component catalog that lets examples remain the central content.
- **Framer** — Editorial product presentation built around expressive, motion-rich interface previews.

## Agent prompt

Build a dark, gallery-led interface for 21st. Use #09090b as the canvas, #f4f4f5 for primary text, #8f8f99 for supporting text, and #0033ff for pill-shaped primary actions. Set typography in General Sans, mainly weight 500; make the large, tight headline distinctive with one blue italic Averia Serif Libre word. Center the navigation and copy within 1152px, then let live component previews stretch broadly across the viewport in minimally framed, square-edged cards. Keep labels compact, spacing deliberate, and chrome quiet. Add a soft blue atmospheric glow and reserve brighter warm colors for showcase content.
