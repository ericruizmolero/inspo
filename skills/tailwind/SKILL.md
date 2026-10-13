---
name: tailwind
description: The whole system as a Tailwind 4 theme. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.
metadata:
  source: criterio.design
  area: all
---

# Tailwind

How to carry the system into Tailwind CSS, so that every utility comes out of what the team decided.

## Read the project first

`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.
2. Read every area: this skill crosses them all, and each one's decision and **Never** list bound what you write.
3. If the file has a section titled **Build it: the system as a Tailwind theme**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.
4. If an area is still open, or there is no file, use the defaults below and say so in what you deliver.

## The craft

Tailwind 4 keeps its tokens in CSS: `@import "tailwindcss";` and an `@theme { … }` block. Every variable there becomes a utility (`--color-surface` gives `bg-surface`, `--font-display` gives `font-display`).

- Tokens are named for what they are for (`--color-accent`, `--color-surface`), not for how they look (`--color-red`).
- The areas' numbers go in the theme: families in `--font-*`, colours in `--color-*`, radii in `--radius-*`, the Motion curves in `--ease-*`, the spacing base in `--spacing`.
- No arbitrary values in components (`text-[17px]`, `bg-[#1a1a1a]`, `rounded-[13px]`): if one is needed, a token is missing and it goes in the theme.
- Dark and light by redefining the tokens under a selector (`[data-theme="dark"]`), not by writing `dark:` on every element.
- What repeats becomes a component, not a pile of `@apply`. Variants with data attributes or a small helper (`cva`), merged with `tailwind-merge`.
- Components adapt to their room with container queries (`@container`, `@md:`); the page, with the breakpoints.
- Motion utilities use the theme's curves and durations, and every one has its `motion-reduce:` side.
- The Prettier plugin orders the classes, so two people write the same line the same way.
