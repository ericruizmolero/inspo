# Craig Mod — DESIGN.md
> dark reading room, ink and lamplight

**Theme:** dark  
**Source:** https://craigmod.com/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

A writer's homepage that behaves like a well-set book page moved into a dark room. The field is Deep Ink #222222 with body text at Soft Paper #dddddd, and everything is centered in a 1140px container that narrows to 720px for reading. Two FF Meta families do all the work: ff-meta-web-pro-1 (sans) for navigation, headings and buttons, ff-meta-serif-web-pro-1 (serif) for every paragraph, caption and essay title at 18px/27px. Navigation is 13px uppercase bold with 1px letter-spacing, in tidy multi-column blocks under a hairline #555555 rule. Emphasis is rationed: headings sit at 26-32px in weight 500 or 700, never larger; secondary information drops to Muted Ink #666666 rather than shrinking. Only one saturated color exists, Signal Blue #2969ff for the Subscribe button and #007afc-at-75% pill links, plus a white 5px-radius input that is the brightest object on the page. Shadows appear once: 0 10px 26px rgba(0,0,0,.28) under photography.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Deep Ink | `#222222` | neutral | Page background for the whole site, the dark-mode base (--dm-bg). |
| Void | `#000000` | neutral | Full-bleed photographic and section blocks that sink below the page field. |
| Slate Surface | `#333333` | neutral | Raised panel and inline highlight surface against Deep Ink. |
| Hairline | `#555555` | neutral | 1px rules under the header and between list rows; also dividers in cards. |
| Muted Ink | `#666666` | neutral | Secondary text: publisher lines, subscriber counts, inline meta links. |
| Ash | `#999999` | neutral | Footer wordmark and smallest uppercase labels, quieter than Muted Ink. |
| Soft Paper | `#dddddd` | neutral | Default body and heading text color, the reading ink of the site. |
| Bright White | `#ffffff` | neutral | Input field fill and text on colored buttons; the page's only pure white. |
| Input Edge | `#efefef` | neutral | 2px border of the white email input, keeping it readable on dark. |
| Signal Blue | `#2969ff` | accent | The single call-to-action color, used on the Subscribe button only. |
| Link Blue Veil | `#007afcbf` | accent | 75%-opacity blue pill background for retailer and secondary action links. |

## Typography

### ff-meta-web-pro-1 — ui
FF Meta Web Pro carries all structure: navigation, section headings (28px/700 or 500), the Subscribe button and the input. The signature is uppercase 13px bold with 1px tracking used as the only navigation treatment, and headings that stop at 32px.
- **Fallback:** -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif
- **Weights:** 400, 500, 700
- **Sizes:** 11-32px · 7 values
- **Line height:** normal to 1.1 on headings, 1.5 on small labels
- **Letter spacing:** normal for headings, 1px on 13px nav, 2px on 11px footer

### ff-meta-serif-web-pro-1 — body
FF Meta Serif handles every paragraph, pull quote, caption and essay title at 18px/27px. Italics do real work for book titles and quotes; essay titles sit at 22px regular rather than bold, so hierarchy comes from family switch, not weight.
- **Fallback:** Georgia, Times, serif
- **Weights:** 400, 500
- **Sizes:** 13-22px · 5 values
- **Line height:** 1.5 (18px/27px)
- **Letter spacing:** normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | ff-meta-web-pro-1 | 700 | 11px | 1.5 | 2px |
| body-sm | ff-meta-serif-web-pro-1 | 400 | 13px | 1.5 | normal |
| body | ff-meta-serif-web-pro-1 | 400 | 18px | 1.5 | normal |
| subtitle | ff-meta-web-pro-1 | 400 | 20px | 1.2 | normal |
| title-sm | ff-meta-serif-web-pro-1 | 400 | 22px | 1.1 | normal |
| title | ff-meta-web-pro-1 | 500 | 26px | 1.1 | normal |
| title-lg | ff-meta-web-pro-1 | 700 | 28px | 1.15 | normal |
| display | ff-meta-web-pro-1 | 700 | 32px | 1.1 | normal |

## Spacing and layout

**Density:** comfortable

- **Base unit:** 5px (10/15/20/30 steps)
- **Max page width:** 1140px container, 720px reading measure
- **Section gap:** 60-80px between blocks, 30px inside
- **Card padding:** 20px 15px
- **Element gap:** 20px vertical, 3.8% column gap

### Border radii

- **Email input:** 5px
- **Pill link / retailer button:** 6px
- **Image and media block:** 8px
- **Inline tag or badge:** 3px
- **Avatar monogram:** 50%

## Elevation

Almost flat. Depth comes from surface steps (#000000 blocks below #222222 field, #333333 panels above it) and 1px #555555 rules. The single shadow is 0 10px 26px rgba(0,0,0,0.28) applied to book and photo blocks; buttons and cards carry none.

## Components

### Primary button
**Role:** Submits the newsletter subscription, the page's one conversion action.

Signal Blue background, Bright White label in sans bold 18px, 6px radius, padding 9px 20px, no border; hover darkens toward #0064cc over background-color 0.15s ease, active presses down 1px (pushable).

### Secondary button
**Role:** Retailer and outbound links presented as compact pills.

Link Blue Veil background, Bright White sans bold body-sm label, 6px radius, padding 8px 17px; hover raises opacity to full blue, no border or shadow.

### Input
**Role:** Email capture field.

Bright White fill with 2px Input Edge border, 5px radius, padding 4px 10px, subtitle-size sans text, placeholder in Muted Ink; focus keeps the white fill and shifts the border to Signal Blue.

### Link
**Role:** Inline text links inside serif prose and uppercase nav links.

Prose links use Soft Paper or Muted Ink with a 1px underline, hover to Bright White over color 0.2s ease. Nav links are sans bold body-sm uppercase with 1px tracking, padding 3px 0, no underline, hover to Bright White.

### Header
**Role:** Persistent identity plus three-column link index at the top of the page.

Deep Ink background, 1140px container, circular monogram left, two stacked link columns center-left and center-right, social icon far right; closed by a 1px Hairline rule with roughly 20px padding above and below.

## Motion

Restrained and mostly color-based: color 0.2s ease on the majority of links, color 0.3s ease on headings, background-color 0.15s ease on buttons. Image and card lifts use transform 0.25s ease, with one slower transform 0.6s cubic-bezier for scroll-triggered reveals; SVG marks animate fill 0.5s ease. No parallax, no autoplaying motion, no layout shifts.

## Layout

Single 1140px centered container with 20px side padding; prose and forms constrain to a 720px measure. The subscribe block is fully center-aligned; below it the page alternates full-width media and two-column splits (image left, text right) with a 3.8% gutter. Vertical rhythm is set by 18px/27px serif text and 20-30px margins, with hairline rules marking section boundaries rather than boxes.

## Imagery

Documentary photography dominates: books on wood, Japanese landscapes, walking scenes, full-bleed and warm-toned against the dark field, corners at 8px radius with the single soft shadow. Vector laurel award marks in white line art provide the only illustration. No icons beyond a small Instagram glyph; no stock imagery, no gradients or overlays.

## Do and don't

### Do
- Keep #222222 as the page field and reserve #000000 for full-bleed media blocks.
- Set all running prose in ff-meta-serif-web-pro-1 at 18px/27px, never in the sans.
- Use ff-meta-web-pro-1 uppercase 13px bold with 1px tracking for every navigation item.
- Allow only one Signal Blue button per view; make all other actions blue pills or text links.
- Separate sections with 1px #555555 rules and 60-80px gaps instead of cards or borders.
- Demote secondary copy to #666666 at the same size rather than shrinking type.
- Center the subscribe block and keep reading columns within 720px.

### Don't
- Don't introduce a third typeface or a weight above 700.
- Don't push headings past 32px or add letter-spacing to them.
- Don't apply shadows to buttons, inputs or text blocks; only media gets the 0 10px 26px veil.
- Don't use pure #ffffff for body text — Soft Paper #dddddd is the reading ink.
- Don't add colored badges, gradients or secondary accent hues beyond the two blues.
- Don't animate anything but color, background-color and small transforms.
- Don't round media corners beyond 8px or make anything fully pill-shaped except the avatar.

## Similar brands

- **Kottke.org** — Long-running personal writing site with hairline-ruled index navigation and serif prose over a minimal shell.
- **Frank Chimero** — Writer-designer homepage where a single serif measure and rationed accent color carry all hierarchy.
- **Robin Sloan** — Newsletter-first author page: centered subscribe block, plain type, no decorative chrome.
- **Stratechery** — Subscription-driven editorial layout using one sans for structure and one serif for reading at 18px.
- **Ghost (dark theme)** — Dark #222-class background, white input with blue CTA, generous 700px reading measure.

## Agent prompt

Build a dark, bookish personal site: background #222222, text #dddddd, secondary #666666, hairline rules #555555, full-bleed media blocks on #000000. Two typefaces only — FF Meta Web Pro (sans, fallback -apple-system) for navigation, headings 26-32px at weight 500/700, and buttons; FF Meta Serif Web Pro (fallback Georgia) for all prose at 18px/27px. Navigation is 13px uppercase bold, 1px tracking, in stacked columns above a 1px rule. Container 1140px, reading measure 720px, 5px spacing base. One CTA in #2969ff with 6px radius and white label; secondary links as #007afc at 75% pills; email input white with 2px #efefef border, 5px radius. Media at 8px radius with 0 10px 26px rgba(0,0,0,.28). Transitions: color 0.2s ease only.
