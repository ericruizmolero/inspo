# Vocabbie — DESIGN.md
> pastel aurora over apple-clean type

**Theme:** light  
**Source:** https://www.vocabbie.app/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

A consumer app landing that borrows Apple's marketing grammar and softens it with a watercolor aurora. The hero sits on a lilac-to-peach gradient wash that dissolves into Paper White (#ffffff) and the warm off-white Linen (#faf8f5) used for most scrolling sections. Everything is set in -apple-system (system-ui, Inter as webfont fallback): the h1 runs 68px/68px at weight 600 with an aggressive -2.04px tracking, section heads at 48px with -1.45px, and the lede drops to 21px at 40% transparency (#1f202599) for a quiet, breathable tone. Body copy lands on 14px and 15px steps in Graphite #52525b. Interactive weight is carried by two full-pill Obsidian (#1f2025) store buttons with white 600-weight labels, and by large 28px-radius white cards whose shadows are colored (rgba(28,38,76,0.3) 0 14px 30px -12px) rather than gray. Accent blue #2563eb appears only in links; colored ink tones tint card blurbs.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Obsidian | `#1f2025` | brand | Store-button fill and strongest outline; the only true dark surface on the page. |
| Ink | `#222326` | neutral | Primary text color for headings, card titles and labels. |
| Graphite | `#52525b` | neutral | Muted body copy, footer nav links and secondary metadata. |
| Ash | `#8b8c8f` | neutral | Faint text: microcopy, credits, disabled or tertiary labels. |
| Hairline | `#e7e4de` | neutral | Warm 1px borders on cards, chips and dividers; #e3e3e6 for form fields. |
| Linen | `#faf8f5` | neutral | Dominant warm off-white section background carrying most of the page. |
| Paper White | `#ffffff` | neutral | Card and surface fill that lifts content off Linen, plus the 80% white frosted overlays. |
| Aurora Wash | `#efe6ff` | accent | Approximate mid-tone of the lilac/pink/peach hero gradient behind the logo and headline. |
| Signal Blue | `#2563eb` | accent | Inline text links and the one truly clickable non-button color. |
| Mist Blue | `#eff4ff` | accent | Soft tinted panel background for informational blocks and selected states. |
| Ink Blue | `#324f7d` | semantic | Tinted blurb text inside the Listen & Learn card; part of a family of per-card ink tints. |
| Mint Success | `#10b981` | semantic | Success and progress indicators such as completed steps and correct answers. |

## Typography

### -apple-system — display
Carries all headlines; there is no separate display face, only San Francisco pushed to weight 600 with very tight negative tracking. The h1 sets line-height equal to font-size (68/68) so the two-line hero locks into a tight block. Nothing goes to 800 or italic.
- **Fallback:** system-ui, Inter, 'Segoe UI', sans-serif
- **Weights:** 600, 700
- **Sizes:** 21-68px · 5 values
- **Line height:** 1.0 at display, 1.05-1.1 at titles
- **Letter spacing:** -2.04px at 68px, -1.45px at 48px, -0.5px at 26px

### Inter — body
Loaded as the cross-platform stand-in for San Francisco in body copy, chips and nav. Weight 600 handles small emphatic labels like '90 languages'; 400 handles all paragraphs. Body sizes are non-round (14.4px, 15.2px) because they derive from rem scaling — round to 14 and 15.
- **Fallback:** system-ui, 'Segoe UI', sans-serif
- **Weights:** 400, 500, 600
- **Sizes:** 11-21px · 7 values
- **Line height:** 1.35-1.5
- **Letter spacing:** normal to -0.17px

### SF Pro Rounded — ui
Appears once, on the numbered step headers of the lesson walkthrough, to give the in-app steps a softer app-like voice. Use it sparingly and only for numeric step or badge labels; treat it as decorative, not systemic.
- **Fallback:** -apple-system, system-ui, sans-serif
- **Weights:** 400
- **Sizes:** 16px · 1 value
- **Line height:** 1.5
- **Letter spacing:** normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | Inter | 400 | 11px | 1.6 | normal |
| body-sm | Inter | 400 | 13px | 1.5 | normal |
| body | Inter | 400 | 14px | 1.5 | -0.14px |
| subtitle | Inter | 600 | 15px | 1.5 | normal |
| title-sm | -apple-system | 400 | 21px | 1.3 | normal |
| title | -apple-system | 600 | 26px | 1.1 | -0.5px |
| title-lg | -apple-system | 600 | 48px | 1.05 | -1.45px |
| display | -apple-system | 600 | 68px | 1 | -2.04px |

## Spacing and layout

**Density:** airy

- **Base unit:** 8px
- **Max page width:** 1024px (prose narrowed to 672px)
- **Section gap:** 112px vertical, 24px gutters
- **Card padding:** 22px 24px (up to 30px 28px on feature cards)
- **Element gap:** 8px default, 16-24px between blocks

### Border radii

- **Store buttons, chips, pills:** 999px
- **Feature card:** 28px
- **Large media card:** 36px
- **Small tinted badge:** 14-16px
- **Input field:** 8px
- **Micro tags and inline marks:** 4px
- **Avatar / flag dot:** 50%

## Elevation

Shadow tokens are declared as none, so depth comes from surface steps (Paper White cards on Linen) plus hand-tuned colored shadows on specific floating elements: rgba(28,38,76,0.05) 0 1px 2px for chips, rgba(28,38,76,0.3) 0 14px 30px -12px with rgba(28,38,76,0.06) 0 2px 6px for lifted cards, and rgba(10,16,40,0.45) 0 12px 26px -16px for the phone mockup. Shadows are blue-tinted, never neutral gray; borders are the warm Hairline.

## Components

### Primary button
**Role:** App Store / Google Play download CTA in the hero and repeated conversion blocks.

Obsidian fill, pill radius, 13px/24px padding, white 16px 600-weight label with -0.16px tracking, leading platform glyph at 8px gap, no border and no shadow. Hover lifts with a 0.2s transform and slight opacity shift; active returns to flat.

### Secondary button
**Role:** Low-emphasis store or section links inside content areas.

Surface-2 (#f5f3ef) fill, 16px radius, 10px/16px padding, Ink body text at weight 500. Hover deepens the fill toward #ece9e3; no border.

### Input
**Role:** Language search field in the 90-languages picker.

#f7f7f8 fill, 1px #e3e3e6 border, 8px radius, 8px/10px padding, body-sm text in Ink. Placeholder in Ash; focus swaps the border to Signal Blue with no glow.

### Card
**Role:** Feature and content container sitting on the Linen background.

Paper White fill, 28px radius (36px for media-heavy variants), 22-30px padding, optional Hairline border. Title uses the title step, blurb uses body-sm and may take a per-card ink tint such as Ink Blue. Hover raises it with the colored 14px/30px shadow over 0.28s.

### Link
**Role:** Inline textual navigation and contact actions.

Signal Blue at subtitle weight 600 with no underline in body; footer variants use Graphite 14px with underline and hover to Ash. Color transitions in 0.2s ease.

## Motion

Restrained and mostly entrance-based: opacity 0.6s ease-out reveals tied to scroll, transform 0.28s cubic-bezier(0.4,0,0.2,1) for card and phone lifts, color 0.15-0.3s ease on links and nav. Nothing rotates or bounces; the hero gradient is static. Respect prefers-reduced-motion by dropping transforms and keeping opacity fades only.

## Layout

Single-column centered narrative: 1024px container with 24px gutters, prose measures clamped to 672px, 112px vertical section padding. Hero is fully centered — logo lockup, two-line display headline, lede, a dot-separated 15px proof row, then a horizontal pair of pill CTAs. Below, three-up feature cards and alternating text/phone-mockup rows keep the same centered axis. 8px is the default gap unit throughout.

## Imagery

Device-first: realistic iPhone mockups with in-app UI, floating white notification chips ('Deck ready · 30 cards · 28s') pinned over the frame for proof. Only one illustration — the lilac cat mascot in the logo lockup. Backgrounds use large soft aurora gradients (lilac, pink, peach) rather than photography. No stock photos, no icon-heavy grids; screenshots crop generously and bleed past section edges.

## Do and don't

### Do
- Keep the display headline at weight 600 with -2.04px tracking and line-height equal to font-size.
- Set section backgrounds in Linen #faf8f5 and lift content with Paper White cards at 28px radius.
- Use colored blue-tinted shadows (rgba(28,38,76,0.3)) instead of neutral gray drop shadows.
- Reserve Obsidian for the pill CTAs so the only strong dark on the page reads as the action.
- Center everything on a 1024px axis and clamp paragraphs to ~672px for a 3-4 line measure.
- Dim supporting copy with alpha (#1f202599) rather than picking a new lighter gray.

### Don't
- Don't add a second typeface for headlines; San Francisco at 600 is the voice.
- Don't use letter-spacing at default on large type — negative tracking is mandatory above 26px.
- Don't apply Signal Blue to buttons or large fills; it belongs to inline links only.
- Don't place hard borders on feature cards' outer edges where the surface step already separates them.
- Don't animate the hero gradient or add parallax; motion is opacity and subtle lift only.
- Don't drop section padding below 112px or the airy rhythm collapses.
- Don't mix more than one ink tint per card blurb.

## Similar brands

- **Apple (App Store product pages)** — System font at tight negative tracking, centered hero, pill dark CTAs and device-first imagery.
- **Duolingo web** — Consumer language-learning landing with mascot logo, pastel backgrounds and app-store dual CTAs.
- **Bear (app)** — Warm off-white surfaces, generous rounded cards and understated system typography.
- **Raycast** — Soft gradient hero washes with dark pill buttons and colored, not gray, shadows.
- **Linear (marketing)** — Tight 600-weight display type, narrow prose measure and reveal-on-scroll opacity motion.

## Agent prompt

Build a centered consumer-app landing page in -apple-system/system-ui (Inter fallback). Warm off-white #faf8f5 sections, Paper White #ffffff cards at 28px radius, warm #e7e4de hairlines. Hero sits on a soft lilac-to-peach aurora gradient: logo lockup, then a two-line headline at 68px weight 600, line-height 68px, letter-spacing -2.04px in #222326; lede at 21px regular in #1f202599; a 15px dot-separated proof row; then two pill CTAs filled #1f2025 with white 600-weight 16px labels, 13px/24px padding. Body 14px #52525b. Section heads 48px, -1.45px tracking. 1024px container, 112px section padding, 8px base gap, prose max 672px. Shadows blue-tinted rgba(28,38,76,0.3) 0 14px 30px -12px. Motion: 0.6s opacity reveals and 0.28s transform lifts only. Signal Blue #2563eb for inline links exclusively.
