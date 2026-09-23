# 21st — DESIGN.md
> electric blue after dark

**Theme:** dark  
**Source:** https://21st.dev/ · 2026-09-23

Source measurements are normalised; roles and recommendations are interpreted.

21st presents a vast component library without making the interface itself feel busy. A near-black #09090b canvas opens into a broad, soft blue glow behind the first gallery row, giving the previews room to supply most of the visual variety. The hero is left-aligned and unusually spare: a 64px General Sans headline, with only “living” switching to blue Averia Serif Libre, sits above a short muted introduction. Navigation, category links, and gallery labels stay small and restrained, generally at General Sans weight 500. Bright blue is reserved for the sign-up action and the hero’s single expressive word; coral #c86a50 and warm ivory #f6f6f1 appear in later product demonstrations rather than governing the page. Large, edge-to-edge previews create a browsing rhythm, while thin borders, quiet shadows, and compact pill controls keep the surrounding chrome secondary to the work on display.

## Colors

| Name | Value | Group | Role |
|------|-------|-------|------|
| Midnight | `#09090b` | neutral | The principal near-black page background and dark gallery canvas. |
| Charcoal | `#0e0f10` | neutral | A subtly lifted dark surface used within component previews. |
| Hairline | `#27272a99` | neutral | A translucent divider for quiet outlines on dark surfaces. |
| Slate Mist | `#a1a1aa` | neutral | Secondary copy, navigation, and inactive controls. |
| Soft White | `#f4f4f5` | neutral | Primary text and large headings without the glare of pure white. |
| Electric Blue | `#1646ee` | brand | The saturated sign-up action and selective headline emphasis; the hex is an approximation of the measured OKLCH accent. |
| Gallery Blue | `#4b73ff` | accent | A brighter blue used in the expansive ambient glow and visual demonstrations. |
| Clay Coral | `#c86a50` | accent | A substantial warm surface in later product demonstrations, not general interface chrome. |
| Warm Ivory | `#f6f6f1` | accent | A contrasting light demonstration surface within the otherwise dark experience. |

## Typography

### General Sans — body
General Sans carries nearly all headings, copy, labels, and navigation. Weight 500 does most of the work; hierarchy comes from scale and contrast rather than frequent bold text.
- **Fallback:** system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
- **Weights:** 400, 500, 600
- **Sizes:** 11–64px · approximately 11 values
- **Line height:** 1.06 for the hero; approximately 1.5 for copy and controls
- **Letter spacing:** Normal for most text; −1.4px on the 64px hero

### Averia Serif Libre — display
The serif appears sparingly as an expressive word inside the otherwise sans-serif hero. Keeping it blue and isolated makes the typographic contrast feel intentional rather than decorative throughout.
- **Fallback:** Georgia, Times New Roman, serif
- **Weights:** 400
- **Sizes:** 40–64px · responsive hero emphasis
- **Line height:** Approximately 1.06
- **Letter spacing:** Slightly tight

### ui-monospace — mono
Monospace is reserved for commands, file paths, and terminal-like product demonstrations. It does not replace General Sans in ordinary navigation or descriptive text.
- **Fallback:** SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, monospace
- **Weights:** 500
- **Sizes:** 12–13px · 2 values
- **Line height:** Approximately 2.1 in terminal demonstrations
- **Letter spacing:** Normal

### Type scale

| Role | Family | Weight | Size | Line height | Letter spacing |
|------|--------|--------|------|-------------|----------------|
| caption | General Sans | 500 | 11px | 1.5 | normal |
| body-sm | General Sans | 500 | 13px | 1.5 | normal |
| body | General Sans | 500 | 16px | 1.5 | normal |
| subtitle | General Sans | 500 | 17px | 1.5 | −0.2px |
| title-sm | General Sans | 500 | 36px | 1.15 | −1px |
| title | General Sans | 500 | 44px | 1.1 | −1px |
| display | General Sans | 500 | 64px | 1.06 | −1.4px |

## Spacing and layout

**Density:** comfortable

- **Base unit:** 4px
- **Max page width:** 1152px for contained content; galleries may extend beyond it
- **Section gap:** 64px
- **Card padding:** 12–20px for supporting UI; image previews are unpadded
- **Element gap:** 8–24px

### Border radii

- **Small navigation and compact controls:** 6px
- **Standard contained surfaces:** 8px
- **Demonstration panels:** 12px
- **Pill buttons:** 9999px
- **Gallery preview images:** 0px

## Elevation

Depth comes chiefly from surface contrast, the blue ambient glow, and image content. Gallery previews use a restrained inset 0 0 0 1px #0000000a and 0 1px 3px #00000012; avoid prominent floating-card shadows in the core interface.

## Components

### Header
**Role:** Provides brand identification, library navigation, and account actions.

Keep the logo left, body-sm navigation centered, and account actions right; use Slate Mist links against Midnight with generous horizontal separation.

### Primary button
**Role:** Marks account creation and principal browsing actions.

Electric Blue fill, white text, pill radius, and no visible border; use 28px height with 16px horizontal padding in the header or 44px height with 24px padding for larger actions.

### Secondary button
**Role:** Offers quieter account or alternate actions.

Use a transparent Midnight-aligned surface with Slate Mist text for low-emphasis actions; the larger outlined variant is 44px high with a Hairline border, Soft White text, and 24px horizontal padding.

### Link
**Role:** Enables navigation between library areas and categories.

Use body-sm Slate Mist text and a transparent background; navigation links have 4px by 8px padding and a small radius. Give the selected category a subtle lighter surface rather than a bright underline.

### Card
**Role:** Makes each component preview a browsable destination.

Let the preview fill its frame without inner padding or rounded image corners; apply the restrained gallery shadow and place compact supporting labels outside the image. Hover may gently scale the preview without lifting it into a heavy floating tile.

## Motion

Use brief color changes around 150ms, background and opacity changes around 200ms, and preview transforms around 300ms. The page includes scroll animation and animated examples, but navigation and text should remain calm; do not animate every surface.

## Layout

Center primary copy and navigation within a roughly 1152px container, then allow the gallery to run wider than that container and crop at the viewport edges. Keep the hero left-aligned with ample space above and below it. Follow it with a compact horizontal category row and a wide, evenly spaced sequence of preview tiles.

## Imagery

The library previews are the imagery: large, varied screenshots or live interface demonstrations rather than stock photography. Their individual colors and styles can be vivid, while the surrounding site stays dark and restrained. A diffuse blue field connects the opening previews without tinting their contents.

## Do and don't

### Do
- Keep the main canvas near-black and let preview content provide most of the color.
- Set the main hero in 64px General Sans at weight 500 with tight tracking.
- Use blue Averia Serif Libre for one short expressive hero word.
- Keep navigation and gallery metadata small, muted, and consistently medium-weight.
- Let gallery previews extend beyond the contained text width on desktop.
- Use pill-shaped calls to action but leave preview images square.

### Don't
- Do not turn the gallery into uniformly padded, rounded dashboard cards.
- Do not use coral, ivory, orange, or pink as global navigation colors.
- Do not set long paragraphs or all headings in the serif face.
- Do not make every link Electric Blue; reserve it for conspicuous emphasis.
- Do not add large drop shadows or thick borders around every preview.
- Do not replace the open, left-aligned hero with a centered marketing stack.

## Similar brands

- **Vercel** — Restrained dark product chrome and high-contrast typography leave room for showcased work.
- **Linear** — Uses compact, carefully muted interface details against a dark atmospheric backdrop.
- **Framer** — Treats varied live website examples as the visual center of a browsing experience.

## Agent prompt

Build a dark 21st-style component-library interface on a near-black Midnight canvas. Use General Sans at mostly weight 500, with small muted navigation and a large, tightly tracked, left-aligned headline. Switch just one hero word to blue Averia Serif Libre. Add a broad, soft blue glow behind an expansive gallery of square-edged, edge-to-edge interface previews that extends beyond the text container. Keep controls compact, use blue pill-shaped primary actions, and avoid heavy card frames. Let the previews carry diverse colors while the surrounding interface stays quiet.
