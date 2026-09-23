# Stripe — DESIGN.md
> prismatic light over financial precision

**Theme:** light  
**Source:** https://stripe.com/en-es · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Stripe presents financial infrastructure as both dependable and expansive. A largely white canvas, restrained #061b31 typography, and generous empty space establish clarity, while a sweeping orange, pink, and violet hero graphic supplies the energy without turning the interface into a rainbow of controls. The headline is unusually broad and set in light-weight sohne-var at 48px; its dark opening gives way to a cooler, muted continuation. Small navigation labels and compact calls to action keep that statement dominant. A #533afd primary button is the clearest interactive signal, paired with a pale, outlined alternative. Below the opening, fine rules and a customer-logo strip provide structure before the page moves into softly tinted #f8fafd and #e5edf5 surfaces. Product illustrations resemble real payment and dashboard interfaces rather than decorative cartoons. Across the long page, 300-weight copy, modest 4–6px corners, and selective depth make a complex platform feel orderly and approachable.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Stripe Violet | `#533afd` | brand | The primary action and callout-link color, providing a consistent interactive signal. |
| Lilac Line | `#d6d9fc` | accent | A quiet violet border for outlined actions. |
| Midnight | `#0d1738` | neutral | A deep background for contrasting sections further down the page. |
| Ink | `#061b31` | neutral | The principal heading and navigation color on light surfaces. |
| Slate | `#50617a` | neutral | The standard subdued color for body copy and footer links. |
| Soft Slate | `#64748d` | neutral | A lighter text tone for large supporting statements. |
| Mist | `#e5edf5` | neutral | A pale section surface that also supplies subtle neutral dividers. |
| Porcelain | `#f8fafd` | neutral | A barely tinted background for inset content and cards. |
| Paper White | `#ffffff` | neutral | The dominant page background and the contrasting text color on violet actions. |

## Typography

### sohne-var — body
The same sans serif carries navigation, editorial headings, body copy, and controls. Weight 300 does most of the visual work; weight 400 defines actions and compact labels rather than introducing heavy bold type.
- **Fallback:** Arial, Helvetica, sans-serif
- **Weights:** 300, 400
- **Sizes:** 12–48px · 8 principal values
- **Line height:** Approximately 1.1 for headings and 1.4 for body copy
- **Letter spacing:** Normal for body copy; approximately -0.26px to -0.96px for headings

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | sohne-var | 300 | 12px | 1.33 | normal |
| body-sm | sohne-var | 400 | 14px | 1.4 | normal |
| body | sohne-var | 300 | 16px | 1.4 | normal |
| subtitle | sohne-var | 300 | 18px | 1.4 | normal |
| title-sm | sohne-var | 300 | 22px | 1.2 | -0.3px |
| title | sohne-var | 300 | 26px | 1.12 | -0.26px |
| title-lg | sohne-var | 300 | 32px | 1.1 | -0.64px |
| display | sohne-var | 300 | 48px | 1.15 | -0.96px |

## Spacing and layout

**Density:** airy

- **Base unit:** 8px
- **Max page width:** 1266px
- **Section gap:** 64–128px
- **Card padding:** 24–32px
- **Element gap:** 8–16px

### Border radii

- **Buttons and outlined controls:** 4px
- **Cards and interface illustrations:** 6px

## Elevation

Page structure relies primarily on Paper White, Porcelain, and Mist surface changes and thin borders. Reserve shadows for floating interface illustrations: 0 3px 6px #1717170f for shallow depth or 0 16px 32px #32325d1f for a stronger lift; ordinary content cards remain mostly flat.

## Components

### Primary button
**Role:** Directs visitors toward signup, sales, or another principal action.

Stripe Violet background, Paper White text, 4px radius, and body or body-sm weight 400 text; use approximately 48px height with 24px horizontal padding in content, or a compact navigation variant with 20px horizontal padding. A trailing arrow may reinforce forward movement.

### Secondary button
**Role:** Offers a parallel action without competing with the primary call to action.

Paper White or lightly translucent white background, Stripe Violet text, Lilac Line 1px border, and 4px radius; approximately 48px high with 24px horizontal padding. Keep the outline visible against the page.

### Link
**Role:** Connects supporting copy to product details and related destinations.

Use Stripe Violet for callouts and Slate for quieter footer navigation; keep links unboxed, with a restrained color or arrow movement on hover.

### Card
**Role:** Groups product information or inset interface content.

Use a Porcelain or Paper White surface and 6px radius. Prefer a surface step over a shadow for content cards; apply stronger elevation only when the card depicts a floating product interface.

### Header
**Role:** Keeps product navigation and conversion actions immediately accessible.

A single approximately 76px-high row within the main container, with the wordmark at left, compact text navigation in the middle, and sign-in plus a primary sales action at right. Separate it from the page with a faint bottom rule.

## Motion

Use restrained 300ms easing for text color, fills, backgrounds, strokes, and small transforms; quick opacity changes can use 150ms linear. Longer 600–800ms transforms belong to occasional graphic movement, not routine controls. Preserve a stable reading layout rather than animating sections on scroll.

## Layout

Center content in a container up to 1266px wide. Align navigation, headings, calls to action, and subsequent content to a consistent inner grid; the opening headline spans a broad left-aligned measure while colorful artwork occupies the upper-right background. Use large vertical intervals, fine horizontal separations, and alternating white and pale surfaces to organize the long page.

## Imagery

Lead with one large, luminous abstract gradient ribbon, then rely on customer wordmarks and crisp illustrations of actual payment and dashboard interfaces. Keep photographic imagery secondary; graphics should demonstrate the product and retain clean edges against light surfaces.

## Do and don't

### Do
- Give the opening statement a broad measure, 48px light-weight type, and ample white space.
- Use Stripe Violet consistently for primary actions and high-priority text links.
- Place vivid color mainly in large artwork, not across every component.
- Separate major regions with subtle rules or pale surface changes.
- Use weight 300 for editorial copy and weight 400 for controls.
- Make product illustrations look like credible, layered software interfaces.

### Don't
- Do not replace the white canvas with an all-over gradient.
- Do not use heavy bold headings to manufacture hierarchy.
- Do not turn outlined alternatives into a second solid violet action.
- Do not add large rounded-pill corners to the compact controls.
- Do not cast deep shadows on every content card.
- Do not crowd the headline with dense navigation or decorative badges.

## Similar brands

- **Plaid** — Uses a restrained fintech palette and product-led explanations.
- **Adyen** — Pairs payments infrastructure messaging with clear enterprise navigation.
- **Mercury** — Balances spacious financial-product storytelling with polished interface imagery.

## Agent prompt

Create a Stripe-like financial infrastructure interface on a predominantly Paper White canvas, within a centered 1266px grid. Set all text in sohne-var or a close sans-serif fallback, using light 300-weight headings, Ink typography, and restrained Slate supporting copy. Make a broad 48px opening statement the focal point, with a luminous orange-pink-violet abstract ribbon behind its right side. Use Stripe Violet for compact 4px-radius primary actions, outlined secondary actions, fine separators, generous section spacing, pale inset surfaces, and realistic layered product UI illustrations. Keep shadows selective and navigation quiet.
