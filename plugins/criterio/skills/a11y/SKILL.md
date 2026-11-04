---
name: a11y
description: The whole system: keyboard, focus, contrast and reduced motion. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.
metadata:
  source: criterio.design
  area: all
---

# Accessibility

How to build the whole system so that it works with a keyboard, a screen reader, at any size and with reduced motion.

## Read the project first

`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.
2. Read every area: this skill crosses them all, and each one's decision and **Never** list bound what you write.
3. If the file has a section titled **Build it: so that everyone can use it**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.
4. If an area is still open, or there is no file, use the defaults below and say so in what you deliver.

## The craft

- HTML that means what it is: one `h1`, headings in order, `header`, `nav`, `main` and `footer`, a `button` for what does something and an `a` for what goes somewhere.
- Everything can be reached and used with the keyboard, in the order it is read. Focus is always visible: `:focus-visible` with a 2px ring in the accent, 2px away from the element.
- A dialog keeps the focus inside while it is open and gives it back to what opened it; Esc closes it.
- Contrast as the Colour area needs it: text at 4.5:1, large text and the edges of controls at 3:1. In both themes.
- What can be pressed measures 44 by 44px or more, with 8px between one and the next.
- With `prefers-reduced-motion`, nothing travels or scales; nothing flashes more than three times a second; anything that plays on its own can be paused.
- Every field has a `<label>`; its error is tied to it with `aria-describedby` and announced; the form never loses what was typed.
- Text grows to 200% and the page holds at 320px wide without sideways scroll. No text inside images. The page declares its `lang`.
- Before it ships: a pass with only the keyboard, a pass with a screen reader (VoiceOver or NVDA), and axe or Lighthouse without a critical issue.
