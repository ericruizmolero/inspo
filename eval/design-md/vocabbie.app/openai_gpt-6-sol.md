# Vocabbie — DESIGN.md
> soft daylight for language learning

**Theme:** light  
**Source:** https://www.vocabbie.app/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Vocabbie presents language learning as approachable, quick, and quietly polished rather than academic or technical. A centered mascot wordmark sits above an unusually direct two-line headline, set in the system sans stack at 68px and weight 600; the tight line height and negative tracking give it presence without making it heavy. A softer 21px explanation, a tiny line of practical claims, and two dark, pill-shaped store links keep the first screen focused on getting the app. The predominantly white #ffffff canvas gains warmth from #faf8f5 sections and a faint lavender-pink glow behind the opening content; cool #eff4ff surfaces provide contrast elsewhere. Near-black #222326 carries the hierarchy, while muted #52525b supports longer reading. Large rounded cards and phone imagery show the learning experience without crowding the generous whitespace. Typography stays close to -apple-system, with Inter in the fallback stack, so the interface feels native to the devices it promotes.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Ink | `#222326` | neutral | Primary text and the near-black visual anchor for dark calls to action. |
| Slate | `#52525b` | neutral | Secondary text and understated navigation. |
| Quiet Gray | `#8b8c8f` | neutral | Low-emphasis labels and supporting details. |
| Warm Hairline | `#e7e4de` | neutral | Subtle boundaries against the warm section background. |
| Oat Paper | `#faf8f5` | neutral | Large, warm off-white sections that break up the white page. |
| Paper White | `#ffffff` | neutral | Main canvas, card surfaces, and reversed text on dark controls. |
| Mist Blue | `#eff4ff` | accent | Soft cool background for selected content areas and illustrations. |
| Action Blue | `#2563eb` | accent | Occasional actionable text, especially the contact link. |

## Typography

### -apple-system — body
The same native-feeling sans stack carries the headline, explanations, cards, and controls. Weight 600 and increasingly tight tracking establish the headline hierarchy without switching to a separate display face; Inter is loaded as a fallback, not the dominant measured font.
- **Fallback:** system-ui, Inter, Segoe UI, sans-serif
- **Weights:** 400, 500, 600, 700
- **Sizes:** 11-68px · approximately 12 values
- **Line height:** 1-1.5, tightened progressively for headings
- **Letter spacing:** normal for prose; approximately -0.02em to -0.03em for headings

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | -apple-system | 500 | 12px | 1.5 | normal |
| body-sm | -apple-system | 400 | 14px | 1.5 | normal |
| body | -apple-system | 400 | 16px | 1.5 | normal |
| subtitle | -apple-system | 500 | 17px | 1.5 | -0.17px |
| title-sm | -apple-system | 600 | 21px | 1.5 | -0.42px |
| title | -apple-system | 600 | 26px | 1.1 | -0.51px |
| title-lg | -apple-system | 600 | 48px | 1.05 | -1.45px |
| display | -apple-system | 600 | 68px | 1 | -2.04px |

## Spacing and layout

**Density:** airy

- **Base unit:** 8px
- **Max page width:** 1024px
- **Section gap:** 112px
- **Card padding:** 22px 24px
- **Element gap:** 8-24px

### Border radii

- **Store buttons and small pills:** 999px
- **Content cards:** 28px
- **Compact inset controls:** 8px

## Elevation

Depth comes primarily from white surfaces against Oat Paper or Mist Blue, large radii, and illustrated device overlap. Main content cards have no shadow; smaller UI details use a restrained 0 1px 2px #1c264c0d shadow, while floating illustration elements may use 0 12px 26px -16px #0a102873.

## Components

### Primary button
**Role:** Sends visitors to an app marketplace.

Ink fill with Paper White text, pill radius, and 600-weight body text; approximately 50px tall with 13px 24px padding. Place a store icon before the label and keep the two marketplace actions visually equal.

### Input
**Role:** Filters the available languages.

Compact 13px text, 8px radius, 8px 10px padding, a light gray inset fill, and a 1px cool-gray border; no shadow.

### Link
**Role:** Provides low-pressure contact and navigation actions.

Use Action Blue and 600 weight for the contact link; use Slate for quieter navigation links, changing to Ink on hover. Keep links unboxed unless they are marketplace actions.

### Card
**Role:** Contains an individual learning concept or product detail.

Paper White surface, 28px radius, and 22px 24px padding, usually without a border or shadow. Keep headings left-aligned and allow generous room for supporting media.

## Motion

Keep motion restrained: color changes take about 0.2-0.3s ease, interactive transforms about 0.28s with a smooth cubic-bezier easing, and scroll-revealed content fades in over roughly 0.5-0.6s ease-out. Do not animate headline typography or make the page feel kinetic.

## Layout

Use a centered 1024px content container with roughly 24px side padding and 112px vertical section padding. The opening composition is a narrow centered column: logo, two-line display headline, constrained lede, compact proof points, paired store buttons, then an overlapping phone preview. Subsequent content can widen into spacious card arrangements while retaining clear alignment and ample blank space.

## Imagery

Product-first imagery: crisp phone mockups, flashcard UI fragments, and a small illustrated mascot rather than lifestyle photography. Use restrained pastel halos and overlapping interface elements to add warmth and depth; let the first viewport remain mostly open white space.

## Do and don't

### Do
- Center the opening message and constrain its headline to two decisive lines.
- Use the native system sans stack with 600-weight, tightly tracked headings.
- Pair the near-black marketplace pills at equal visual weight.
- Alternate Paper White with Oat Paper and occasional Mist Blue areas.
- Give major cards a 28px radius and enough space for product imagery.
- Treat the mascot and phone interface as the primary visual evidence of the product.

### Don't
- Do not replace the quiet white canvas with a saturated full-page gradient.
- Do not introduce a decorative display font or extra-bold headline.
- Do not turn every card into a raised, shadow-heavy panel.
- Do not make Action Blue the default color of marketplace buttons.
- Do not crowd the opening composition with navigation or feature lists.
- Do not substitute generic student photography for the app interface.

## Similar brands

- **Duolingo** — Friendly language-learning identity and clear product-led explanations, though Vocabbie is much more restrained.
- **Headway** — Mobile-learning promotion built around concise benefits and polished app previews.
- **Apple** — Native-feeling system typography, generous whitespace, and product imagery given room to speak.

## Agent prompt

Create a light, product-led landing page for Vocabbie with a centered mascot wordmark, a tightly tracked 68px system-sans headline, and a muted 21px lede. Keep the opening mostly Paper White with a barely perceptible pastel halo, then alternate warm Oat Paper and occasional Mist Blue surfaces. Use paired near-black pill-shaped app-store buttons, large unshadowed white cards with 28px corners, and crisp overlapping phone-interface imagery. Hold content to a 1024px container, maintain generous 112px section spacing, and favor calm fades over conspicuous animation.
