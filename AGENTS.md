<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

# Design system: read it, and write down what gets decided

The team's design system lives in `docs/design-system/` (shown at `/library`). Before designing UI or writing CSS, read `docs/design-system/principios.md` and `fundamentos.md`; before creating a component, check `componentes.md`. When the team approves, rejects or corrects a design or development choice, record it with the `registrar-decision` skill in the same piece of work.

Keep it current with everything we build, not only with decisions: any work that changes the interface, a token, a component, a pattern, a route, a shortcut or how we build ends with its page of `docs/design-system/` updated in that same work (`componentes.md`, `patrones.md`, `fundamentos.md`, `desarrollo.md`, `mapa.md`, `atajos.md`), without waiting to be asked. Before calling a task done, check your diff against the design system.
