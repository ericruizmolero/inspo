---
name: images
description: Imagery: formats, sizes, crops and one treatment. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.
metadata:
  source: criterio.design
  area: imagery
---

# Responsive images

How to put the Imagery area on a website: formats, sizes, crops and one treatment.

## Read the project first

`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.
2. Read its **Imagery** area: the decision, the references it kept and its **Never** list. The area rules: where it and this skill disagree, the area wins.
3. If the file has a section titled **Build it: images that load well**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.
4. If the Imagery area is still open, or there is no file, use the defaults below and say so in what you deliver.

## Defaults, while the area names no numbers

- Ratios by use: 16:9 or 3:2 for a hero, 4:3 for cards, 4:5 for portraits.
- One grade for the whole set: the same contrast, the same warmth.
- The subject is never cropped at a joint or at the eyes.

## The craft

Never ship the original. Export each image at 640, 960, 1280, 1920 and 2560px wide, in AVIF (quality 55 to 65) with WebP behind it, or let the framework do it (`next/image`, an image CDN).

- Every image has `width` and `height` (or `aspect-ratio`), so the page does not jump when it arrives.
- `sizes` says how wide it really is on screen (`sizes="(min-width: 64rem) 50vw, 100vw"`); without it the browser downloads the largest.
- The first image in view: `fetchpriority="high"` and not lazy. Everything below: `loading="lazy"` and `decoding="async"`.
- `object-fit: cover` with `object-position` on the subject, so a crop never cuts a face.
- On a phone, a different crop (`<picture>` with `media`), not the wide shot made small.
- `alt` says what matters in the picture for someone who cannot see it; a picture that only decorates has `alt=""`.
- A placeholder while it loads: the image's own dominant colour or a blur of it, never a grey box or a spinner.
- Text over a photo sits on a wash that guarantees its contrast, and is never part of the image file.
- Video is muted, `playsinline`, with a `poster` and a way to pause; it does not start with reduced motion.
