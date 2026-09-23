# Craig Mod — DESIGN.md
> quiet books after dark

**Theme:** dark  
**Source:** https://craigmod.com/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Craig Mod’s homepage feels like an author’s reading room rather than a conventional portfolio: intimate, text-led, and generous with space despite its near-black #222222 canvas. A restrained header sets small, uppercase FF Meta Web Pro links above a centered newsletter invitation; the first substantial image arrives only after the subscription form and a row of book-award laurels. FF Meta Serif Web Pro carries the conversational descriptions, quotations, and publishing details, while the sans serif gives headings and navigation a clear, modest structure. Most copy is soft #dddddd, with #666666 and #999999 reserved for details that should recede. The white email field and vivid #2969ff Subscribe button provide the page’s strongest interface contrast without turning the whole site blue. Farther down, large book and photography images sit beside editorial copy in an open 1140px layout. Thin rules, understated links, and minimal surface decoration let the writing, walking, and books remain the subject.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Night | `#222222` | neutral | The continuous dark page background keeps long editorial sections visually connected. |
| Charcoal | `#333333` | neutral | A subtle raised dark surface where the interface needs separation from Night. |
| Slate Rule | `#555555` | neutral | Quiet borders and dividers on the dark canvas. |
| Faded Ink | `#666666` | neutral | Low-emphasis publishing details and subscription reassurance. |
| Silver | `#999999` | neutral | Secondary labels and navigation that should remain legible without leading. |
| Reading White | `#dddddd` | neutral | Primary text and headings, softened for sustained reading on Night. |
| Paper Edge | `#efefef` | neutral | The light border around white form fields. |
| Paper White | `#ffffff` | neutral | Email-field fill and high-contrast text on blue actions. |
| Subscribe Blue | `#2969ff` | accent | The decisive subscription action and small interactive highlights; other measured blue treatments appear to be related variations. |

## Typography

### ff-meta-web-pro-1 — ui
Used for navigation, headings, form text, and actions. Its recognisable move is compact, tracked uppercase navigation against straightforward mixed-case headings, without oversized display lettering.
- **Fallback:** -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif
- **Weights:** 400, 500, 700
- **Sizes:** 13–32px · 7 values
- **Line height:** Normal for headings and navigation; approximately 1.5 for smaller interface text.
- **Letter spacing:** Normal; 1px on uppercase navigation.

### ff-meta-serif-web-pro-1 — body
Carries newsletter descriptions, essay text, quotations, and quiet metadata. Regular-weight 18px copy at a 27px line height does most of the editorial work; emphasis comes from italics and context rather than heavy bold.
- **Fallback:** Georgia, Times, serif
- **Weights:** 400, 500
- **Sizes:** 13–22px · 4 values
- **Line height:** 1.5 for reading copy; approximately 1.1 for short essay titles.
- **Letter spacing:** Normal.

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | ff-meta-serif-web-pro-1 | 400 | 13px | 1.5 | normal |
| body-sm | ff-meta-web-pro-1 | 400 | 15px | 1.5 | normal |
| body | ff-meta-serif-web-pro-1 | 400 | 18px | 1.5 | normal |
| subtitle | ff-meta-web-pro-1 | 400 | 20px | 1.5 | normal |
| title-sm | ff-meta-serif-web-pro-1 | 400 | 22px | 1.1 | normal |
| title | ff-meta-web-pro-1 | 500 | 26px | 1.1 | normal |
| title-lg | ff-meta-web-pro-1 | 700 | 28px | 1.2 | normal |
| display | ff-meta-web-pro-1 | 700 | 32px | 1.2 | normal |

## Spacing and layout

**Density:** airy

- **Base unit:** 10px
- **Max page width:** 1140px
- **Section gap:** 70–90px
- **Card padding:** 20px
- **Element gap:** 8–30px

### Border radii

- **Email input:** 5px
- **Action links and buttons:** 6px
- **Large image corners:** 8px
- **Monogram mark:** 50%

## Elevation

Depth is mostly typographic and photographic, with thin Slate Rule borders rather than stacked cards. A few raised elements use 0 10px 26px #00000047; keep shadows exceptional.

## Components

### Header
**Role:** Provides the monogram, site destinations, and social access without competing with the writing.

Place within the 1140px container with a fine bottom rule; arrange the small uppercase links in loose columns, using 1px tracking and modest 3px vertical link padding.

### Input
**Role:** Collects an email address for newsletter subscription.

Paper White fill, Paper Edge 2px border, Faded Ink placeholder, and 5px radius; use 4px 10px internal padding and approximately 20px sans-serif text.

### Primary button
**Role:** Confirms newsletter subscription.

Subscribe Blue fill and Paper White bold label, approximately 44px high with a 6px radius; keep it compact and centered beneath the opt-in choices.

### Secondary button
**Role:** Presents compact purchase or destination actions near books.

Use the blue accent with a slightly translucent treatment, Paper White bold text, 6px radius, and approximately 8px 17px padding; avoid making it larger than the primary subscription action.

### Link
**Role:** Connects prose, publishing credits, and navigation to further reading.

Keep prose links text-like and underlined or otherwise quietly distinguished; header links are uppercase, bold, and tracked. Transition color over 0.2s ease rather than adding movement.

## Motion

Color changes take 0.2–0.3s ease; occasional background changes take 0.15–0.3s ease. A few visual elements use transform transitions, including a 0.6s cubic-bezier treatment, but reading text and the main page structure should remain still. Scroll animation exists but should be restrained.

## Layout

Use a centered 1140px outer container and narrower reading areas around 720px. The header is horizontally distributed; the newsletter invitation is centered. Editorial content alternates between narrow text groupings and generous image-plus-copy arrangements, with substantial dark space between sections and alignment anchored to shared container edges.

## Imagery

Use real photographs, particularly tactile books, travel, and observations from walking, rather than illustration or abstract decoration. Images are relatively few and large; let their natural colors provide warmth against the dark monochrome page. Award laurels function as small graphic endorsements, not a repeating ornamental language.

## Do and don't

### Do
- Keep Night continuous behind the principal editorial content.
- Set long-form copy in 18px FF Meta Serif Web Pro with a 27px line height.
- Use compact 13px uppercase FF Meta Web Pro navigation with 1px tracking.
- Center the newsletter form and give it ample space before the book imagery.
- Reserve Subscribe Blue for actions and minor interactive emphasis.
- Let large, genuine book and travel photography interrupt the text rhythm.

### Don't
- Do not replace the dark reading canvas with white content cards.
- Do not turn every text link into a bright blue button.
- Do not introduce a giant display headline above the subscription invitation.
- Do not use decorative gradients or illustrations in place of photographs.
- Do not crowd the header links into a dense single-line menu.
- Do not animate paragraphs or rely on heavy shadows for section separation.

## Similar brands

- **Austin Kleon** — An author-led web presence where books, newsletters, and informal writing share the stage.
- **Kottke.org** — A personal editorial site that privileges readable links and sustained browsing over product-interface chrome.
- **Robin Sloan** — Literary internet sensibility with publishing projects presented as part of a wider personal practice.
- **The Creative Independent** — Restrained typography and an editorial-first treatment of creative work and reading.

## Agent prompt

Build an author-and-photographer homepage with a continuous #222222 background, soft #dddddd text, and generous dark breathing room. Use FF Meta Web Pro for compact uppercase navigation, headings, and controls; use FF Meta Serif Web Pro for 18px reading copy with a 27px line height. Center a modest newsletter form with a white email field and one #2969ff action. Work within a 1140px container, narrowing prose toward 720px. Introduce large, authentic book and travel photographs alongside text, with thin rules and quiet links instead of card-heavy UI.
