# Vocabbie — DESIGN.md
> soft daylight for language learning

**Theme:** light  
**Source:** https://www.vocabbie.app/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Vocabbie presents language learning as quick, approachable, and unusually calm. A centered mascot and wordmark sit above a two-line promise, with generous white space giving the message more authority than any decorative device. The 68px system-sans headline uses weight 600 and tight tracking; a muted 21px explanation and small proof points lead to dark, pill-shaped store links. A phone preview introduces the product without crowding the first screen. Across the longer page, warm #faf8f5 and pale blue #eff4ff surfaces soften white #ffffff, while #222326 text keeps the interface legible and grounded. Cards use broad 28px corners rather than heavy borders or shadows. The typography is primarily -apple-system, with Inter and Segoe UI in its fallback stack; medium and semibold weights establish hierarchy without a separate display face. Faint pastel gradients and restrained product imagery add playfulness, but the layout remains orderly and practical.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Deep Ink | `#222326` | neutral | Primary text and the near-black visual anchor for prominent controls. |
| Soft Slate | `#52525b` | neutral | Secondary copy and quiet navigation links. |
| Distant Gray | `#8b8c8f` | neutral | Tertiary labels and deliberately subdued supporting text. |
| Warm Hairline | `#e7e4de` | neutral | Subtle separation on warm surfaces without prominent outlines. |
| Soft Stone | `#f5f3ef` | neutral | Inset surfaces and quieter secondary controls. |
| Oat Paper | `#faf8f5` | neutral | Warm section backgrounds that break up the long page. |
| Paper White | `#ffffff` | neutral | The opening canvas and clean card surfaces. |
| Mist Blue | `#eff4ff` | accent | Cool, low-contrast background relief around product content. |
| Contact Blue | `#2563eb` | accent | A sparingly used interactive accent, notably for the contact link. |

## Typography

### -apple-system — body
The system sans carries headings, copy, controls, and labels. Weight 600 does most of the hierarchy work; the largest headings gain character from tight tracking rather than a decorative typeface.
- **Fallback:** system-ui, Inter, Segoe UI, sans-serif
- **Weights:** 400, 500, 600, 700
- **Sizes:** 12–68px · 7 principal values
- **Line height:** 1–1.5, tighter for large headings
- **Letter spacing:** normal for copy; approximately -0.03em for major headings

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | -apple-system | 500 | 12px | 1.5 | normal |
| body-sm | -apple-system | 400 | 14px | 1.5 | normal |
| body | -apple-system | 400 | 16px | 1.5 | normal |
| subtitle | -apple-system | 400 | 21px | 1.3 | normal |
| title-sm | -apple-system | 600 | 26px | 1.1 | -0.5px |
| title | -apple-system | 600 | 48px | 1.05 | -1.5px |
| display | -apple-system | 600 | 68px | 1 | -2px |

## Spacing and layout

**Density:** airy

- **Base unit:** 8px
- **Max page width:** 1024px
- **Section gap:** 112px
- **Card padding:** 22px 24px
- **Element gap:** 8px, 16px, or 24px

### Border radii

- **Search input:** 8px
- **Secondary store link:** 16px
- **Card:** 28px
- **Primary store button:** 999px

## Elevation

Page cards are largely flat: use surface changes and occasional Warm Hairline borders instead of routine shadows. Small embedded interface elements may use 0 1px 2px #1c264c0d; floating product details can use 0 14px 30px -12px #1c264c4d, 0 2px 6px #1c264c0f.

## Components

### Primary button
**Role:** Sends visitors to an app store.

Deep Ink fill, Paper White label, pill radius, and body text at weight 600; 13px 24px padding with a store icon beside the label. Keep the hover change restrained.

### Secondary button
**Role:** Offers a quieter store link elsewhere on the page.

Soft Stone fill, Deep Ink label, 16px radius, and body-sm text at weight 500; 10px 16px padding. Do not give it the visual weight of the primary download links.

### Input
**Role:** Filters the language list.

A lightly tinted field with an 8px radius, 1px cool-gray border, and 8px 10px padding; use a caption-scale label or placeholder. The measured field tint is #f7f7f8, a local control surface rather than a page-wide palette token.

### Link
**Role:** Provides low-emphasis navigation or a direct contact action.

Use Soft Slate for ordinary text links, shifting toward Deep Ink on hover; reserve Contact Blue and weight 600 for the contact action. Avoid button styling on inline links.

### Card
**Role:** Groups a product explanation or embedded interface detail.

Paper White surface, 28px radius, and approximately 22px 24px padding. Keep the default state flat; use surrounding background contrast rather than a heavy outline.

## Motion

Favor modest color changes over conspicuous movement: link colors transition in roughly 200–300ms, transforms in about 280ms, and scroll-revealed opacity in about 600ms ease-out. Keep headlines, reading copy, and primary calls to action stable.

## Layout

Build a long, vertically paced landing page within a roughly 1024px content container. Center the opening identity, headline, copy, proof points, and paired store links; keep the introductory copy narrower than the container. Use approximately 112px vertical section padding and alternate white, warm paper, and pale blue fields as content moves into cards and product previews.

## Imagery

Lead with a small illustrated mascot and polished phone or app-interface imagery, not lifestyle photography. Product visuals can carry faint pastel glow and occasional floating details; leave ample blank space around them.

## Do and don't

### Do
- Center the opening message and let its 68px semibold headline dominate.
- Use weight 600 and tight tracking for major headings, with regular-weight muted explanatory copy.
- Keep store calls to action dark, paired, icon-led, and fully pill-shaped.
- Alternate Paper White with Oat Paper and occasional Mist Blue to pace the long page.
- Give product cards generous corners and rely on surface contrast before adding elevation.
- Use the mascot and app previews as the primary source of personality.

### Don't
- Do not replace the calm white opening with a saturated full-bleed hero.
- Do not introduce a decorative display font or make every heading weight 700.
- Do not turn Contact Blue into the default color for every button and heading.
- Do not crowd the centered opening with navigation, badges, or dense card grids.
- Do not add strong shadows to ordinary cards.
- Do not substitute generic stock photography for product-interface imagery.

## Similar brands

- **Quizlet** — Clear study-tool messaging, restrained controls, and product-led explanation.
- **Memrise** — Friendly language-learning presentation built around approachable app previews.
- **Lingvist** — A quiet, typography-led approach to explaining language-learning benefits.
- **Drops** — Playful language-learning identity paired with prominent mobile-app calls to action.

## Agent prompt

Create a calm, product-led landing page for Vocabbie. Use a white opening with a faint pastel glow, a centered mascot and wordmark, and a large, tightly tracked semibold system-sans promise. Follow it with muted explanatory copy, small proof points, and two near-black pill-shaped store links. Keep the layout airy within a 1024px container. Pace later content with #faf8f5 and #eff4ff backgrounds, white 28px cards, and polished phone-interface imagery. Use blue only for occasional interactive emphasis; avoid heavy card shadows.
