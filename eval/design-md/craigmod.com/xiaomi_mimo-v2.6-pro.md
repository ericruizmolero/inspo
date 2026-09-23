# Craig Mod — DESIGN.md
> charcoal editorial desk after dark

**Theme:** dark  
**Source:** https://craigmod.com/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Craig Mod's site is a dark charcoal reading room (#222222) where a literary serif does all the talking and a tiny utilitarian sans only ever shouts in capitals. Every piece of running text — newsletter blurbs, book subtitles, pull quotes, essay titles — is FF Meta Serif at 18px on a generous 27px line, in warm ash #DDDDDD rather than white. The only white (#FFFFFF) is functional: form fields and text sitting on blue. Navigation is the counterpoint: 13px FF Meta Web, weight 700, uppercase, 1px tracking, arranged in three loose columns under a circular 'CM' monogram, ruled off with a single #555555 hairline. Blue is rationed to two jobs: a solid #2969FF Subscribe pill and #007AFC underlined retail links at 75% opacity. Text selection glows #FFFF66. Meta lines (publisher, subscriber count) drop to #666666 and #999999 so the page reads like a colophon. Nothing is centered by default except the newsletter block; radii stay between 5px and 8px.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Obsidian | `#222222` | neutral | The page itself — global canvas in dark mode (dm-bg), every section sits on it with no card or panel behind. |
| Ink Black | `#000000` | neutral | Behind-image and vignette fill: the black that shows through photo crops, laurel artwork and deep media blocks. |
| Paper White | `#FFFFFF` | neutral | Bright surface and the brightest ink: email input fill and text set on top of blue buttons. Never used for body copy. |
| Bone | `#EFEFEF` | neutral | Input borders — a 2px bright outline on the white field that punches a hole in the charcoal page. |
| Ash | `#DDDDDD` | neutral | Primary text color (dm-text): all prose, headings, nav labels and underlined links render in this off-white, never pure white. |
| Mist | `#999999` | neutral | Tertiary voice: the 'CRAIG MOD' wordmark lockup and faintest attribution lines. |
| Slate | `#666666` | neutral | Secondary voice: input placeholder, publisher line, subscriber-count fine print — the colophon register. |
| Iron | `#555555` | neutral | Hairline rules and dividers (dm-rule): the single line under the masthead and footer separators. |
| Signal Blue | `#2969FF` | accent | The one commit action: solid fill of the Subscribe button. Bright, saturated, used exactly once per form. |
| Link Blue | `#007AFC` | accent | Transactional links: retailer pills at 75% opacity (#007AFCBF) and any blue inline link; hover darkens toward #0064CC. |
| Highlighter | `#FFFF66` | accent | Text selection background (the --sel variable) — the only warm note in the whole palette. |

## Typography

### ff-meta-serif-web-pro-1 — body
The reading voice. Carries every paragraph, book blurb, pull quote, essay title in lists, and every inline link. Its italics do the emphasis work ("Roden:", "film"), so bold in prose is essentially absent.
- **Fallback:** Georgia, Times, serif
- **Weights:** 400, 500
- **Sizes:** 13px, 15px, 18px, 22px
- **Line height:** 1.5
- **Letter spacing:** normal

### ff-meta-web-pro-1 — display
The architecture. Only ever used two ways: micro (13px, 700, uppercase, 1px tracking — nav, buttons, labels) or macro (26–32px section and work titles). Signature decision: this sans is forbidden from running text, and the serif is forbidden from labels — the split is absolute, which is what makes the page read like a book with a printed cover around it.
- **Fallback:** -apple-system, Helvetica, Arial, sans-serif
- **Weights:** 400, 500, 700
- **Sizes:** 13px, 20px, 26px, 28px, 32px
- **Line height:** 1.1–1.35
- **Letter spacing:** 1px in nav/labels, 2px in the wordmark

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | serif | 400 | 13px | 19.5 | normal |
| body-sm | serif | 400 | 15px | 22.5 | normal |
| body | serif | 400 | 18px | 27 | normal |
| subtitle | sans | 400 | 20px | 30 | normal |
| title-sm | serif | 400 | 22px | 24 | normal |
| title | sans | 500 | 26px | 28.6 | normal |
| title-lg | sans | 700 | 28px | 34 | normal |
| display | sans | 700 | 32px | 38 | normal |

## Spacing and layout

**Density:** comfortable

- **Base unit:** 5px
- **Max page width:** 1140px container; 720px prose column
- **Section gap:** 120px
- **Card padding:** 20px 15px
- **Element gap:** 20px between paragraphs, 30px between blocks, 7px between stacked meta lines

### Border radii

- **input:** 5px
- **pill button:** 6px
- **media block:** 8px
- **monogram:** 50%

## Elevation

None by default. The single shadow in use — rgba(0,0,0,0.28) 0 10px 26px — is reserved for overlaid image blocks, never for cards or buttons.

## Components

### Masthead nav link
**Role:** The three-column site index: uppercase sans labels stacked with 3px vertical padding, 20px between rows, columns separated by ~300px of empty charcoal.

Ash text on Obsidian, 13px sans 700, uppercase, 1px letter-spacing, no underline; hover shifts color over 0.2s ease to Paper White; active section keeps Ash but the current item may carry a trailing label ("BOOKS & ESSAYS", "SHOP!").

### Inline text link
**Role:** Links inside prose and meta lines — newsletter names, publisher credits, essay cross-references.

Inherits the serif at the surrounding size (18px body or 13px caption), keeps Ash or Slate depending on its paragraph, permanent underline, no visited color change; hover brightens to Paper White over 0.2s ease. Never turns blue.

### Email field with list checkboxes
**Role:** The newsletter signup: one address input with stacked checkbox rows beneath, left-aligned under a block of centered prose.

Input: Paper White fill, 2px Bone border, 5px radius, 4px 10px padding, 20px sans with Slate placeholder. Checkbox rows: native square control tinted Signal Blue, serif 18px Ash label with the cadence in Slate parentheses, 7px between rows. Field has no visible label — the placeholder is the label.

### Primary button
**Role:** The one commit action on a form ("Subscribe").

Signal Blue fill, Paper White 13px sans 700 text, 6px radius, 8px 17px padding, roughly 38px tall. Hover darkens the fill toward #0064CC with background-color 0.15s ease; active nudges down 1px. Never used for navigation or secondary actions.

### Retailer pill link
**Role:** Transactional purchase links (Amazon, Random House) in book listings.

Link Blue at 75% opacity (#007AFCBF) fill, Paper White 13px sans 700 text, 6px radius, 8px 17px padding — same geometry as the primary button but translucent and never solid, so it stays one rank below.

## Motion

Quiet and text-first. Links and nav change color over 0.2s ease (0.3s for larger headings); button and field backgrounds transition in 0.15s ease. Content blocks reveal on scroll with a short translate + fade over 0.6s cubic-bezier(0.3, …), staggered per row; laurel and monogram SVGs animate their fill over 0.5s. Hover never scales type — only color, and one 0.25s transform nudge on pressable buttons.

## Layout

A 1140px centered container with a 720px inner measure for prose. The masthead is asymmetric — a circular 'CM' monogram on the left, three nav columns offset right, ruled off underneath with one Iron hairline. Below, the newsletter block is the sole centered composition on the page; everything after it (book feature, essay lists) returns to left-aligned two-column splits at a ~3.8% column gap. Sections are separated by whitespace alone — no panels, no cards, no background changes.

## Imagery

Documentary photography shown full-bleed inside 8px-radius frames with no border: a book on a wooden floor, walking shots from Japan. Natural, warm, low-contrast against the charcoal. Laurels and the CM monogram are flat single-color vector art in Ash/Mist.

## Do and don't

### Do
- Set all running copy in ff-meta-serif-web-pro-1 at 18px / 27px in Ash #DDDDDD; use 13px / 19.5px Slate #666666 for colophon-style fine print.
- Render every label, nav item and button caption in ff-meta-web-pro-1, 13px, weight 700, uppercase, 1px letter-spacing.
- Reserve Paper White #FFFFFF strictly for input fills and text on blue; keep all body and heading text at Ash #DDDDDD.
- Rule sections apart with a single 1px Iron #555555 hairline or pure whitespace — never a panel background or card.
- Keep blue to exactly two registers: solid Signal Blue #2969FF on the primary commit button, Link Blue #007AFC at 75% opacity on retailer pills.

### Don't
- Don't put the sans in paragraphs or the serif in uppercase labels — the family split is absolute.
- Don't use blue for inline prose links: those are Ash #DDDDDD, underlined, and only brighten to Paper White on hover.
- Don't add drop shadows, glows or borders to buttons and cards; the only shadow in the system belongs to floating image blocks.
- Don't introduce radii above 8px or pill-shaped buttons beyond the 6px retailer links; the monogram circle is the only full round shape.
- Don't center anything except the newsletter signup block — everything else stays left-aligned to the 1140px grid.

## Similar brands


## Agent prompt

Rebuild a page in the Craig Mod system: #222222 canvas, 1140px container with a 720px prose measure. All prose is ff-meta-serif-web-pro-1 at 18px/27px in #DDDDDD with underlined #DDDDDD links. All labels, nav and buttons are ff-meta-web-pro-1 13px/700 uppercase with 1px tracking. Section heads are the sans at 28px (700 for loud sections, 500 for quiet ones). One Signal Blue #2969FF button with 6px radius and 8px 17px padding; retailer links use #007AFCBF fills with identical geometry. Email inputs are #FFFFFF with a 2px #EFEFEF border, 5px radius, 20px sans text and a #666666 placeholder. Fine print is 13px serif in #666666. Separate sections with whitespace or a 1px #555555 hairline only. Hover states are color-only at 0.2s ease; buttons darken over 0.15s ease.
