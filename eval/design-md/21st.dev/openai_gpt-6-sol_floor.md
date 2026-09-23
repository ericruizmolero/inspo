# 21st — DESIGN.md
> blue light over dark interfaces

**Theme:** dark  
**Source:** https://21st.dev/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

21st presents a vast component library as a curated exhibition rather than a conventional documentation site. A near-black #09090b canvas gives way to a broad blue glow behind the first gallery, while large, uncropped interface previews supply most of the page’s visual variety. General Sans keeps navigation, descriptions, and controls quiet at medium weight; the 64px headline makes the scale of the library feel immediate. Its single expressive interruption is “living,” set in Averia Serif Libre and colored blue. Text moves from soft #f4f4f5 to muted #a1a1aa, reserving the stronger #0033ff for actionable emphasis. Navigation is small and restrained, with a compact pill-shaped sign-up button. Category choices sit between the introduction and the previews, which read as edge-to-edge artifacts rather than heavily framed cards. Generous vertical space around the opening statement contrasts with the dense inventory below, letting the examples demonstrate the product without imposing one visual style on them.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Night | `#09090b` | neutral | The dominant page background and the dark base behind navigation and galleries. |
| Hairline | `#27272a99` | neutral | A restrained divider and control outline rather than a prominent frame. |
| Muted Zinc | `#a1a1aa` | neutral | Secondary descriptions, navigation labels, and quieter metadata. |
| Soft White | `#f4f4f5` | neutral | Headlines and primary text, avoiding the glare of pure white across large areas. |
| Action Blue | `#0033ff` | brand | The measured solid accent for prominent sign-up and browse actions. |
| Gallery Blue | `#4b73ff` | accent | A brighter blue associated with the expressive headline treatment and gallery atmosphere; it is not the default button color. |

## Typography

### General Sans — display
The large sans-serif headline establishes the hierarchy with scale rather than boldness. Its medium weight and tight tracking leave room for the contrasting serif word.
- **Fallback:** system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
- **Weights:** 500
- **Sizes:** 36–64px · 3 values
- **Line height:** 1.06 for the 64px opening headline
- **Letter spacing:** -1.4px at 64px

### Averia Serif Libre — display
An italic serif treatment singles out “living” within the opening headline. Keep it an occasional editorial accent, not a second font for routine headings.
- **Fallback:** Georgia, Times New Roman, serif
- **Weights:** 400
- **Sizes:** approximately 64px · 1 prominent treatment
- **Line height:** Aligned to the surrounding headline
- **Letter spacing:** Not reliably measured

### General Sans — body
General Sans carries descriptions, labels, navigation, and controls. Weight 500 does most of the work; stronger weights are exceptional rather than the basis of the hierarchy.
- **Fallback:** system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
- **Weights:** 400, 500, 600
- **Sizes:** 11–18px · approximately 8 values
- **Line height:** 1.5 for primary body copy; approximately 1.35–1.5 for compact UI
- **Letter spacing:** Mostly normal; approximately -0.2px on 17px copy

### ui-monospace — mono
Monospace distinguishes commands and generated-file output inside product examples. It should not replace the sans-serif used for general interface labels.
- **Fallback:** SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, monospace
- **Weights:** 500
- **Sizes:** 12–13px · 2 values
- **Line height:** Approximately 2 in terminal-style examples
- **Letter spacing:** Normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | General Sans | 500 | 12px | 1.5 | normal |
| body-sm | General Sans | 500 | 13px | 1.5 | normal |
| body | General Sans | 500 | 16px | 1.5 | normal |
| subtitle | General Sans | 500 | 17px | 1.5 | -0.2px |
| title-sm | General Sans | 500 | 18px | 1.35 | normal |
| title | General Sans | 500 | 36px | 1.15 | -1px |
| title-lg | General Sans | 500 | 44px | 1.1 | -1px |
| display | General Sans | 500 | 64px | 1.06 | -1.4px |

## Spacing and layout

**Density:** comfortable

- **Base unit:** 4px
- **Max page width:** 1152px
- **Section gap:** 64px
- **Card padding:** 0px for preview imagery; approximately 12px for accompanying details
- **Element gap:** 12px, with 24px between larger groups

### Border radii

- **Navigation links and compact controls:** 6px
- **Selected category controls:** 8px
- **Inset panels:** 12px
- **Primary and secondary action pills:** 9999px
- **Gallery preview edges:** 0px

## Elevation

Depth comes primarily from the dark-to-blue atmospheric background and contrasting preview content. Gallery previews have only a subtle inset 0 0 0 1px #0000000a and 0 1px 3px #00000012; avoid broad floating shadows on the main page.

## Components

### Primary button
**Role:** Directs visitors to sign up or browse the library.

Action Blue background, Soft White label, pill radius, and body-sm or body text. Use a 28px-high compact header version with 16px horizontal padding, or a 44px-high standard version with 24px horizontal padding; shift color subtly on hover.

### Secondary button
**Role:** Provides a quieter alternative such as logging in or joining from a contrasting area.

Transparent Night background and Muted Zinc label for the 28px-high header version, with 12px horizontal padding. The larger 44px variant uses Soft White text, 24px horizontal padding, and a Hairline border; both retain the pill radius.

### Link
**Role:** Supports navigation and category selection without competing with primary actions.

Muted Zinc body-sm text; header links have 4px vertical and 8px horizontal padding and a 6px radius. Active categories receive a restrained lighter surface treatment; hover increases text contrast rather than adding a loud underline.

### Card
**Role:** Makes each component preview an accessible gallery entry.

Use an edge-to-edge preview with square outer corners, no image padding, and only the subtle inset edge treatment. Keep any title or metadata compact beneath the preview; preserve each example’s native visual style.

### Header
**Role:** Keeps brand, library destinations, and account actions available without dominating the page.

Align content within the 1152px container; place the logo left, small links near center, and account actions right. Maintain a visually quiet Night background and compact control heights.

## Motion

Use restrained color changes around 150ms, background and opacity changes around 200ms, and preview transforms around 300ms. Smooth easing is appropriate; scroll animation exists, but it should reveal or emphasize content without disturbing the readable gallery grid.

## Layout

Center primary content in a 1152px maximum-width container with approximately 24px side inset. Keep the introduction left-aligned and spacious, then move through a horizontal category row into a dense, multi-column gallery. Preview images may visually reach toward the viewport edges, but navigation and copy retain consistent alignment.

## Imagery

The primary imagery is live interface and component previews, not stock photography. Show varied examples at useful scale with minimal cropping or decorative framing; their differing colors and styles are the subject of the gallery. A diffuse blue backdrop unifies the opening view without recoloring the previews.

## Do and don't

### Do
- Use Night as the stable canvas and reserve Action Blue for clear actions.
- Set the opening statement large in medium-weight General Sans with tight tracking.
- Use Averia Serif Libre sparingly for one expressive word or similarly deliberate accent.
- Keep supporting copy in Muted Zinc and labels compact.
- Let component previews retain their own colors and edge-to-edge compositions.
- Keep navigation and category controls low-profile with subtle active states.

### Don't
- Do not turn the entire gallery into uniformly blue cards.
- Do not make every heading serif or italic.
- Do not replace medium-weight hierarchy with heavy bold text throughout.
- Do not add thick borders, large radii, or deep shadows to preview tiles.
- Do not use pure white for every paragraph and metadata label.
- Do not crowd the opening headline with extra controls or decorative illustrations.

## Similar brands

- **Vercel** — Dark developer-product presentation with compact navigation and restrained interface chrome.
- **Linear** — Careful typographic hierarchy, muted neutrals, and atmospheric color against near-black.
- **shadcn/ui** — Developer-facing component presentation that lets interface examples carry the visual detail.
- **Framer** — A visually varied gallery organized within a polished, minimal product shell.

## Agent prompt

Build a dark component-library interface for 21st on a #09090b canvas. Use General Sans, mostly at weight 500, with a spacious 64px opening headline; set only the word “living” in italic Averia Serif Libre and bright blue. Keep copy #a1a1aa, primary text #f4f4f5, and important pill actions #0033ff. Constrain navigation and copy to a 1152px container. Follow the introduction with quiet category controls and a dense gallery of large, nearly frameless interface previews. Let the previews provide variety; avoid heavy shadows, uniform card styling, and excess decoration.
