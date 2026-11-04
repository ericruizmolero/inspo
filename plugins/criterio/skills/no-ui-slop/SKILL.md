---
name: no-ui-slop
description: The whole system: the habits that make an interface read as generated, as rules with an id. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.
metadata:
  source: criterio.design
  area: all
---

# Avoid UI slop

How to build every screen of the project without the habits that make an interface read as generated. Each rule has an id, a strength (MUST, NEVER, SHOULD) and the reason; cite the id when you keep or break one.

## Read the project first

`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.
2. Read every area: this skill crosses them all, and each one's decision and **Never** list bound what you write.
3. If the file has a section titled **Build it: avoiding UI slop**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.
4. If an area is still open, or there is no file, use the defaults below and say so in what you deliver.

## The craft

Adapted from the anti-slop rules of design.how's Glaze system, with the project's own never lists above. Where a rule and an area disagree, the area wins.

- `ui-earn-the-card` MUST: group with spacing first; a card only around one thing a person acts on, and never a card inside a card. Because every box asks to be read as a separate thing.
- `ui-no-stat-cards` NEVER: a row of equal cards that each hold one number. Because equal boxes make every number equally loud. Correct: one sentence stating the figures, or a table. Wrong: three labelled tiles.
- `ui-no-icon-tiles` NEVER: an icon in a tinted tile or circle beside a heading. Because the tile adds nothing and looks like a button.
- `ui-no-side-rail` NEVER: a coloured bar on one edge of a card, row or message. Because the bar implies a status nobody defined.
- `ui-no-status-dots` NEVER: a small round dot alone for status, unread counts or series. Because a dot relies on hue only. Correct: a glyph and a word.
- `ui-no-eyebrow` NEVER: a small label, category or number above a title. Because the heading already names the section.
- `ui-no-caps` NEVER: capitals or letter-spacing on text, unless the Typography area asks for it. Because capitals are slower to read and louder than the page needs.
- `ui-no-decoration` NEVER: gradients, blobs, glows, dot or grid backgrounds and backdrop blur, unless an area decides them. Because decoration competes with the one action of the screen.
- `ui-no-shadow-reflex` NEVER: a shadow to make a card or menu stand out. Because depth is better drawn with spacing, a line or a tone from the palette.
- `ui-one-primary` MUST: at most one primary action in a card, footer, dialog or row of actions; the rest are quiet. Because two loud buttons side by side split the eye. Correct: `Not now` quiet, `Join` primary.
- `ui-no-mono-cosplay` NEVER: monospace for labels, headings or numbers; only for values a person copies, such as ids and code. Because mono as a costume reads as a template.
- `ui-no-emoji` NEVER: emoji in copy, titles, buttons or as icons. Because they render differently on every device and make a tool read as a chat.
- `ui-no-fake-data` SHOULD: believable sample data. No lorem ipsum, no `John Doe`, no round filler numbers. Because they hide truncation and alignment problems.
- `ui-no-scroll-reveal` NEVER: content that fades or slides in as it scrolls into view, unless the Motion area decides it. Because what stays hidden until scrolled can be missed and costs reading time.
- `ui-no-stream-effects` NEVER: blinking cursors, shimmer sweeps or per-word fades on streamed answers. Because they slow reading and make the layout jitter.
- `ui-actions-name-the-object` MUST: a verb and its object on every action, in sentence case. Correct: `Run eval`. Wrong: `OK`, `Submit`.
- When a need is not covered by this file, an area or these rules: stop and say so. Never invent a token, a colour, a component or a pattern to fill the gap.
