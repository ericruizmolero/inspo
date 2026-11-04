---
name: transitions
description: Motion without a library: CSS, view transitions and scroll. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.
metadata:
  source: criterio.design
  area: motion
---

# Native transitions

How to build the Motion area with what the browser already has: CSS transitions, `@starting-style`, view transitions and scroll timelines.

## Read the project first

`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.
2. Read its **Motion** area: the decision, the references it kept and its **Never** list. The area rules: where it and this skill disagree, the area wins.
3. If the file has a section titled **Build it: motion without a library**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.
4. If the Motion area is still open, or there is no file, use the defaults below and say so in what you deliver.

## Defaults, while the area names no numbers

- Feedback (hover, focus, press): 150 to 250ms. Things entering: 300 to 500ms. Leaving: shorter than entering.
- One curve for entering (`cubic-bezier(0.23, 1, 0.32, 1)`) and one for moving across (`cubic-bezier(0.65, 0, 0.35, 1)`).
- A press is `scale: 0.97` and back.

## The craft

Nothing to install. Put each curve and duration the area gives in a token named for its job, not for the curve type (`--ease-fall`, `--ease-reveal`, `--dur-fast`), and use only those. If the area names a GSAP ease, write its cubic-bezier equivalent.

- Move with `translate`, `scale`, `rotate` and `opacity` only. Never transition `width`, `height`, `top`, `left` or a large `box-shadow`.
- Something that appears: `@starting-style { opacity: 0; translate: 0 8px; }` and a transition. From `display: none`, add `transition-behavior: allow-discrete`.
- A change of page or of state: `document.startViewTransition(() => update())`, with `view-transition-name` on what should travel between the two. Without support the change simply happens.
- Reveals on scroll without JavaScript: `animation-timeline: view(); animation-range: entry 0% cover 30%;` inside `@supports (animation-timeline: view())`. Once, not on every pass.
- `@media (prefers-reduced-motion: reduce)`: no travel and no scale, only a short fade, or nothing.
- Hover effects inside `@media (hover: hover)`, so a touch screen does not keep them stuck.
- Menus, dialogs and popovers with `<dialog>` and `popover`: the browser handles focus and the top layer, and `::backdrop` fades like anything else.
- Loops stop when they are off screen or the tab is hidden (`animation-play-state`), and nothing moves on its own for more than five seconds without a way to stop it.
