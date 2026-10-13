---
name: iso-figure
description: Imagery: an object as an interactive isometric line drawing in SVG. Reads the project's criterio.md first and builds that area with its numbers; use when building or styling a web interface for a project that has one.
metadata:
  source: criterio.design
  area: imagery
---

# Isometric figure

How to draw an object of the project as an isometric hairline figure in one HTML file, with parts that work when pressed (after MrBongoC's iso-figure skill).

## Read the project first

`criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

1. Look for `criterio.md` in the project (the root, or `docs/`). If there is none, ask for it before writing anything.
2. Read its **Imagery** area: the decision, the references it kept and its **Never** list. The area rules: where it and this skill disagree, the area wins.
3. If the file has a section titled **Build it: an interactive isometric figure**, the team switched this skill on in criterio.design: it holds this same craft with the project's own numbers. Follow it to the letter and skip the defaults below.
4. If the Imagery area is still open, or there is no file, use the defaults below and say so in what you deliver.

## Defaults, while the area names no numbers

- Two greys for the lines (structure and detail) and one `--live` colour for whatever is on: the lit screen, the pressed key.
- A dark and a light set of custom properties; the drawing works in both.
- Radii of 2 to 14 units on the boxes.

## The craft

Plain SVG, no libraries: about 15 lines of projection turn each face of a box into an SVG `matrix()`, so flat rects, text and paths land on the right plane. Copy this kernel as it is, then build the scene:

```js
const C = Math.cos(Math.PI/6), S = Math.sin(Math.PI/6), OX = 465, OY = 300;
const P = (x,y,z) => [(x-y)*C + OX, (x+y)*S - z + OY];
const D = (x,y,z) => [(x-y)*C, (x+y)*S - z];
const plane = (O,U,V) => { const o=P(...O), u=D(...U), v=D(...V);
  return `matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${o[0]} ${o[1]})`; };
const TOP   = (x,y,z) => plane([x,y,z],[1,0,0],[0,1,0]);
const FRONT = (x,y,z) => plane([x,y,z],[1,0,0],[0,0,-1]);
const SIDE  = (x,y,z) => plane([x,y,z],[0,-1,0],[0,0,-1]);
const rect = (t,w,h,r=0,cls='face') =>
  `<g transform="${t}"><rect class="${cls}" width="${w}" height="${h}" rx="${r}"/></g>`;
const box = (x,y,z,w,d,h,r=0) =>
  rect(SIDE(x+w,y+d,z+h), d,h,Math.min(r,h/4)) +
  rect(FRONT(x,y+d,z+h), w,h,Math.min(r,h/4)) +
  rect(TOP(x,y,z+h), w,d,r,'face top');
```

- Name the output first: what pressing a part produces (typed text, a number, a note, a light). A figure you can only watch is decoration; pick another object.
- Axes: +x runs down-right, +y down-left, +z up. The front of the object (screen, display) goes on a FRONT face; what the hand reaches for (keys, buttons) sits at larger `y`.
- Break the object into 3 to 8 boxes and write their `(x, y, z, w, d, h)` as a table before drawing. Detail (vents, bezels, labels) is drawn flat inside a group with the face's transform, never as hand-typed skewed polygons.
- Paint back to front, the only depth sorting: smaller `x + y` first, lower `z` first; grids row by row with growing `y`. Faces need an opaque fill.
- Every line `vector-effect: non-scaling-stroke` at 1px, or the matrix skews the hairline. Texture comes from repetition (slits, key grids, ribs), never from shading, gradients or shadows.
- Each pressable part is its own `<g class="press">` with its box and its label. Pressed: `translateY(4px)` in about 60ms and its stroke goes to `--live`; nothing moves with `prefers-reduced-motion`.
- One `state` object and one `render()`; pointer and keyboard call the same functions. Typed text shows only its tail, clipped to the glass, with `&` and `<` escaped.
- Frame it by numbers: project the extreme corners with `P` and set `OX`, `OY` and the `viewBox` for 8 to 15% of margin on every side.
- The plate: four monospace captions at the corners, `Fig N`, the object's name, the instruction and a live readout in lowercase (`on · 9 chars · key t`) that changes on every press.
- On the object, the project's own mark or an invented glyph, never another company's logo or a real product's silhouette.
- One file that runs from disk: no external scripts. The svg has `role="img"`, `tabindex="0"` and an `aria-label` saying what it is and how to use it.
