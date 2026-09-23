# Vocabbie — DESIGN.md
> soft-focus study desk in pastel light

**Theme:** light  
**Source:** https://www.vocabbie.app/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

A warm, almost paper-white learning site that behaves like a quiet classroom rather than a growth funnel. The page sits on #faf8f5, not pure white, and lets one huge system-font display line (68px, weight 600, −2px tracking) carry the entire pitch; everything below it steps down through 21px lede, 16px body and 14px meta without a single bold shout. Colour arrives as tinted ink, not chrome: black pill store buttons, a single Signal Blue link, and pale panels in mist blue, soft green and warm cream that appear behind feature copy, each carrying its own deep ink tone (burnt orange, navy, teal) so a card reads as a tinted sheet rather than a bordered box. Corners are either fully round (999px buttons) or generously soft (28px cards), shadows are almost invisible one-pixel lifts, and motion is limited to a 0.28s transform on hover plus slow fade-ins on scroll.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Obsidian | `#222326` | neutral | Primary text for headings and body, and the surface of both App Store / Google Play pills. The hero lede is the same ink at 60% alpha (#1f202599), which is how the system makes text quieter instead of switching hue. |
| Paper White | `#ffffff` | neutral | Card and sheet surface that floats above the warm page: feature cards, the phone mockup screen, sticky bars. |
| Warm Paper | `#faf8f5` | neutral | Default page background and by far the largest visible area. Gives every screenshot and pastel panel a cream seam instead of a cold white edge. |
| Slate Grey | `#52525b` | neutral | Secondary copy and footer navigation labels; also the resting colour of header links before they darken to Obsidian. |
| Ash Grey | `#8b8c8f` | neutral | Tertiary meta only: value props separated by dots, placeholders, legal micro-links, disabled-feeling text. |
| Border Sand | `#e7e4de` | neutral | Hairline borders and dividers, and the base for neutral chips (#f5f3ef) and input outlines. Warm, never grey-blue. |
| Signal Blue | `#2563eb` | accent | The single interactive accent: inline links such as "Email us". Used sparingly, one or two instances per page, always at weight 600. |
| Mist Blue | `#eff4ff` | accent | Cool tinted panel behind illustrative/feature blocks. Siblings in the same family are Warm Cream #fff6ee and Soft Mint #e7f8f1; they are variants of one pastel-panel role, not separate tokens. |
| Tinted Ink | `#324f7d` | accent | Card-body ink that matches its panel tint — Slate Navy #324f7d, Burnt Orange #7a4d2c, Deep Teal #2c5a51. Never used for headings, only for 15px body copy sitting on the matching pastel surface. |

## Typography

### System Sans (-apple-system / SF Pro / Segoe UI) — display
Everything. The signature decision is that no webfont is loaded for the interface — the OS font is the brand face, and hierarchy is made with size and tracking, never with a second typeface.
- **Fallback:** system-ui, "Inter", "Segoe UI", sans-serif
- **Weights:** 400, 500, 600, 700
- **Sizes:** 68px display, 48px section title, 26px card title, 21px lede, 16px body, 14px nav/meta, 12px caption
- **Line height:** tight at display (1.0), 1.05 at 48px, 1.3 at body sizes
- **Letter spacing:** -0.03em at display, -0.02em at 26–48px, -0.01em at 14–16px

### Inter — body
Loaded as a safety net and used on seven elements, mostly inputs and small controls on non-Apple platforms. Treat it as the stand-in so the system look survives on Windows and Linux.
- **Fallback:** system-ui, -apple-system, sans-serif
- **Weights:** 400, 600
- **Sizes:** 13–16px
- **Line height:** 1.5
- **Letter spacing:** normal

### SF Pro Rounded — ui
Only the numbered step headings ("01 You write the answer"). A single playful cameo that marks instructional, in-app moments; do not extend it to body copy.
- **Fallback:** -apple-system, system-ui, sans-serif
- **Weights:** 400
- **Sizes:** 16px
- **Line height:** 1.5
- **Letter spacing:** normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | System Sans | 600 | 12px | 18 | -0.14px |
| body-sm | System Sans | 400 | 14px | 20 | -0.14px |
| body | System Sans | 400 | 16px | 24 | normal |
| subtitle | System Sans | 400 | 21px | 28 | normal |
| title-sm | System Sans | 600 | 26px | 28 | -0.512px |
| title | System Sans | 600 | 48px | 51 | -1.4544px |
| display | System Sans | 600 | 68px | 68 | -2.04px |

## Spacing and layout

**Density:** airy

- **Base unit:** ،
- **Max page width:** main 1024px, prose 672px, wide 1072px
- **Section gap:** 112px vertical, 24px horizontal
- **Card padding:** 22px 24px
- **Element gap:** 8px most common; 12px / 16px / 24px for grouped blocks

### Border radii

- **pill buttons and badges:** 999px
- **cards:** 28px
- **chips and small panels:** 16px
- **inputs:** 8px
- **tags, avatars, icons:** 4px

## Elevation

Almost flat. The workhorse is a \"none\"-level 1px lift (28 38 76 / 5%, 0 1px 2px) on 64 small elements, and cards carry a broad soft plume (28 38 76 / 30%, 0 14px 30px -12px plus a 6% 2px contact). Only the phone mockup and floating badges get a deep drop (10 16 40 / 45%, 0 12px 26px -16px). Note: the CSS variables declare shadow-sm/md/lg as \"none\", so treat the measured values as the real system and the variables as unresolved.

## Components

### Store pill button
**Role:** Primary call to action

Obsidian #222326 background, Paper White text, 16px / weight 600 / -0.16px tracking, radius 999px, padding 13px 24px (≈50px tall), icon 16–18px to the left of the label with an 8–10px gap. No border, no shadow at rest. Hover: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1) — a small translateY, never a colour change; active: same lift removed.

### Quiet chip
**Role:** Secondary / footer action

Warm neutral #f5f3ef background, Obsidian text, 14px / weight 500, radius 16px, padding 10px 16px, no border and no shadow. Sits beside another chip with an 8px gap. Hover: darkens toward #ece9e3; text colour stays put.

### Text link and nav item
**Role:** Inline and header navigation

Inline link: Signal Blue #2563eb, 15px / weight 600, no underline, hover shifts to Ash Grey #8b8c8f (0.2s colour ease). Header nav: Slate Grey #52525b, 14px / weight 400, no underline, hover to Obsidian #222326 (0.15s). Footer legal links are 11px Ash Grey with a real underline.

### Search input
**Role:** Language picker field

Background #f7f7f8, 1px solid #e3e3e6 border, radius 8px, padding 8px 10px (≈37px tall), 13px / weight 400, Obsidian text, Ash Grey placeholder, no shadow. Focus: border darkens toward Border Sand-strong #d8d4cc rather than a blue ring.

### Card
**Role:** Feature and content surface

Paper White background, radius 28px (36px on large cards), padding 22px 24px, no border, soft two-layer shadow (28 38 76 / 30% 0 14px 30px -12px + 6% 0 2px 6px). Title is title-sm (26px / 600 / -0.512px); body copy is 15px Tinted Ink when the card sits on a pastel panel. Hover: 0.28s transform lift only.

## Motion

Deliberate and quiet: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1) on anything hoverable, colour 0.2s ease on links, and opacity 0.5–0.6s ease-out for scroll reveals. Nothing bounces, nothing loops except the demo video.

## Layout

Single centred column. Hero is one 68px display block on a white-to-pastel gradient wash, followed by a 21px lede capped at 672px, a 14px dot-separated proof line in Ash Grey, then two side-by-side pills at an 8px gap. Below, sections alternate 112px vertical rhythm with 1024px content max-width, feature copy stacked left over tinted panels and a phone mockup with floating badges.

## Imagery

Product truth over stock: a white iPhone mockup with real app UI (a progress bar, flag picker, "Hola") and small white pill badges with warm gradient icons that float half off the device edge. Backgrounds are large, low-contrast pastel washes (lilac, mint, cream) that fade into Warm Paper — no photography, no illustration, no logos except the gradient cat mascot.

## Do and don't

### Do
- Set page background to Warm Paper #faf8f5 and reserve Paper White #ffffff for cards, sheets and the phone screen.
- Build hierarchy with size and negative tracking (68px at -0.03em, 48px at -0.02em, 26px at -0.02em) instead of adding weights beyond 600.
- Use pill radius 999px only for the primary store buttons and badges; use 28px for cards, 16px for chips, 8px for inputs.
- Make the hero lede the same Obsidian ink at 60% alpha rather than a different grey — quieter, not greyer.
- Keep hover feedback to a 0.28s transform lift; colour changes belong to links only.
- Tint a panel (Mist Blue, Cream, Soft Mint) and then tint the text inside it to the matching deep ink (navy, orange, teal).

### Don't
- Do not load a display webfont — the OS system sans is the brand face; Inter is a fallback, not a second voice.
- Do not bold anything to 700 in body or UI; 600 is the ceiling, and 500 is only for chips and small labels.
- Do not introduce a saturated brand colour as surface; the only strong colour is Signal Blue on text links, one or two per page.
- Do not use cold grey borders or blue-grey shadows — dividers are warm #e7e4de and shadows are built from navy-tinted alpha.
- Do not give cards hard borders or heavy drop shadows; cards are soft, almost flat, with 28px corners.
- Do not use the purple gradient and pastel wash as button or text colours — they only exist as large, low-contrast background atmosphere.

## Similar brands


## Agent prompt

Design like Vocabbie: warm paper-white page (#faf8f5), one giant system-font headline at 68px/600 with -2px tracking, a 21px 60%-opacity lede, then near-black 999px pill buttons for App Store and Google Play. Cards are white, 28px corner radius, 22px 24px padding, almost shadowless. Accent with pastel panels (mist blue, cream, mint) carrying matching deep-ink body text, and a single blue link colour. Everything else is quiet: 14px grey meta, 8px gaps, 112px section rhythm, hover = 0.28s transform lift only.
