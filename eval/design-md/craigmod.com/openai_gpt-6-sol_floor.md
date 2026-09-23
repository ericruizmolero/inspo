# Craig Mod — DESIGN.md
> quiet literary studio after dark

**Theme:** dark  
**Source:** https://craigmod.com/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

Craig Mod’s homepage feels like a writer’s personal archive rather than a conventional storefront: quiet, generous, and built for reading. A Charcoal #222222 canvas carries Soft Ivory #dddddd text, while FF Meta Web Pro gives navigation, headings, and controls a clear editorial structure. FF Meta Serif Web Pro takes over for descriptions, quotations, and longer passages, making the shift from interface to prose unmistakable. The narrow, centered newsletter form sits in ample empty space before the page opens into photography, books, endorsements, and essays. Navigation is small, uppercase, bold, and tracked; headings remain modest beside the imagery. Electric blue #2969ff is reserved for decisive actions, with translucent Link Blue #007afcbf appearing on purchase links. White #ffffff inputs and occasional Pale Paper #efefef surfaces provide contrast without turning the site into a bright dashboard. Rules, muted metadata, and restrained rounding keep a long, varied page coherent.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Deep Black | `#000000` | neutral | Provides the deepest background areas and contrast beneath dark-page content. |
| Charcoal | `#222222` | neutral | Forms the principal dark page canvas. |
| Slate Rule | `#555555` | neutral | Defines restrained borders and dividers against the dark canvas. |
| Muted Ink | `#666666` | neutral | Sets quiet publication details, form hints, and fine print. |
| Faint Silver | `#999999` | neutral | Supports secondary labels that should remain legible but recede. |
| Soft Ivory | `#dddddd` | neutral | Carries most headings, prose, and navigation on dark surfaces. |
| Pale Paper | `#efefef` | neutral | Supplies light section surfaces and the border of the white email field. |
| Paper White | `#ffffff` | neutral | Fills input surfaces and sets text on blue action links. |
| Electric Blue | `#2969ff` | brand | Marks the main subscription action against the otherwise subdued palette. |
| Link Blue | `#007afcbf` | accent | Gives compact purchase links a translucent blue fill. |

## Typography

### ff-meta-web-pro-1 — ui
Used for navigation, headings, form controls, and action labels. Small tracked capitals organize the header, while 500 and 700 weights establish hierarchy without oversized display typography.
- **Fallback:** -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif
- **Weights:** 400, 500, 700
- **Sizes:** 13-32px · 6 values
- **Line height:** Mostly normal; 1.1 for selected headings and 1.5 for compact links
- **Letter spacing:** normal; 1px for uppercase navigation

### ff-meta-serif-web-pro-1 — body
Used for descriptive copy, essay links, quotations, and supporting publication information. Its regular-weight, comfortably spaced prose makes the page feel authored rather than promotional.
- **Fallback:** Georgia, Times, serif
- **Weights:** 400, 500
- **Sizes:** 13-22px · 4 values
- **Line height:** Usually 1.5; approximately 1.1 for small editorial titles
- **Letter spacing:** normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | ff-meta-web-pro-1 | 700 | 13px | 1.3 | 1px |
| body-sm | ff-meta-serif-web-pro-1 | 400 | 14px | 1.5 | normal |
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
- **Section gap:** 60-90px
- **Card padding:** 20px
- **Element gap:** 10-30px

### Border radii

- **Email input:** 5px
- **Compact action link:** 6px
- **Primary button:** 8px
- **Circular monogram:** 50%

## Elevation

Depth comes primarily from contrasting surfaces and fine rules, not stacked cards. Selected raised elements use a restrained 0 10px 26px #00000047 shadow.

## Components

### Header
**Role:** Provides a compact directory to the writer’s work and channels.

Place the circular monogram and grouped caption-scale links within the 1140px container; use uppercase labels, 3px vertical link padding, and a thin Slate Rule divider.

### Link
**Role:** Connects prose and navigation to essays, publishers, and other destinations.

Keep editorial links inline and visibly underlined where context calls for it; transition text color over 0.2s ease. Header links instead use the tracked uppercase caption treatment.

### Input
**Role:** Collects an email address for newsletter subscriptions.

Use a Paper White surface, Pale Paper 2px border, 5px radius, and 4px 10px padding; pair it with native newsletter checkboxes.

### Primary button
**Role:** Submits the newsletter form.

Use an Electric Blue fill, Paper White label, approximately 44px height, and 8px radius; keep the treatment solid rather than outlined.

### Secondary button
**Role:** Presents compact outbound purchase choices.

Style the link with a Link Blue fill, Paper White bold label, 6px radius, and approximately 8px 17px padding; ease background-color changes over 0.15s.

## Motion

Keep motion unobtrusive: link colors ease over 0.2-0.3s, action backgrounds over 0.15-0.3s, and small interaction transforms over 0.25s. Some scroll-driven transforms use approximately 0.6s easing; prose and page structure should otherwise remain still.

## Layout

Center the page in a 1140px maximum-width container. Use a narrow centered form and generous vertical pauses near the top, then alternate spacious image-and-text compositions with reading-oriented sections. Align prose to clear columns and preserve substantial margins around photography.

## Imagery

Use real book, walking, and photographic imagery rather than illustration. Let images occupy meaningful space beside text, retain their natural color, and avoid heavy overlays or decorative frames.

## Do and don't

### Do
- Set the main reading canvas to Charcoal and most copy to Soft Ivory.
- Use FF Meta Web Pro for interface hierarchy and FF Meta Serif Web Pro for prose.
- Keep navigation at caption scale, uppercase, bold, and tracked by 1px.
- Constrain content to 1140px and give the opening form generous breathing room.
- Reserve Electric Blue for clear actions and Link Blue for compact purchase links.
- Use underlines and muted metadata to distinguish editorial references from actions.

### Don't
- Do not replace the dark reading canvas with an all-white landing-page layout.
- Do not introduce oversized, high-contrast display headlines.
- Do not render long passages in the UI sans serif.
- Do not turn every section into a raised card or add heavy shadows.
- Do not use blue for ordinary headings, dividers, or body links indiscriminately.
- Do not substitute generic illustrations for books and original photography.

## Similar brands

- **The Creative Independent** — An editorial reading experience that gives creative work room to breathe.
- **Kottke.org** — A personal, link-rich publishing sensibility with typography ahead of interface chrome.
- **The Marginalian** — Literary content, book imagery, and a distinct authorial voice shape the presentation.

## Agent prompt

Build a dark, literary homepage for Craig Mod using a #222222 canvas, #dddddd reading text, FF Meta Web Pro for navigation and headings, and FF Meta Serif Web Pro for prose. Center content within 1140px, keep the newsletter form narrow and spacious, and follow it with substantial book photography and editorial text. Make navigation small, bold, uppercase, and tracked. Use #2969ff for the primary action and restrained blue purchase links. Favor underlines, quiet rules, muted metadata, minimal shadows, and generous pauses over cards or animated decoration.
