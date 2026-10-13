# Criterio skills

The skills of criterio.md as agent skills, for Claude Code, Cursor, Codex and any agent that reads `SKILL.md`. `criterio.md` is the design system file that [criterio.design](https://criterio.design) writes from a team's references: eight areas (typography, colour, layout, motion, iconography, logo, imagery, voice and tone), each with what the team decided, the references that back it and a list of what it never does.

Each skill builds one part of that system with a given tool: it reads the project's `criterio.md` first and then applies the craft with the project's numbers. Switched on in criterio.design, the same skill travels inside the file as a section, with nothing to install.

## Install

```sh
npx skills add https://github.com/ericruizmolero/inspo --skill <name>
```

## Skills

| Skill | What it builds | Install |
| --- | --- | --- |
| [Web fonts](fonts/SKILL.md) | Typography: loading the families decided, and a fluid scale | `npx skills add https://github.com/ericruizmolero/inspo --skill fonts` |
| [Colour tokens](color-tokens/SKILL.md) | Colour: the palette as variables, light and dark, and contrast | `npx skills add https://github.com/ericruizmolero/inspo --skill color-tokens` |
| [CSS grid](grid/SKILL.md) | Layout: grid, container queries, and spacing and radii as tokens | `npx skills add https://github.com/ericruizmolero/inspo --skill grid` |
| [GSAP](gsap/SKILL.md) | Smooth micro-animations, with the curves and durations of the Motion area | `npx skills add https://github.com/ericruizmolero/inspo --skill gsap` |
| [Native transitions](transitions/SKILL.md) | Motion without a library: CSS, view transitions and scroll | `npx skills add https://github.com/ericruizmolero/inspo --skill transitions` |
| [Icon set](icons/SKILL.md) | Iconography: one library, one stroke, and how to draw the missing ones | `npx skills add https://github.com/ericruizmolero/inspo --skill icons` |
| [Logo as SVG](logo-svg/SKILL.md) | Logo: versions, clear space, favicon and share image | `npx skills add https://github.com/ericruizmolero/inspo --skill logo-svg` |
| [Responsive images](images/SKILL.md) | Imagery: formats, sizes, crops and one treatment | `npx skills add https://github.com/ericruizmolero/inspo --skill images` |
| [Isometric figure](iso-figure/SKILL.md) | Imagery: an object as an interactive isometric line drawing in SVG | `npx skills add https://github.com/ericruizmolero/inspo --skill iso-figure` |
| [Microcopy](microcopy/SKILL.md) | Voice: buttons, errors, empty screens, forms and metadata | `npx skills add https://github.com/ericruizmolero/inspo --skill microcopy` |
| [Avoid AI slop](no-ai-slop/SKILL.md) | Voice: writing without the patterns of generated text (no-ai-slop, by Peter Yang) | `npx skills add https://github.com/ericruizmolero/inspo --skill no-ai-slop` |
| [Accessibility](a11y/SKILL.md) | The whole system: keyboard, focus, contrast and reduced motion | `npx skills add https://github.com/ericruizmolero/inspo --skill a11y` |
| [Tailwind](tailwind/SKILL.md) | The whole system as a Tailwind 4 theme | `npx skills add https://github.com/ericruizmolero/inspo --skill tailwind` |
| [Bring in a brand](bring-brand/SKILL.md) | Reads a site or a repo and fills the project's presentation through the criterio MCP | `npx skills add https://github.com/ericruizmolero/inspo --skill bring-brand` |

The thirteen are written by `scripts/build-skills.ts` from the same text criterio.md carries (`lib/md-skills.ts`): edit it there and run `npm run skills:build`. The connector's are written by hand in their folder.
