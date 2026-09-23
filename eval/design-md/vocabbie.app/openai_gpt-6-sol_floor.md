# Vocabbie — DESIGN.md
> pastel light around quiet learning

**Theme:** light  
**Source:** https://www.vocabbie.app/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Vocabbie presents language learning as quick, approachable, and unusually calm. A centered mascot and wordmark lead into a large, tightly set promise, followed by a short explanation, small proof points, and two unmistakable download actions. The first screen leaves generous white space around this hierarchy while soft lilac, pink, and blue light frames the product imagery without competing with it. Across the longer page, Paper White #ffffff alternates with substantial Oat #faf8f5 and Mist Blue #eff4ff surfaces. Ink #222326 carries the headings; quieter copy recedes into Slate #52525b or a translucent ink. The interface relies on the native -apple-system stack, with Inter available as a fallback: weight 600 and negative heading tracking give it character without decorative typography. Near-black pill buttons, generously rounded cards, restrained borders, and occasional delicate demo shadows keep the product tangible but not busy.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Ink | `#222326` | neutral | Primary headings and interface text use this near-black for crisp contrast. |
| Button Black | `#1f2025` | brand | The darker fill makes primary download actions immediately recognizable. |
| Slate | `#52525b` | neutral | Secondary text and quiet navigation links step back from the headings. |
| Faint Slate | `#8b8c8f` | neutral | Tertiary labels and low-emphasis details use this lighter gray. |
| Oat | `#faf8f5` | neutral | This warm off-white covers substantial page sections and softens the long-form layout. |
| Paper White | `#ffffff` | neutral | The main canvas and card surfaces stay clean and luminous. |
| Mist Blue | `#eff4ff` | accent | Pale blue supplies an alternate section surface and a gentle product-focused atmosphere. |
| Warm Hairline | `#e7e4de` | neutral | Subtle borders separate content on warm and white surfaces. |
| Action Blue | `#2563eb` | accent | A sparingly used accent identifies actionable text links rather than primary buttons. |

## Typography

### -apple-system — body
The native sans stack handles both display and everyday interface copy; Inter is loaded but appears mainly as a fallback rather than the dominant rendered face. Weight 600 and tight tracking create the recognizable large headings, while paragraphs remain regular and openly spaced.
- **Fallback:** system-ui, Inter, Segoe UI, sans-serif
- **Weights:** 400, 500, 600, 700
- **Sizes:** 11-68px · 8 principal values
- **Line height:** 1-1.5 depending on hierarchy
- **Letter spacing:** normal in body copy; approximately -0.02em to -0.03em in headings

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | -apple-system | 400 | 12px | 1.5 | normal |
| body-sm | -apple-system | 500 | 14px | 1.5 | -0.14px |
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
- **Element gap:** 8px, expanding to 16px or 24px between larger groups

### Border radii

- **Primary download button:** 999px
- **Card:** 28px
- **Large card:** 36px
- **Input:** 8px
- **Secondary download link:** 16px

## Elevation

The core layout is largely flat: section color changes, white cards, and Warm Hairline borders provide separation, while card shadow variables are set to none. Small product-interface details may use a restrained shadow such as 0 1px 2px #1c264c0d; deeper shadows belong to floating mockup details, not every page card.

## Components

### Primary button
**Role:** Sends visitors to the mobile app stores.

Button Black background, Paper White text, pill radius; 13px 24px padding with a store icon beside the label. Keep the fill solid and use a subtle transform on hover.

### Secondary button
**Role:** Offers a quieter app-store action away from the main call to action.

Light warm surface, Ink text, 16px radius, 10px 16px padding; avoid making it compete with the primary pill.

### Input
**Role:** Lets visitors search the language list.

Light neutral fill, Ink text, 8px radius, 1px cool-gray border and 8px 10px padding; retain a clearly visible focus state.

### Link
**Role:** Handles navigation and occasional inline contact actions.

Navigation links use Slate and darken to Ink on hover; the contact link uses Action Blue. Inline links have no container or button treatment.

### Card
**Role:** Groups learning information and product examples.

Paper White surface, large card radius, approximately 22px 24px padding; prefer surface contrast over a persistent heavy shadow.

## Motion

Use restrained color transitions around 0.2-0.3s and transform transitions around 0.28s with a smooth cubic-bezier easing. Some content fades into view on scroll over approximately 0.5-0.6s. Keep headings and primary calls to action stable rather than continuously animated.

## Layout

Center the opening message in a narrow text column within a broad white canvas, then move into sections constrained chiefly to 1024px with 24px horizontal page padding. Use generous approximately 112px section padding, compact 8px internal gaps, and larger 16-24px gaps between related groups. Alternate white, warm off-white, and pale-blue surfaces over the long page; align detailed content in orderly cards rather than filling every available width.

## Imagery

Product-led imagery combines a small illustrated animal mascot, mobile-device mockups, and numerous interface examples. The opening image sits below the text and store actions, with diffuse pastel color behind it; photography is not the defining visual language.

## Do and don't

### Do
- Open with a centered, two-line 68px promise and ample white space.
- Use 600-weight native-system headings with measured negative tracking.
- Keep app-store calls to action as dark, fully pill-shaped icon-and-label buttons.
- Alternate substantial Oat and Mist Blue sections with Paper White.
- Use large rounded white cards while keeping their default elevation restrained.
- Let product screens and the mascot provide the playful detail.

### Don't
- Do not turn the pale pastel atmosphere into saturated full-page gradients.
- Do not replace the restrained system typography with a decorative display face.
- Do not make Action Blue the fill of the primary download buttons.
- Do not apply dramatic shadows to every card.
- Do not crowd the opening text with side navigation or dense controls.
- Do not introduce sharp-cornered cards or rectangular primary buttons.

## Similar brands

- **Quizlet** — Clear study-product messaging supported by approachable interface previews.
- **Memrise** — Friendly language-learning presentation with mobile product imagery.
- **Lingvist** — Calm, spacious explanation of a technology-assisted language-learning tool.
- **Speak** — Direct app-download calls to action paired with polished mobile mockups.

## Agent prompt

Build a light, spacious landing page for Vocabbie using -apple-system with Inter as fallback. Center a compact mascot wordmark above a bold 68px, weight-600 headline with tight tracking, then quieter explanatory copy and dark pill-shaped store buttons. Keep the canvas Paper White #ffffff, alternate large Oat #faf8f5 and Mist Blue #eff4ff sections, and constrain content to 1024px. Use rounded white cards, subtle borders, minimal shadows, and mobile-app imagery against diffuse pastel light. Make the page friendly and precise, never loud.
