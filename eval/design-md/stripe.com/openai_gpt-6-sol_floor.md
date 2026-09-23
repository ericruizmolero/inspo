# Stripe — DESIGN.md
> prismatic financial infrastructure in daylight

**Theme:** light  
**Source:** https://stripe.com/en-es · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Stripe presents complex financial infrastructure with the clarity of an editorial landing page. A broad white #ffffff canvas, restrained #061b31 headings and softer #50617a supporting copy give the message room to breathe; a sweeping, multicolour ribbon supplies the visual energy without becoming a background for every section. The hero uses an unusually long, light-weight 48px Sohne headline, followed by compact violet #533afd calls to action and a quiet row of customer logos. Sohne-var carries the entire interface: weight 300 keeps large statements open and conversational, while 400 gives navigation and controls just enough definition. Subsequent content shifts between white, pale #f8fafd surfaces and occasional deep #0d1738 areas, with #e5edf5 rules establishing structure. Product illustrations resemble polished software interfaces rather than decorative stock imagery. Small radii, fine borders and sparing shadows keep the page precise, while generous spacing makes its breadth of products feel manageable.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Stripe Violet | `#533afd` | brand | The decisive color for primary actions and prominent links. |
| Midnight Navy | `#0d1738` | neutral | A deep surface for contrasting sections farther down the page. |
| Ink Navy | `#061b31` | neutral | The principal heading and navigation color on light surfaces. |
| Steel Slate | `#50617a` | neutral | The standard color for explanatory copy and subdued footer links. |
| Soft Slate | `#64748d` | neutral | A quieter tone for large secondary statements and supporting text. |
| Lavender Rule | `#d6d9fc` | accent | A subtle violet-tinted outline for secondary interactive elements. |
| Cloud Blue | `#e5edf5` | neutral | Light section fills and fine structural dividers. |
| Porcelain | `#f8fafd` | neutral | A barely tinted surface for cards and quieter content areas. |
| Paper White | `#ffffff` | neutral | The dominant page canvas and the text color on violet actions. |

## Typography

### sohne-var — display
Large headlines and product titles use the same sans serif as the rest of the site. Weight 300, tight tracking and short line heights create scale without heavy typography.
- **Fallback:** Arial, Helvetica, sans-serif
- **Weights:** 300
- **Sizes:** 26–48px · 3 principal values
- **Line height:** 1.1–1.15
- **Letter spacing:** -0.26px to -0.96px

### sohne-var — body
Weight 300 carries paragraphs and large supporting statements; weight 400 is reserved mainly for navigation, links and actions. The recognisable choice is to achieve hierarchy through size and color rather than bold weight.
- **Fallback:** Arial, Helvetica, sans-serif
- **Weights:** 300, 400
- **Sizes:** 12–32px · 5 principal values
- **Line height:** 1.1–1.4
- **Letter spacing:** normal to -0.64px

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | sohne-var | 300 | 12px | 1.33 | normal |
| body-sm | sohne-var | 400 | 14px | 1.4 | normal |
| body | sohne-var | 300 | 16px | 1.4 | normal |
| subtitle | sohne-var | 300 | 18px | 1.4 | normal |
| title-sm | sohne-var | 300 | 22px | 1.2 | -0.33px |
| title | sohne-var | 300 | 26px | 1.12 | -0.26px |
| title-lg | sohne-var | 300 | 32px | 1.1 | -0.64px |
| display | sohne-var | 300 | 48px | 1.15 | -0.96px |

## Spacing and layout

**Density:** airy

- **Base unit:** 8px
- **Max page width:** 1266px
- **Section gap:** 64px or more
- **Card padding:** 24px
- **Element gap:** 8–16px

### Border radii

- **Buttons and navigation controls:** 4px
- **Cards and interface illustrations:** 6px
- **Larger inset panels:** 8px

## Elevation

Most depth comes from Paper White and Porcelain surface steps, Cloud Blue dividers and Lavender Rule outlines. Reserve shadows for floating product-interface illustrations: 0 3px 6px #1717170f or, on larger panels, 0 16px 32px #32325d1f.

## Components

### Primary button
**Role:** Moves visitors into signup, sales or another principal journey.

Stripe Violet fill, Paper White text and 4px radius; approximately 48px tall with 24px horizontal padding, or a compact 38px header variant with 20px padding. A trailing arrow is common; hover changes color smoothly rather than adding depth.

### Secondary button
**Role:** Offers an alternate action without competing with the violet CTA.

Paper White or translucent white fill, Stripe Violet text, 1px Lavender Rule border and 4px radius. Use approximately 48px height and 24px horizontal padding; preserve the outline on hover.

### Link
**Role:** Connects explanatory copy to deeper product and service pages.

Stripe Violet text at body size with no resting border or pill container; use a subtle color shift on hover. Footer links instead use Steel Slate.

### Card
**Role:** Groups product information or framed interface examples.

Use a Porcelain surface and 6px radius for content cards, without a default shadow. Product-interface mockups may use Paper White and the restrained illustration shadows specified under elevation.

### Header
**Role:** Keeps product navigation and account actions available at the top of the page.

Approximately 76px tall within the main container, with a fine Cloud Blue bottom divider. Use Ink Navy body-sm navigation, small dropdown chevrons and compact actions aligned right; avoid a heavy filled bar.

## Motion

Use restrained 300ms easing for link color, fills, icon strokes and small transforms; brief 150ms linear opacity changes suit transient states. Larger product-illustration transforms may take 600–800ms. Do not animate body copy or rely on scroll-triggered reveals.

## Layout

Center content in a maximum 1266px container. Keep the header and logo alignment near its outer edges, while principal copy can sit farther inward; use ample white space around oversized text. Thin horizontal rules separate broad bands, and later content alternates open editorial areas with grids of product cards and interface illustrations.

## Imagery

Favor customer wordmarks and detailed, layered product-interface renders over photography. The opening uses one large, flowing multicolour gradient ribbon against white; elsewhere, illustration is contained within polished UI panels so the page remains typographic and legible.

## Do and don't

### Do
- Set major headings in Sohne-var weight 300 with tight tracking.
- Keep the main canvas white and use Porcelain only for deliberate surface contrast.
- Use Stripe Violet sparingly for actions and navigational emphasis.
- Give long statements wide measures and generous surrounding whitespace.
- Separate content bands with fine Cloud Blue rules.
- Render product concepts as credible interface fragments with restrained depth.

### Don't
- Do not set headings in heavy bold weights to create hierarchy.
- Do not spread the hero’s multicolour gradient across every section.
- Do not replace Ink Navy and slate text with pure black throughout.
- Do not give ordinary content cards strong drop shadows.
- Do not use highly rounded pills for the primary action system.
- Do not fill open editorial areas with decorative stock photography.

## Similar brands

- **Plaid** — Developer-facing financial infrastructure explained through crisp typography and product visuals.
- **Adyen** — Enterprise payments messaging organized into clear, spacious product narratives.
- **Mercury** — Calm fintech presentation with carefully framed software interfaces.
- **Vercel** — Developer-oriented clarity, disciplined navigation and strong typographic hierarchy.

## Agent prompt

Create a Stripe-like financial infrastructure interface on a spacious Paper White canvas. Use Sohne-var throughout: light, tightly tracked 48px display text; 32px section statements; restrained 16px body copy in Steel Slate. Anchor navigation and headings in Ink Navy, reserving Stripe Violet for compact square-cornered CTAs and links. Keep a centered 1266px layout, fine Cloud Blue dividers, Porcelain content cards and selective product-UI illustrations. Add one expressive multicolour gradient ribbon near the opening, then let typography, whitespace and credible interface details carry the rest.
