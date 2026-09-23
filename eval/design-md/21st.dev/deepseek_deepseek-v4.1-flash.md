# 21st.dev — DESIGN.md
> nocturnal component foundry, blue-lit

**Theme:** dark  
**Source:** https://21st.dev/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

The system is a blacked-out workshop lit by one blue filament. Everything sits on Void #09090B, with panels stepped up barely a shade to #0D0D0E, so the page reads as one continuous dark surface rather than a stack of cards. Typography is General Sans at weight 500 almost exclusively — 318 of 341 weighted samples — with the hero climbing to 64px / 67.84px and negative tracking up to −1.408px, while interface chrome collapses to 11–15px. A lone serif italic (Averia Serif Libre 400) appears for a single accent word, tinted Signal Blue, which is the entire brand gesture. Depth is not made with shadow: it comes from 1px white-alpha rings (#FFFFFF14, #FFFFFF0F), hairline #3F3F4699 borders and near-invisible drop shadows, plus frosted glass overlays for dark UI mockups. Radii are confident but small: 8px on most chrome, 12px on code and feature blocks, full pills for every button and tab. Motion is quick and mechanical — 0.15s color, 0.2s background, 0.3s transform.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Void | `#09090B` | neutral | Global page background and every full-bleed section; also the fill of the dark pill button on light surfaces. The floor the whole product stands on. |
| Ink Panel | `#0D0D0E` | neutral | Elevated surface one shade above Void for preview tiles and embedded mockups; a barely-perceptible step that keeps the page continuous instead of carded. |
| Chalk | `#F4F4F5` | neutral | Primary text, logos, and icon strokes; used at 0.8 and 0.45 alpha for de-emphasised headings and inactive controls rather than a separate grey token. |
| Fog | `#A1A1AA` | neutral | Secondary copy, nav links, the 17px hero sub-paragraph and all inactive chrome. Roughly 25% darker than Chalk, which is the only text contrast step in the system. |
| Signal Blue | `#4B73FF` | accent | The single accent: primary buttons ('Sign up', 'Browse components'), the italic accent word in the display headline, focus and selected states. Nothing else is allowed to be saturated. |
| Hairline | `#3F3F4699` | neutral | Outlines on the secondary dark pill button and quiet dividers between list rows. 60% alpha so it never reads as a drawn line. |
| Glass Ring | `#FFFFFF14` | neutral | 1px inset ring and hover fills on dark overlays and mockup chrome; pairs with #FFFFFF0F for lower-emphasis nested surfaces. This is the system's substitute for borders on dark UI. |
| Terminal Amber | `#C86A50` | accent | Warm counterpart used only inside showcased demo cards (terminal / status mockups). Reserved as content colour, never applied to product chrome — the one place the dark blue monopoly breaks. |

## Typography

### General Sans — ui
Everything. The signature decision is weight: 500 carries 318 of 341 weighted samples, including the 64px hero — nothing is bold, 600 is rare and 300 is only for de-emphasised code lines. Type gains authority from size and tracking, never from weight.
- **Fallback:** system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- **Weights:** 400, 500, 600
- **Sizes:** 11px to 64px
- **Line height:** 1.06 for display, 1.5 for body, 1.38 for 13px chrome
- **Letter spacing:** normal in chrome; -0.192px at 18px, -0.204px at 17px, -0.425px at 24px, -0.968px at 36px, -1.408px at 64px

### ui-monospace — mono
Code blocks, CLI transcripts and file-diff lines only, set loose at 12.5px with double leading. Never used for labels or eyebrows.
- **Fallback:** SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, monospace
- **Weights:** 400, 500
- **Sizes:** 12.5px
- **Line height:** 26.25px (2.1)
- **Letter spacing:** normal

### Averia Serif Libre — display
One word per page, italicised and filled Signal Blue. A deliberate discontinuity against a grotesque sans — the whole personality of the headline lives in this swap.
- **Fallback:** serif
- **Weights:** 400
- **Sizes:** single accent word inside the 64px headline
- **Line height:** inherits the display line
- **Letter spacing:** normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | General Sans | 500 | 11px | 16.5 | normal |
| body-sm | General Sans | 500 | 13px | 18 | normal |
| body | General Sans | 500 | 15px | 22.5 | normal |
| subtitle | General Sans | 500 | 17px | 25.5 | -0.204px |
| title-sm | General Sans | 500 | 24px | 30 | -0.425px |
| title | General Sans | 500 | 36px | 40 | -0.968px |
| title-lg | General Sans | 500 | 44px | 48 | -1px |
| display | General Sans / Averia Serif Libre for one accent word | 500 | 64px | 67.84 | -1.408px |

## Spacing and layout

**Density:** compact

- **Base unit:** 4px
- **Max page width:** 1152px
- **Section gap:** 64px
- **Card padding:** 20px
- **Element gap:** 12px

### Border radii

- **Pill button / tab / badge / avatar:** 9999px
- **Card, code block, mockup shell:** 12px
- **Small utility button, nav link background, chip:** 6px
- **Small control, inner panel:** 8px
- **Large overlay / floating panel:** 16px

## Elevation

Almost none. Separation is drawn with 1px white-alpha rings (#FFFFFF14 outer, #FFFFFF0F inner) and hairline #3F3F4699 borders; the shipped shadows are cosmetic — rgba(0,0,0,0.04) 0 0 0 1px inset with rgba(0,0,0,0.07) 0 1px 3px on tiles, and one bigger rgba(0,0,0,0.25) 0 25px 50px -12px reserved for the floating prompt card. Dark UI mockups use inset glass highlights (rgba(255,255,255,0.85) 0 1px 1px inset) to fake a lit rim rather than a drop shadow.

## Components

### Primary Button
**Role:** The only saturated control: 'Sign up', 'Browse components'.

Signal Blue background, Chalk text, 15px/500 at 44px height or 13px/500 at 28px height, pill radius, horizontal padding 24px (large) / 16px (small), no border. Hover: same blue with a faint Glass Ring inset; active: scale to 0.97 over 0.15s cubic-bezier(0.4, 0, 0.2, 1).

### Ghost Button
**Role:** 'Log in', 'Join for free', secondary actions on dark.

Transparent background, Fog text at 13px/500 (28px height, 12px side padding) or Chalk at 15px/500 (44px height, 24px side padding), pill radius. The dark variant carries a 1px Hairline border instead of a fill. Hover: text lifts to Chalk and a #FFFFFF14 fill fades in over 0.2s; nothing moves.

### Nav Link
**Role:** Header navigation and inline pointers.

Fog at 13px/500, 19.5px line-height, 4px 8px padding with a 6px radius so the hit area is generous while the text block stays visually tight. Horizontal gap between links is 12px, not 24px — the nav reads as a sentence. Hover: colour to Chalk in 0.15s, background stays transparent.

### Pill Tab
**Role:** Category chips ('Animated heroes', 'Shaders') and the Code/Preview segmented switch.

12–13px/500, pill radius, 6px 12px padding for chips or 4px vertical for the switch. Inactive: Fog text, transparent fill, Glass Ring border. Active: Chalk text on a #FFFFFF14 fill with the ring slightly stronger; label colour, never a blue underline, is the state signal.

### Preview Card
**Role:** The repeating dark tile that frames a live component or mockup.

Ink Panel (#0D0D0E) fill, 0px radius on the outer frame with the inner media carrying 12px, inset ring rgba(0,0,0,0.04) 0 0 0 1px plus rgba(0,0,0,0.07) 0 1px 3px. Caption uses Chalk at 0.8 alpha, 13px/500, 18px line-height. Hover: transform scale or lift over 0.3s cubic-bezier(0.23, 1, 0.32, 1); no border colour change.

## Motion

Fast and mechanical, never bouncy. Colour transitions 0.15s; background-color 0.2s; opacity 0.2s; scale 0.15s; transforms and card lifts 0.3s on cubic-bezier(0.23, 1, 0.32, 1) (ease-out-expo family) — the one place the easing is expressive. All on cubic-bezier(0.4, 0, 0.2, 1) otherwise. Scroll-triggered reveals exist and are subtle: fade plus a short upward translate, no stagger spectacle.

## Layout

Centred 1152px column against the full-bleed Void. Header is a 44px-high single row: wordmark far left, four nav links optically centred, and Log in / Sign up pushed right — no borders, no backdrop, it simply floats on the black. Vertical rhythm is built from 12px gaps for grouped controls, 24px for labels-to-content, 64px between major blocks. The hero is a left-aligned 64px display over a 17px Fog sub-paragraph, with the accent word set in serif italic. Below, filters sit in one inline row of pill tabs, then a wide strip of dark preview tiles that overflow the viewport edge to signal an endless library.

## Imagery

Screenshots of dark product UI, rendered gradient and liquid-metal textures, ASCII displacement studies and monochrome wireframe diagrams. Saturated colour appears only inside those embedded demos and never in the chrome around them.

## Do and don't

### Do
- Set almost all text in General Sans at weight 500; reserve 400 for nothing ornamental and let 600 appear only in dense labels.
- Make one word of a display headline serif italic in Averia Serif Libre and fill it Signal Blue — exactly one per page.
- Keep the palette to Void, Ink Panel, Chalk, Fog and one blue; reach for alpha (0.8, 0.45) rather than a new grey.
- Separate surfaces with 1px white-alpha rings (#FFFFFF14) and hairline #3F3F4699 borders instead of shadows or lighter fills.
- Use pills for every button and tab, 8px for small chrome, 12px for code blocks and cards — nothing larger than 16px.
- Run interface chrome at 11–15px with normal tracking; apply negative letter-spacing only above 17px, scaling it with size (−0.204px at 17px up to −1.408px at 64px).
- Keep hover states to a colour shift or a #FFFFFF14 fill over 0.15–0.2s; nothing should jump or bounce.

### Don't
- Do not introduce a second saturated colour into product chrome — pink, orange and terracotta in the screenshots belong to embedded demo content only.
- Do not use bold or 700 weights; hierarchy comes from size and spacing.
- Do not add drop shadows or glows to separate cards on the dark background.
- Do not stack multiple grey text tokens; Fog and alpha-modified Chalk are the whole ladder.
- Do not put the serif accent face anywhere except a single italic word inside a headline.
- Do not use radii above 16px on surfaces, or squared corners on buttons — actions are always pills.
- Do not set chrome text with visible letter-spacing or uppercase; the Code/Preview toggle capitalises only through text-transform, never through tracking.

## Similar brands

- **Vercel** — same near-black canvas, Geist-like geometric grotesque and hairline-border depth model, but Vercel allows literal white-on-black starkness where 21st keeps everything at one grey step.
- **Linear** — shared compact 13px chrome, pill controls and a single accent, though Linear's accent is violet and its surfaces are lighter, more layered panels.
- **shadcn/ui docs** — the same register of dark neutral panels and code-as-content, but 21st pushes tracking negative and adds the serif-italic gesture shadcn never uses.

## Agent prompt

Build on a #09090B canvas with #0D0D0E panels and General Sans at weight 500 everywhere. Use Fog #A1A1AA for secondary text and Chalk #F4F4F5 for primary; the only accent is Signal Blue #4B73FF, applied to pill buttons and to one serif-italic word in the display headline. Chrome runs 11–15px; the display is 64px/67.84px with −1.408px tracking. Buttons are pills — blue filled for primary, transparent with a 1px #3F3F4699 border for secondary. Separate surfaces with 1px #FFFFFF14 rings, not shadows. 1152px max width, 12px element gaps, 64px section gaps, 8px/12px radii, 0.15–0.2s colour transitions and 0.3s ease-out-expo lifts.
