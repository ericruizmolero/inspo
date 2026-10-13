# {{PRODUCT}} design system

> Extracted from {{SOURCE}} on {{DATE}}. Agents: read this before building or restyling any UI in this project, and match it instead of inventing new styles. Values marked *(inferred)* weren't defined anywhere and were picked from what the page renders most.

## Brand in one line

{{ONE_LINE_FEEL}} <!-- e.g. "Warm, editorial and calm: off-white paper, near-black ink, one purple accent used sparingly." -->

## Color

| Token | Value | Use |
|-------|-------|-----|
| `background` | {{HEX}} | Page background |
| `surface` | {{HEX}} | Cards, panels, inputs |
| `ink` | {{HEX}} | Headings, primary text |
| `ink-muted` | {{HEX}} | Body and secondary text |
| `ink-subtle` | {{HEX}} | Captions, placeholders, meta |
| `border` | {{HEX}} | Dividers, card and input borders |
| `primary` | {{HEX}} | Primary buttons and key links |
| `primary-foreground` | {{HEX}} | Text on primary |
| `accent` | {{HEX}} | Highlights, badges, focus rings (if distinct from primary) |
| `success` / `warning` / `danger` | {{HEX}} | Status (only if the source has them) |

Shade scales, if the source has them: `primary-50 … primary-900` with hex values.

**Where it's defined:** {{FILE_OR_URL}} (CSS variables / Tailwind theme / tokens file).

## Typography

| Role | Font | Size / line-height | Weight | Letter-spacing |
|------|------|-------------------|--------|----------------|
| Display (H1) | {{FONT}} | {{SIZE}} / {{LH}} | {{W}} | {{LS}} |
| H2 | | | | |
| H3 | | | | |
| Body | | | | |
| Small / caption | | | | |
| Eyebrow / label | | | | (uppercase? tracking?) |
| Mono (if used) | | | | |

Fonts load from: {{HOW}} (Google Fonts link / `@fontsource` / self-hosted). Fallback stack: {{STACK}}.
Mobile: H1 drops to {{SIZE}}.

## Spacing

Base unit {{4 or 8}}px. Scale in use: {{4, 8, 12, 16, 24, 32, 48, 64, 96}}.

- Inside components (button padding, card padding): {{VALUES}}
- Between elements in a group: {{VALUES}}
- Between sections: {{DESKTOP}} desktop / {{MOBILE}} mobile
- Content max-width: {{WIDTH}}; side padding {{DESKTOP}} / {{MOBILE}}

## Radius

| Token | Value | Use |
|-------|-------|-----|
| `sm` | | Badges, small controls |
| `md` | | Buttons, inputs |
| `lg` | | Cards |
| `full` | 9999px | Pills, avatars |

## Elevation

| Token | Value | Use |
|-------|-------|-----|
| `shadow-sm` | | Resting cards |
| `shadow-lg` | | Popovers, sticky bars, hover |

Borders vs shadows: {{e.g. "cards use a 1px border and no shadow; only floating UI gets a shadow"}}

## Components

### Buttons
| Variant | Background | Text | Border | Radius | Height / padding | Weight | Used for |
|---------|-----------|------|--------|--------|------------------|--------|----------|
| Primary | | | | | | | The one main action per view |
| Secondary | | | | | | | |
| Ghost / link | | | | | | | |

States: hover {{…}}, focus {{…}}, disabled {{…}}.

### Cards
{{background, border, radius, padding, shadow, hover}}

### Inputs
{{height, border, radius, focus ring, placeholder color}}

### Badges / pills
{{…}}

### Section patterns
{{How sections are built: alternating backgrounds? eyebrow + H2 + subhead header? centered or left-aligned? how the hero, logo row, pricing and footer look}}

## Do

- {{Concrete rule, e.g. "One primary (purple) button per screen; everything else is outline or ghost."}}
- {{…}}
- {{…}}

## Don't

- {{Concrete rule, e.g. "No gradients on buttons or text."}}
- {{e.g. "No pure black (#000) or pure white text on colored backgrounds; use ink / primary-foreground."}}
- {{…}}

## Source of truth

- Tokens: {{path to the CSS/Tailwind/token file, or "not in code yet — see Color/Typography above"}}
- Components: {{path to the shared UI components}}
- When this file and the code disagree, the code wins; update this file.
