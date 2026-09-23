# (Not Boring) Software — DESIGN.md
> playful software in open space

**Theme:** light  
**Source:** https://notbor.ing/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

The site presents everyday software as something to enjoy rather than merely use. Its restraint makes that promise more distinctive: a small, colorful mark and a compact navigation sit above an unusually large white media area, while the first substantial copy arrives on a broad #ececec surface. Founders Grotesk supplies the personality, moving from a 76px, 700-weight declaration to repeated 44px statements that pair 600-weight assertions with 400-weight follow-ups. Jet Brains gives uppercase navigation and small labels a deliberate, technical counterpoint. Near-black #232323 copy, pure #000000 controls, and generous 100px section padding keep the page direct and legible; #ffb200 is a concentrated brand accent rather than a general UI fill. Across the longer page, product imagery and video can carry the exuberance without requiring decorative interface chrome. Flat surfaces, sparse borders, modest button corners, and no measured shadows preserve the contrast between playful content and a remarkably simple frame.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Play Yellow | `#ffb200` | brand | A concentrated brand accent for prominent visual moments rather than routine controls. |
| Ink Black | `#000000` | neutral | Defines navigation, high-contrast controls, and the strongest text. |
| Soft Charcoal | `#232323` | neutral | Carries large editorial statements with slightly less severity than pure black. |
| Quiet Gray | `#aaaaaa` | neutral | Subdues small secondary text; the measured page also contains a nearby lighter gray. |
| Inset Gray | `#e0e0e0` | neutral | Separates lighter-gray areas from the main content surface. |
| Gallery Gray | `#ececec` | neutral | Forms expansive section backgrounds behind oversized copy. |
| Paper White | `#ffffff` | neutral | Provides the open page background and text on black buttons. |

## Typography

### Founders Grotesk — display
Used for expressive headings, article copy, buttons, and the email field. Its signature move is a 44px statement that changes from weight 600 to 400 without changing size.
- **Fallback:** Arial, Helvetica, sans-serif
- **Weights:** 400, 600, 700
- **Sizes:** 22–76px · 6 values
- **Line height:** 20–76px, according to role
- **Letter spacing:** normal

### Jet Brains — ui
Used for uppercase navigation and compact utility labels. Its monospaced texture sets a technical rhythm against the broad, conversational headings.
- **Fallback:** 'JetBrains Mono', monospace
- **Weights:** 400, 700
- **Sizes:** 12–16px · 2 values
- **Line height:** 18–20px
- **Letter spacing:** normal; 1px appears on small labels

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | Jet Brains | 700 | 12px | 1.67 | 1px |
| body-sm | Jet Brains | 400 | 16px | 1.13 | normal |
| body | Founders Grotesk | 400 | 24px | 1.4 | normal |
| subtitle | Founders Grotesk | 600 | 22px | 0.91 | normal |
| title-sm | Founders Grotesk | 600 | 36px | 1 | normal |
| title | Founders Grotesk | 600 | 44px | 1.2 | normal |
| display | Founders Grotesk | 700 | 76px | 1 | normal |

## Spacing and layout

**Density:** airy

- **Base unit:** 10px
- **Max page width:** 1200px outer container; 880px reading width
- **Section gap:** 100px vertical padding
- **Card padding:** Not established; no recurring card primitive was measured
- **Element gap:** 60px for major groups; 10–40px for local separation

### Border radii

- **Standard buttons:** 4px
- **Subscribe button:** 8px
- **Text input and links:** 0px

## Elevation

Flat surface changes and an occasional 2px black border create separation. No box shadows were measured.

## Components

### Primary button
**Role:** Directs visitors to download.

Ink Black background, Paper White subtitle text, and standard button radius; 12px 30px 15px padding, with no border or shadow.

### Secondary button
**Role:** Offers outlined actions such as viewing more work or subscribing.

Ink Black text and 2px Ink Black border; standard version has a Paper White background and 12px 30px 15px padding. The Subscribe variant is transparent, uses the 8px radius, and has 13px 24px 16px padding.

### Input
**Role:** Accepts an email address for the newsletter.

Transparent background, Ink Black body text, square corners, no visible border, and 8px horizontal padding.

### Link
**Role:** Provides primary navigation and smaller utility navigation.

Uppercase Jet Brains text with no border or fill; primary navigation uses body-sm styling, while subdued utility links use Quiet Gray caption styling.

### Header
**Role:** Keeps the brand mark, site navigation, and download action available at the top.

Paper White, wide horizontal alignment, a small mark at left, spaced links at right, and the Primary button at the far edge; avoid a shadow or enclosing panel.

## Motion

A measured background-color transition uses 300ms ease. Scroll animations exist, but their timing and movement are not established; keep them restrained and do not add motion to every control.

## Layout

Use a broad 1200px outer container and narrower 880px text blocks. Alternate white and pale-gray expanses, with roughly 100px vertical section padding and 60px between major groups. Allow exceptional amounts of whitespace around media; align long-form statements to a consistent inner column rather than filling the viewport with UI.

## Imagery

Product-led imagery and video provide much of the visual energy across the long page. Give them generous space and minimal framing; the large white media area visible in the supplied capture does not establish a permanent blank-content treatment.

## Do and don't

### Do
- Pair 600-weight and 400-weight Founders Grotesk statements at the same 44px size.
- Set short navigation labels in uppercase Jet Brains.
- Keep major reading blocks within the 880px column.
- Use broad Paper White and Gallery Gray surfaces with substantial vertical breathing room.
- Let product media supply the colorful, playful detail.
- Reserve Play Yellow for emphatic brand moments.

### Don't
- Do not turn the page into a dense dashboard or tiled card grid.
- Do not use yellow as the default button background; the measured primary action is black.
- Do not add drop shadows, gradients, or frosted panels to create depth.
- Do not substitute monospaced type for the large editorial headings.
- Do not compress the oversized media and whitespace into conventional hero spacing.
- Do not invent elaborate hover or scroll effects beyond the limited motion evidence.

## Similar brands

- **Panic** — Pairs characterful software products with direct, spacious presentation.
- **Teenage Engineering** — Lets playful product design contrast with a restrained interface frame.
- **Things** — Uses disciplined typography and open space to present everyday software as a crafted product.

## Agent prompt

Create a light, spacious site for (Not Boring) Software. Use Paper White and Gallery Gray as large alternating surfaces, Ink Black for navigation and primary actions, Soft Charcoal for editorial copy, and Play Yellow only as a concentrated accent. Set expressive copy in Founders Grotesk, especially 44px lines alternating weights 600 and 400; use uppercase Jet Brains for small navigation. Work within a 1200px container and 880px reading column, with generous 100px section padding. Let product media bring the playfulness. Keep controls flat, borders sparse, and shadows absent.
