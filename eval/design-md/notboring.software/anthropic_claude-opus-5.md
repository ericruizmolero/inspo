# !Boring Software — DESIGN.md
> toy-bright grotesk on soft grey

**Theme:** light  
**Source:** https://notbor.ing/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

A studio site that looks like a well-lit toy shelf: giant Founders Grotesk statements sitting on wide bands of #ececec smoke grey and pure #ffffff, with #ffb200 Andy Yellow flooding entire sections behind 3D app renders. Headlines run 44px at weight 600 with a paired 44px weight-400 line, so bold and regular alternate inside the same sentence instead of stacking sizes — hierarchy comes from contrast of weight, not scale. The hero title hits 76px/76px, blog titles 36px. All navigation, labels and captions switch to JetBrains Mono at 12-16px, uppercase, 1px letter-spacing, which gives the playful typography a tiny engineering counterweight. Text is near-black #232323 for prose, #000000 for links, #aaaaaa for muted meta. Buttons are the only chrome: black 4px-radius pills or 2px black outlines, no shadows anywhere. Sections breathe with 100px vertical padding inside an 880px reading column.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Paper White | `#ffffff` | neutral | Base page background and the fill of outlined buttons. |
| Smoke | `#ececec` | neutral | Dominant alternating section band that separates content blocks without borders. |
| Gainsboro | `#e0e0e0` | neutral | Second-level surface for inset panels and app-frame backgrounds inside grey bands. |
| Ink | `#000000` | neutral | Primary button fill, button borders, links and hero headline color. |
| Soft Black | `#232323` | neutral | Body and section-headline text, marginally warmer than pure black. |
| Fog Grey | `#aaaaaa` | neutral | Muted captions, footer link labels and secondary mono metadata. |
| Andy Yellow | `#ffb200` | brand | Signature full-bleed section color behind product renders and highlights. |
| Deep Amber | `#2e240f` | accent | Dark text and contrast layer used on top of Andy Yellow areas. |

## Typography

### Founders Grotesk — display
Carries every headline, lead paragraph and button label. The signature move is pairing a weight-600 line with a weight-400 line at the exact same 44px size, so emphasis is purely a weight shift. Nothing is italic and nothing tracks tighter.
- **Fallback:** 'Inter', 'Helvetica Neue', Arial, sans-serif
- **Weights:** 400, 600, 700
- **Sizes:** 22-76px · 5 values
- **Line height:** 1.0 for 76px hero, 1.2 for 44px headlines, 1.4 for 24px lead
- **Letter spacing:** normal

### JetBrains Mono — ui
All navigation items, small labels, footer links and captions, always uppercase with 1px tracking. It is the counterpoint that keeps the oversized grotesk from feeling purely decorative. Never used above 16px.
- **Fallback:** ui-monospace, 'SF Mono', Menlo, monospace
- **Weights:** 400, 700
- **Sizes:** 12-16px · 2 values
- **Line height:** 18-20px
- **Letter spacing:** 1px

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | JetBrains Mono | 700 | 12px | 1.67 | 1px |
| body-sm | JetBrains Mono | 400 | 16px | 1.13 | 1px |
| body | Founders Grotesk | 600 | 22px | 1.2 | normal |
| subtitle | Founders Grotesk | 400 | 24px | 1.4 | normal |
| title-sm | Founders Grotesk | 600 | 36px | 1 | normal |
| title | Founders Grotesk | 400 | 44px | 1.2 | normal |
| title-lg | Founders Grotesk | 600 | 44px | 1.2 | normal |
| display | Founders Grotesk | 700 | 76px | 1 | normal |

## Spacing and layout

**Density:** airy

- **Base unit:** 10px
- **Max page width:** 1200px container, 880px text column
- **Section gap:** 100px vertical padding per band
- **Card padding:** 40px 100px on wide panels
- **Element gap:** 60px between grid items, 40px between stacked blocks

### Border radii

- **Buttons:** 4px
- **Subscribe button:** 8px
- **Section bands and images:** 0px

## Elevation

No shadows at all. Depth comes from full-bleed surface steps — Paper White against Smoke against Gainsboro — and from the 3D rendered product imagery itself. The only hard edge in the system is the 2px Ink border on outlined buttons.

## Components

### Primary button
**Role:** Drives the Download and other conversion actions.

Ink background, Paper White label in body (22px/600 Founders Grotesk), 4px radius, padding 12px 30px 15px with the extra bottom px optically centering the cap-height, no border, no shadow; hover transitions background-color 0.3s ease to a slightly lifted black.

### Secondary button
**Role:** Low-priority navigation such as 'See all Works'.

Paper White background, 2px solid Ink border, Ink label at body size, 4px radius, identical 12px 30px 15px padding so both buttons align on a row; hover inverts to Ink background with white label.

### Input
**Role:** Email capture in the newsletter block.

Transparent background with no radius and no visible box — only 0px 8px padding and a baseline rule; subtitle-size Founders Grotesk 400 in Ink, placeholder in Fog Grey. Paired with a 8px-radius 2px-outlined Subscribe control.

### Link
**Role:** Header navigation and footer index.

JetBrains Mono uppercase, body-sm in header (Ink) and caption weight 700 in footer (Fog Grey), 1px tracking, no underline; hover moves color toward Ink.

### Header
**Role:** Persistent top bar with logo, five mono nav items and the download CTA.

Paper White, roughly 100px tall, 40px 100px padding, logo left, mono links centre-right with ~30px gaps, primary button flush right, no bottom border.

## Motion

Restrained: declared transitions are limited to background-color 0.3s ease on interactive elements. The energy is carried by scroll-triggered reveals of the 3D app renders and inline video loops rather than by UI micro-animation; type never animates letter by letter and layouts never parallax.

## Layout

Single-column vertical rhythm of full-bleed colour bands (white, Smoke, Andy Yellow), each with 100px top and bottom padding. Content sits in a 1200px container, prose constrained to 880px and left-aligned with generous left inset. Multi-item rows use a 60px gap grid; imagery frequently breaks out of the text column to the band edge.

## Imagery

Almost entirely 3D product renders and screen recordings of the apps — glossy, toy-like objects with soft studio lighting, often floating on Andy Yellow or Smoke. No stock photography, no flat illustration. Videos autoplay silently as interface demos; screenshots are shown inside rendered device or skin frames.

## Do and don't

### Do
- Alternate white and #ececec full-bleed bands with 100px padding to pace the page.
- Build headline emphasis by mixing weight 600 and weight 400 at the same 44px size.
- Set every label, nav item and caption in uppercase JetBrains Mono with 1px tracking.
- Keep #ffb200 for entire sections or objects, never for small text.
- Constrain prose to an 880px left-aligned column inside a 1200px container.
- Keep buttons shadowless with 4px radius and asymmetric bottom padding.

### Don't
- Don't add drop shadows or soft card elevation anywhere.
- Don't use JetBrains Mono above 16px or in sentence case.
- Don't introduce extra type sizes between 44px and 76px.
- Don't tint body text below #aaaaaa or above 3 grey levels.
- Don't round images or section bands — corners stay square.
- Don't use Andy Yellow as a button or link colour; keep CTAs black.
- Don't centre long paragraphs; headlines and prose stay left-aligned.

## Similar brands

- **Linear (early marketing site)** — Large grotesk statements over alternating neutral bands with mono micro-labels.
- **Panic** — Playful product-first software brand using saturated brand colour blocks and 3D renders.
- **Raycast** — Mono UI labels paired with a bold sans display voice and shadowless flat surfaces.
- **Teenage Engineering** — Toy-like object photography on flat colour fields with engineered typographic labels.

## Agent prompt

Build a light, airy marketing page in Founders Grotesk (fallback Inter) plus uppercase JetBrains Mono. Alternate full-bleed bands of #ffffff, #ececec and #ffb200, each with 100px vertical padding; content in a 1200px container, prose capped at 880px, left-aligned. Headlines 44px/1.2 mixing weight 600 and 400 lines in the same block; hero 76px/76px weight 700 in #000000; body text #232323, muted #aaaaaa. Nav links and captions are 12-16px mono, uppercase, 1px tracking. Buttons: black fill with white 22px/600 label or 2px black outline, 4px radius, padding 12px 30px 15px. No shadows, square images, only background-color 0.3s ease transitions, 3D product renders as imagery.
