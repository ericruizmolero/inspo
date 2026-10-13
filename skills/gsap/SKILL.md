---
name: gsap
description: Smooth micro-animations, with the curves and durations of the Motion area. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.
metadata:
  source: criterio.design
  area: motion
---

# GSAP

How to build the Motion area with GSAP.

## Read the project first

`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.
2. Read its **Motion** area: the decision, the references it kept and its **Never** list. The area rules: where it and this skill disagree, the area wins.
3. If the file has a section titled **Build it: motion with GSAP**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.
4. If the Motion area is still open, or there is no file, use the defaults below and say so in what you deliver.

## Defaults, while the area names no numbers

- Hover, focus, press: 0.15 to 0.25 s, `power2.out`. A press is `scale: 0.97` and back.
- Things entering: 0.4 to 0.6 s, `power3.out`, from `y: 16` and `autoAlpha: 0`.
- Things leaving: shorter than they entered, `power2.in`.
- Lists: `stagger: 0.04` to `0.08`. More than 12 items: batch them.
- Nothing overshoots unless the area asks for it.

## The craft

`npm i gsap` (and `@gsap/react` in React). Every plugin is free since 2025: register what you use with `gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, Flip)`. An agent that takes skills can also install GreenSock's own: `npx skills add https://github.com/greensock/gsap-skills`.

- Animate `x`, `y`, `scale`, `rotation` and `autoAlpha`, never `top`, `left`, `width`, `height` or `box-shadow`: transforms do not move the layout. `autoAlpha` also hides what reaches 0, so it stops taking clicks.
- Sequence with `gsap.timeline()` and the position parameter (`"<"`, `"-=0.2"`, labels), not with chained `delay`s.
- Wrap everything in `gsap.matchMedia()`: one branch for `(prefers-reduced-motion: no-preference)`, and with reduced motion only opacity, short, or nothing.
- Micro-animations: absolute values on enter and leave (`y: -2`, then `y: 0`), never relative ones (`"-=2"`) that pile up. `overwrite: "auto"` so a quick in and out does not fight itself. Anything that follows the pointer goes through `gsap.quickTo()`.
- Start states belong to GSAP: use `gsap.from()` or `gsap.set()`, not `opacity: 0` in the CSS, and never `clearProps: "all"` over an element the CSS hides.
- Scroll reveals: `ScrollTrigger` with `once: true`; long lists with `ScrollTrigger.batch()`. `scrub` only where the scroll tells a story.
- Anything that loops pauses off screen (a `ScrollTrigger` with `toggleActions: "play pause resume pause"`).
- Layout changes (filter, sort, expand) with `Flip`: `Flip.getState()`, change the DOM, `Flip.from()`.
- Text with `SplitText`: `type: "lines"` or `"words"`, `tag: "span"`, `mask: "lines"` for reveals, `autoSplit: true` so it splits again once the fonts load.
- Toggles (expand, open, close): one paused timeline and `tl.reversed() ? tl.play() : tl.reverse()`.
- React: `useGSAP(() => {…}, { scope: ref, dependencies })` instead of `useEffect`, and event handlers inside `contextSafe`. It cleans up on unmount.
- Elsewhere: create inside `gsap.context()` and call `ctx.revert()` on teardown. Kill every ScrollTrigger you made.
