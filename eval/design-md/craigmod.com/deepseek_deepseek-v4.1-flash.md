# Craig Mod — DESIGN.md
> quiet dark literary reading room

**Theme:** dark  
**Source:** https://craigmod.com/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

A near-black editorial surface built for long reading. The canvas is Ash Charcoal #222222 over deep Coal Black #000000, and almost nothing interrupts it: hairline Graphite and Slate rules, no fills, no cards. Type does the whole job. FF Meta, a Typekit sans, carries interface and headlines in weights 400/500/700 — 28px bold for section heads, 26px medium for book titles, 13px bold uppercase with 1px tracking for navigation. FF Meta Serif carries every paragraph of prose at 18px with a 1.5 line height, the single most-used size on the page. Muted inks — Ash Gray #999999 and Muted Gray #666666 — handle metadata and captions, quietly stepping back. Exactly one chromatic event exists: Signal Blue #007AFC, appearing as a 75%-alpha filled button and as underlined inline links. Everything else is monochrome, and every interaction is a slow 0.2s colour fade rather than a movement.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Coal Black | `#000000` | neutral | Deepest surface behind the whole document; the largest measured background area, holding the footer and full-bleed imagery. |
| Ash Charcoal | `#222222` | neutral | Default body background. Everything reads on top of it; it is the page, not a component. |
| Graphite | `#333333` | neutral | Raised panel fill for the rare elevated block (dark-mode surface variable). Never used as text. |
| Slate Rule | `#555555` | neutral | Hairline dividers and the soft-ink step between body text and muted metadata. The only border weight visible as a line. |
| Fog | `#EFEFEF` | neutral | Light surface token: the 2px input border, and the light-theme page fill that appears on inverted blocks. |
| Chalk | `#FFFFFF` | neutral | Input field fill and text sitting on Signal Blue. The brightest tone in the system, reserved for controls. |
| Newsprint | `#DDDDDD` | neutral | Primary text colour for headlines, nav links, body prose and quotes. Effectively the site's ink. |
| Ash Gray | `#999999` | neutral | Faint ink for secondary labels and bylines that must recede but stay legible. |
| Muted Gray | `#666666` | neutral | Lowest-priority ink: disclaimer lines, publication credits, input placeholders, and the resting state of otherwise-invisible links. |
| Signal Blue | `#007AFC` | accent | The only chromatic colour. Filled buttons use the same hue at 75% alpha (#007AFCBF, over dark it measures #2969FF); inline and nav links use the solid tone. Signals action, nothing else. |

## Typography

### ff-meta-web-pro-1 — ui
Interface voice: navigation, buttons, headlines, labels. Weight 700 is reserved for the small uppercase navigation and 28px section heads; 500 handles medium-weight titles such as book names, so nothing around the prose ever feels heavy.
- **Fallback:** -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif
- **Weights:** 400, 500, 700
- **Sizes:** 13px nav and captions, 20px input text, 26-28px headlines, 32px section display
- **Line height:** 1.5 on small text, 1.1 on 26px titles, normal on 28px+ heads
- **Letter spacing:** 1px on 13px uppercase links, 2px on the 11px footer mark, normal elsewhere

### ff-meta-serif-web-pro-1 — body
Reading voice: all paragraphs, newsletter descriptions, book blurbs, quotes, and the credit lines. Serif at 18px is the most frequent type setting on the page; italics carry titles and pull-quotes.
- **Fallback:** ff-meta-serif-web-pro-2, Georgia, Times, serif
- **Weights:** 400, 500
- **Sizes:** 18px body, 13px captions, 21.6px small titles
- **Line height:** 1.5 for 18px and 13px, 1.55 for quote prose, 1.1 for 21.6px titles
- **Letter spacing:** normal throughout

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | ff-meta-serif-web-pro-1 | 400 | 13px | 1.5 | normal |
| body-sm | ff-meta-web-pro-1 | 700 | 13px | 1.5 | 1px |
| body | ff-meta-serif-web-pro-1 | 400 | 18px | 1.5 | normal |
| subtitle | ff-meta-web-pro-1 | 400 | 20px | 1.5 | normal |
| title-sm | ff-meta-serif-web-pro-1 | 400 | 21.6px | 1.1 | normal |
| title | ff-meta-web-pro-1 | 500 | 26px | 1.1 | normal |
| title-lg | ff-meta-web-pro-1 | 700 | 28px | 1.2 | normal |
| display | ff-meta-web-pro-1 | 700 | 32px | 1.15 | normal |

## Spacing and layout

**Density:** airy

- **Base unit:** ، 4px
- **Max page width:** 1140px container, 720px for prose columns
- **Section gap:** 30px between text groups, 20px inside them
- **Card padding:** 20px 15px in contained panels
- **Element gap:** 8px between a label and its control, 12px between stacked metadata lines

### Border radii

- **input:** 5px
- **button:** 6px
- **panel:** 8px

## Elevation

Almost none. A single shadow — rgba(0,0,0,0.28) 0 10px 26px — sits under the pushable blue button to make it physically depress on hover; everywhere else, surfaces are separated by 1px Slate or Graphite rules rather than drop shadows.

## Components

### Primary action button
**Role:** The single chromatic control: newsletter subscribe, buy link, checkout.

Signal Blue at 75% alpha fill (#007AFCBF), Chalk #FFFFFF text, ff-meta-web-pro-1 13px weight 700, padding 8px 17px, radius 6px, no border. Shadow rgba(0,0,0,0.28) 0 10px 26px. Hover: lift with transform 0.25s ease plus a slight increase in blue opacity; active pushes back down into the shadow.

### Text input
**Role:** Email capture and any single-line form field.

Fog #EFEFEF fill, 2px solid Fog #EFEFEF border, radius 5px, padding 4px 10px, ff-meta-web-pro-1 20px weight 400, text Ash Charcoal #222222, placeholder Muted Gray #666666. On focus the border darkens to Slate #555555; background stays light against the dark page.

### Uppercase navigation link
**Role:** Header and footer menus, section anchors.

ff-meta-web-pro-1 13px weight 700, Newsprint #DDDDDD, uppercase, letter-spacing 1px, padding 3px 0, no underline. Colour transitions with `color 0.2s ease`; hover dims toward Ash Gray #999999 rather than highlighting.

### Inline body link
**Role:** References inside prose and metadata credits.

ff-meta-serif-web-pro-1 18px weight 400, underlining the text itself; at rest Muted Gray #666666 inside credit lines, Newsprint #DDDDDD inside quotes and body copy. Hover resolves to Signal Blue #007AFC with `color 0.2s ease` — no background, no box.

### Metadata label
**Role:** Publication credits, subscriber counts, checkbox labels, attribute lines.

ff-meta-serif-web-pro-1 13px weight 400, line-height 1.5, Muted Gray #666666, margin 0 0 20px. Paired with a native checkbox at 13.33px; the label text stays Newsprint #DDDDDD where it must be read, Muted Gray where it is a footnote.

## Motion

Interaction is colour, not movement. Links fade with `color 0.2s ease`; backgrounds shift at 0.15s; only the blue button and image reveals use transform (0.25s ease and 0.6s cubic-bezier for scroll-in). Nothing bounces, nothing scales up, nothing slides.

## Layout

Centered single column on a 1140px container; prose narrows to 720px. The header is a four-column text grid of uppercase links against Coal Black, then a centered newsletter block, a row of three text-only award badges, and a two-column book feature where a full-bleed photograph meets serif copy. Vertical rhythm comes from 30px gaps between groups, not from boxes or dividers.

## Imagery

Full-bleed, warm-toned photography (wood, paper, hands) dropped straight onto the black field with 8px corners at most; images are the only warm colour in an otherwise monochrome page and are never framed or captioned with chrome.

## Do and don't

### Do
- Set every paragraph in ff-meta-serif-web-pro-1 at 18px / 1.5, Newsprint #DDDDDD on Ash Charcoal #222222 — this is the default reading state.
- Reserve Signal Blue #007AFC for one button and inline links; keep it at 75% alpha when it fills an area.
- Use ff-meta-web-pro-1 weight 700 only at 13px uppercase (1px tracking) and at 28px+ section heads; leave 26px titles at weight 500.
- Separate sections with 30px of empty space and 1px Slate #555555 rules rather than cards or shadows.
- Fade every state change with `color 0.2s ease`; keep transforms for the blue button only.
- Keep body columns at 720px and the overall container at 1140px.

### Don't
- Do not introduce a second accent hue; the system has exactly one, and it is a link blue.
- Do not set prose in the sans face — it is for interface and headlines only.
- Do not use pure #FFFFFF for body text; it is for input fills and text on blue.
- Do not add drop shadows to text blocks, panels or images; only the blue button casts one.
- Do not bold anything inside a paragraph or a headline body — 400 and 500 do that work.
- Do not animate size, position or opacity on hover; the page moves only on scroll reveals.
- Do not wrap content in bordered cards on this dark surface; it reads as chrome.

## Similar brands


## Agent prompt

Build a dark literary editorial page. Body background Ash Charcoal #222222 with Coal Black #000000 behind full-bleed imagery. All prose uses ff-meta-serif-web-pro-1 (fallback Georgia, serif) 18px / 1.5 in Newsprint #DDDDDD; all interface and headlines use ff-meta-web-pro-1 with weight 700 at 13px uppercase (1px tracking) and at 28-32px headings, weight 500 at 26px titles. Accent is Signal Blue #007AFC — solid for inline links, 75% alpha for the one filled button with radius 6px and a rgba(0,0,0,0.28) 0 10px 26px shadow. Inputs are Fog #EFEFEF with a 2px Fog border, radius 5px, 20px sans text. Metadata sits at Muted Gray #666666, secondary ink at Ash Gray #999999. Separate sections with 30px gaps and 1px #555555 rules; no cards, no second accent, no shadows except under the button. Transitions: color 0.2s ease everywhere, transform only on the button.
