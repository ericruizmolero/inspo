# Vocabbie — DESIGN.md
> warm paper study companion

**Theme:** light  
**Source:** https://www.vocabbie.app/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Vocabbie is a warm-paper study app that sells itself with one enormous sentence and almost no chrome. The page sits on #faf8f5 rather than white, so every white card reads as a raised sheet of paper, and the only saturated surface is a pale blue wash (#eff4ff) that bleeds behind the hero like morning light. Type is system-native — the -apple-system stack, with Inter loaded only as a fallback — and the display voice is weight 600, never 700: 68px at line-height 1.0 with -2.04px tracking, tight enough that the two headline lines lock together as one block. Below it the lede drops to 21.44px in 60% ink, then the meta line shrinks to 13px grey. Buttons are pure black pills, fully rounded, flat, borderless. Everything else resolves to 4px to 28px radii, 8px gaps and hairline #e7e4de borders.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Obsidian | `#222326` | neutral | Primary text everywhere, and the fill of the dark App Store / Google Play pills. Measured #1f2025 on those buttons and #222326 on text; treated here as one ink so the system keeps two colors out of a job that needs one. |
| Warm Paper | `#faf8f5` | neutral | The page background and the most-covered color on the site. Not white — a faint cream that makes every white card float. |
| Pure White | `#ffffff` | neutral | Card and content-sheet surface. Also the header scrim at 80% alpha (rgba(255,255,255,0.8)) when it floats over the hero gradient. |
| Linen | `#f5f3ef` | neutral | Secondary warm surface for small chips and quiet app-store links, one step darker than Warm Paper, and the hover floor for those chips. |
| Muted Slate | `#52525b` | neutral | Secondary copy, nav links and any label that should sit beside Obsidian without competing with it. |
| Faint Grey | `#8b8c8f` | neutral | Tertiary meta — the '90 languages · 30-second deck creation' line, placeholders, footnotes. |
| Hairline | `#e7e4de` | neutral | Warm border and divider on paper surfaces: card edges, table rules, quiet outlines. The input uses a cooler sibling, #e3e3e6. |
| Accent Wash | `#eff4ff` | accent | The pale blue section surface that occasionally replaces Warm Paper behind content blocks — the site's only cool field. |
| Signal Blue | `#2563eb` | accent | Reserved almost entirely for inline text links ('Email us'); the accent that says 'this is clickable, this is not a button'. |
| Tinted Ink | `#7a4d2c` | accent | Family of per-card body inks that tint a blurb to match its illustration: orange #7a4d2c, blue #324f7d, teal #2c5a51, green #2d5a39. Each card picks one; never mix two on the same card. |

## Typography

### -apple-system — display
Every headline, paragraph, button and label. The whole site is one native system stack — Inter is loaded but only as a fallback, so the brand's text literally renders as the reader's own OS. Weight 600 carries every heading; 700 exists only in stray utility text and never in the display voice. Display sizes get progressively negative tracking: -1.4544px at 48.48px, -2.04px at 68px.
- **Fallback:** system-ui, Inter, Segoe UI, sans-serif
- **Weights:** 400, 500, 600, 700
- **Sizes:** 11px to 68px
- **Line height:** 1.0 to 1.6
- **Letter spacing:** 0 to -2.04px at display sizes

### SF Pro Rounded — display
Numerals and step headings only ('01 You write the answer'). A single deliberate rounded gesture inside an otherwise neutral stack — restore a rounded face for these counters if the platform lacks it, and use it nowhere else.
- **Fallback:** -apple-system, system-ui, sans-serif
- **Weights:** 400
- **Sizes:** 16px
- **Line height:** 1.5
- **Letter spacing:** normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | -apple-system | 400 | 11px | 1.5 | 0 |
| body-sm | -apple-system | 400 | 13px | 1.5 | 0 |
| body | -apple-system | 400 | 15.2px | 1.5 | 0 |
| subtitle | -apple-system | 400 | 17px | 1.5 | 0 |
| title-sm | -apple-system | 600 | 20.8px | 1.5 | -0.416px |
| title | -apple-system | 600 | 25.6px | 1.1 | -0.512px |
| title-lg | -apple-system | 600 | 48.5px | 1.05 | -1.4544px |
| display | -apple-system | 600 | 68px | 1 | -2.04px |

## Spacing and layout

**Density:** comfortable

- **Base unit:** ،8px
- **Max page width:** 1024px content shell, 672px for centered prose, 1072px for the widest sections
- **Section gap:** 112px 24px vertical/horizontal section padding
- **Card padding:** 22px 24px
- **Element gap:** 8px default, 24px between stacked blocks, 12px inside tight rows

### Border radii

- **pill:** 999px
- **card:** 28px
- **chip:** 16px
- **input:** 8px
- **small:** 4px
- **micro:** 2px

## Elevation

Barely there. The workhorse shadow is rgba(28,38,76,0.05) 0 1px 2px 0 — a one-pixel lift on ~64 elements; cards themselves are drawn flat with no shadow. Heavier shadows only sit under photographic objects like the phone mockup: rgba(28,38,76,0.3) 0 14px 30px -12px plus a 2px grounding shadow.

## Components

### Store pill button
**Role:** primary button

Obsidian background, pure white text, 999px radius, 16px text at weight 600 with -0.16px tracking, padding 13px 24px, no border, no shadow. Hover lifts with transform 0.28s cubic-bezier(0.4,0,0.2,1); active settles back to scale slightly under 1. Icon sits 8px from the label.

### Warm chip link
**Role:** secondary button

Linen background, Obsidian text at 14px/500, 16px radius, padding 10px 16px, no border. Hover darkens toward #ece9e3 and the label shifts to Signal Blue only if it is a genuine link, never on a decorative chip.

### Content card
**Role:** card

Pure White background on Warm Paper, 28px radius, 22px 24px padding, no border, flat (no shadow) — raise it only if it overlaps photography. Title at title-sm Obsidian; body blurb at 15.5px/1.4 in Tinted Ink, one tint per card.

### Search input
**Role:** input

Background #f7f7f8, border 1px solid #e3e3e6 (a cooler hairline than the standard border token), 8px radius, padding 8px 10px, text 13px/400 Obsidian, placeholder Faint Grey. Focus swaps the border to Signal Blue and keeps the radius — no glow.

### Inline link
**Role:** link

Signal Blue at 15.2px/600 with no underline; hover shifts the color toward Faint Grey over 0.2s. Nav links are the quieter variant: Muted Slate 14px/400, no underline, hover to Obsidian.

## Motion

Three fixed gestures. Movement: transform 0.28s cubic-bezier(0.4,0,0.2,1) for hover lifts. Reveal: opacity 0.6s ease-out for scroll-entrance, never longer. Color: 0.15s to 0.3s ease for text and link transitions only. Nothing bounces, nothing rotates.

## Layout

Single centered column capped at 1024px, prose narrowed to 672px. The hero is type-first: logo lockup, one 68px two-line statement, a muted lede at 21.44px, a 13px grey meta row, then two black pills side by side. Sections are separated by 112px of vertical air rather than rules or color changes. Cards sit in a grid on Warm Paper with white sheets and 8px-to-24px gaps. Background is a soft lavender-to-peach gradient bleed at the very top, dissolving into flat Warm Paper by the fold.

## Imagery

One device mockup (a phone with a flashcard UI) and small badge illustrations; no full-bleed photography. Illustrations are soft, rounded and outlined, matching the mascot. Decorative gradients are blurred and low-saturation, acting as light rather than as graphics.

## Do and don't

### Do
- Keep the background at Warm Paper #faf8f5 and reserve Pure White for raised cards.
- Set every heading at weight 600, never 700, and scale tracking negatively as size grows (-0.512px at 25.6px, -1.4544px at 48.5px, -2.04px at 68px).
- Keep display line-height at 1.0 so multi-line headlines read as one solid block.
- Use full 999px pills for primary actions and 28px radii for cards; never square a button or round a section.
- Use 8px as the default gap and 112px vertical padding to separate sections instead of borders or background changes.
- Let the accent stay almost invisible: Signal Blue for links, Accent Wash for occasional cool fields, Tinted Ink for card blurbs.

### Don't
- Do not introduce a web-font display face; text renders in the reader's system stack by design.
- Do not bold anything past 600 or add wide letter-spacing to headings.
- Do not put a visible border or a heavy shadow on a white card — the lift comes from the warm background contrast.
- Do not use Signal Blue as a button fill; buttons are Obsidian or Linen.
- Do not mix two Tinted Ink colors inside one card, and do not use them for headings — they are body-copy tints only.
- Do not add saturated gradients, glows or drop shadows to UI; the only soft gradients are the blurred light bleeds at the top of the page.

## Similar brands


## Agent prompt

Build Vocabbie-style pages as warm paper documents: #faf8f5 background, white 28px-radius cards, system-ui type at weight 600 with negative tracking on large sizes, black 999px pill buttons, 8px gaps and 112px section padding, blue reserved for links only.
