# Stripe — DESIGN.md
> prismatic light over quiet infrastructure

**Theme:** light  
**Source:** https://stripe.com/en-es · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Stripe presents financial infrastructure as expansive but approachable. A mostly white canvas (#ffffff) gives the oversized, light-weight sohne-var headline room to breathe, while deep navy (#061b31) and measured slate (#50617a) keep complex product language legible. The opening artwork sweeps across the page in blue, orange and pink; these colors belong to the imagery rather than becoming a collection of interface accents. Actions instead use a disciplined violet (#533afd), with compact rectangular buttons and fine outlines. Farther down the page, substantial areas of pale blue (#e5edf5), off-white (#f8fafd) and midnight navy (#0d1738) create changes in pace without disrupting the grid. Typography carries much of the hierarchy: weight 300 supports broad, closely spaced headings and readable paragraphs, while weight 400 gives navigation and calls to action definition. Product graphics and customer marks add specificity; restrained borders, small radii and selective shadows keep their surrounding interface precise.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Midnight Navy | `#0d1738` | neutral | A substantial dark section surface that changes the page's pace. |
| Ink Navy | `#061b31` | neutral | Primary heading and navigation text on light surfaces. |
| Body Slate | `#50617a` | neutral | Default paragraph and supporting-link text. |
| Soft Slate | `#64748d` | neutral | Secondary descriptions and quieter large-format copy. |
| Blue Mist | `#e5edf5` | neutral | Broad pale-blue surfaces and unobtrusive dividers. |
| Cloud White | `#f8fafd` | neutral | Subtle card and section surfaces against white. |
| Paper White | `#ffffff` | neutral | The main canvas, graphic-card surface and text on filled violet actions. |
| Stripe Violet | `#533afd` | brand | Primary actions and prominent text links. |
| Lavender Line | `#b9b9f9` | accent | The fine outline on a secondary signup action. |

## Typography

### sohne-var — body
Söhne Variable serves the entire interface, from navigation to long-form copy. Weight 300 does the expressive work in spacious headings and paragraphs; weight 400 defines controls without introducing a heavy bold face.
- **Fallback:** Arial, Helvetica, sans-serif
- **Weights:** 300, 400
- **Sizes:** 12-48px · 8 values
- **Line height:** Approximately 1.1 for large headings and 1.4 for body copy
- **Letter spacing:** Normal for body and controls; approximately -0.26px to -0.96px for headings

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | sohne-var | 300 | 12px | 1.4 | normal |
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
- **Section gap:** 64px
- **Card padding:** 24px where cards hold text; product-graphic cards vary
- **Element gap:** 8px for close controls, 16px for related content, 32px for larger groups

### Border radii

- **Buttons and controls:** 4px
- **Cards and graphic panels:** 6px

## Elevation

Use Blue Mist borders and changes between Paper White and Cloud White before adding depth. Selected floating product graphics use 0 3px 6px #1717170f or 0 16px 32px #32325d1f; ordinary sections remain flat.

## Components

### Header
**Role:** Keeps product navigation and commercial actions accessible above the page.

Approximately 76px tall in the shown desktop viewport; align content to the main container, use a fine bottom divider, plain text navigation triggers and compact right-aligned actions.

### Primary button
**Role:** Marks the principal conversion action.

Stripe Violet background, Paper White text, 4px radius; use approximately 48px height with 24px horizontal padding for standard CTAs, or a more compact 40px header variant. A trailing arrow may identify forward movement.

### Secondary button
**Role:** Offers an alternative action without competing with the primary CTA.

Paper White or translucent white background, Stripe Violet text, 4px radius; use a 1px Lavender Line outline for the signup variant and approximately 48px height with 24px horizontal padding.

### Link
**Role:** Connects descriptions and supporting navigation to deeper information.

Use Stripe Violet for prominent calls to action and Body Slate for quieter footer links; leave links unboxed and make hover changes primarily through color.

### Card
**Role:** Contains product explanations or interface demonstrations.

Use Cloud White for understated content cards or Paper White for floating product graphics, with a 6px radius. Reserve the stronger graphic-panel shadow for elements that visibly overlap or float.

## Motion

Favor restrained interaction over constant animation. Color, fill, stroke, background and small transforms commonly transition over 300ms with eased timing; opacity changes can use 150ms linear. Longer 600-800ms easing belongs to occasional graphic transforms, not navigation or ordinary copy.

## Layout

Use a centered container up to 1266px with wide desktop gutters. Align navigation, copy and lower-page modules to a consistent grid; allow major statements generous width and whitespace, then organize denser product material in modular cards. Maintain a 64px large-scale rhythm and smaller 8px, 16px and 32px relationships within groups.

## Imagery

Lead with an expansive, fluid prismatic graphic, then use customer logos and crisp product-interface compositions rather than generic stock photography. Keep most imagery contained within the grid; let selected interface panels float with subtle shadows.

## Do and don't

### Do
- Set large statements in sohne-var at weight 300 with tight negative tracking.
- Keep primary actions consistently Stripe Violet with Paper White text.
- Use the prismatic artwork as imagery, not as a source of extra UI colors.
- Alternate white, pale-blue and midnight surfaces to pace long pages.
- Give customer marks and product interfaces clean, generous surroundings.
- Use small 4px control radii and 6px card radii.

### Don't
- Do not turn the orange and pink artwork into button or link colors.
- Do not replace the light headline with an extra-bold display face.
- Do not crowd the opening message with multiple competing panels.
- Do not apply deep shadows to every card or section.
- Do not use pill-shaped buttons in place of the compact rectangles.
- Do not introduce a separate font for navigation or product graphics.

## Similar brands

- **Adyen** — Enterprise payments presented through clear typography, product detail and disciplined calls to action.
- **Plaid** — Financial infrastructure explained with generous space and concrete product visuals.
- **Brex** — A polished fintech marketing system that pairs restrained interface structure with expressive campaign imagery.

## Agent prompt

Create a Stripe-like financial infrastructure page on a Paper White canvas within a centered 1266px grid. Use sohne-var throughout: weight 300 for large, tightly tracked navy statements and readable slate descriptions, weight 400 for navigation and actions. Give the opening generous whitespace and one sweeping blue-orange-pink prismatic artwork, but keep UI accents strictly Stripe Violet. Build compact 4px-radius buttons, subtle 6px-radius cards, fine pale-blue separators and occasional floating product-interface graphics. Pace the longer page with Cloud White, Blue Mist and Midnight Navy surfaces; keep shadows selective and transitions understated.
